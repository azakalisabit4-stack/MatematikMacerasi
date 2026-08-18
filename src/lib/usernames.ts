import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { adminActions, bannedWords, reservedUsernames, users } from "@/lib/db/schema";
import { ApiError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import {
  SYSTEM_RESERVED,
  containsBannedWord,
  normalizeForFilter,
  trLower,
  validateUsernameShape,
} from "@/lib/moderation";
import { notify } from "@/lib/notifications";
import { NOTIFICATION_TYPE } from "@/lib/constants";

function bannedNormalizedList(): string[] {
  return db
    .select({ normalized: bannedWords.normalized })
    .from(bannedWords)
    .all()
    .map((r) => r.normalized);
}

export interface UsernameOk {
  username: string;
  usernameLower: string;
  normalized: string;
}

/**
 * Kullanıcı adını doğrular.
 * Öğrenciye hangi kelimenin yasaklı olduğu ASLA söylenmez — yalnızca
 * "Bu kullanıcı adı uygun değil." mesajı döner.
 */
export function assertUsernameUsable(raw: string, ignoreUserId?: string): UsernameOk {
  const shape = validateUsernameShape(raw);
  if (!shape.ok) throw new ApiError(shape.reason, 422);

  const { username, usernameLower, normalized } = shape;

  if (SYSTEM_RESERVED.includes(normalized) || SYSTEM_RESERVED.includes(usernameLower)) {
    throw new ApiError("Bu kullanıcı adı uygun değil.", 422);
  }

  if (containsBannedWord(normalized, bannedNormalizedList())) {
    throw new ApiError("Bu kullanıcı adı uygun değil.", 422);
  }

  const reserved = db
    .select()
    .from(reservedUsernames)
    .where(eq(reservedUsernames.usernameLower, usernameLower))
    .limit(1)
    .all()[0];
  if (reserved) throw new ApiError("Bu kullanıcı adı kullanılamaz.", 409);

  const taken = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.usernameLower, usernameLower))
    .limit(1)
    .all()[0];
  if (taken && taken.id !== ignoreUserId)
    throw new ApiError("Bu kullanıcı adı zaten alınmış.", 409);

  return { username, usernameLower, normalized };
}

/**
 * Hocaefendi bir öğrencinin kullanıcı adını değiştirir.
 * ESKİ ad sistem tarafından rezerve edilir; kimse (öğrencinin kendisi dahil)
 * tekrar alamaz.
 */
export function adminRenameUser(adminId: string, targetUserId: string, newUsername: string) {
  const target = db.select().from(users).where(eq(users.id, targetUserId)).limit(1).all()[0];
  if (!target) throw new ApiError("Öğrenci bulunamadı.", 404);

  const next = assertUsernameUsable(newUsername, targetUserId);
  const oldUsername = target.username;
  const oldLower = target.usernameLower;

  db.transaction((tx) => {
    tx.update(users)
      .set({ username: next.username, usernameLower: next.usernameLower, updatedAt: new Date() })
      .where(eq(users.id, targetUserId))
      .run();

    if (oldLower !== next.usernameLower) {
      tx.insert(reservedUsernames)
        .values({
          id: createId("res_"),
          usernameLower: oldLower,
          normalized: normalizeForFilter(oldUsername),
          reason: "MODERATION",
        })
        .onConflictDoNothing()
        .run();
    }

    tx.insert(adminActions)
      .values({
        id: createId("act_"),
        adminId,
        targetUserId,
        action: "RENAME_USER",
        detail: `${oldUsername} → ${next.username}`,
      })
      .run();
  });

  notify({
    userId: targetUserId,
    type: NOTIFICATION_TYPE.ADMIN,
    title: "Kullanıcı adın güncellendi",
    body: `Kullanıcı adın "${next.username}" olarak değiştirildi.`,
    iconKey: "user-cog",
    link: "/profil",
    meta: { oldUsername, newUsername: next.username },
  });

  return { username: next.username };
}

/** Öğrencinin kendi kullanıcı adını değiştirmesi (moderasyon kurallarına tabidir). */
export function selfRename(userId: string, newUsername: string) {
  const me = db.select().from(users).where(eq(users.id, userId)).limit(1).all()[0];
  if (!me) throw new ApiError("Kullanıcı bulunamadı.", 404);
  const next = assertUsernameUsable(newUsername, userId);
  db.update(users)
    .set({ username: next.username, usernameLower: next.usernameLower, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .run();
  return { username: next.username };
}

/* ------------------------------------------------------- YASAKLI KELİMELER */

export function listBannedWords() {
  return db.select().from(bannedWords).all();
}

export function addBannedWord(adminId: string, word: string) {
  const clean = word.trim();
  if (clean.length < 2) throw new ApiError("Kelime en az 2 karakter olmalı.", 422);
  const normalized = normalizeForFilter(clean);
  if (!normalized) throw new ApiError("Bu kelime kaydedilemez.", 422);

  db.insert(bannedWords)
    .values({ id: createId("bw_"), word: clean, normalized, createdById: adminId })
    .onConflictDoUpdate({ target: bannedWords.normalized, set: { word: clean } })
    .run();

  db.insert(adminActions)
    .values({ id: createId("act_"), adminId, action: "ADD_BANNED_WORD", detail: clean })
    .run();

  return { ok: true };
}

export function updateBannedWord(adminId: string, id: string, word: string) {
  const clean = word.trim();
  if (clean.length < 2) throw new ApiError("Kelime en az 2 karakter olmalı.", 422);
  const normalized = normalizeForFilter(clean);
  db.update(bannedWords).set({ word: clean, normalized }).where(eq(bannedWords.id, id)).run();
  db.insert(adminActions)
    .values({ id: createId("act_"), adminId, action: "UPDATE_BANNED_WORD", detail: clean })
    .run();
  return { ok: true };
}

export function removeBannedWord(adminId: string, id: string) {
  const row = db.select().from(bannedWords).where(eq(bannedWords.id, id)).limit(1).all()[0];
  db.delete(bannedWords).where(eq(bannedWords.id, id)).run();
  db.insert(adminActions)
    .values({ id: createId("act_"), adminId, action: "REMOVE_BANNED_WORD", detail: row?.word ?? id })
    .run();
  return { ok: true };
}

/* ------------------------------------------------- REZERVE KULLANICI ADLARI */

export function listReservedUsernames() {
  return db.select().from(reservedUsernames).all();
}

export function releaseReservedUsername(adminId: string, id: string) {
  const row = db.select().from(reservedUsernames).where(eq(reservedUsernames.id, id)).limit(1).all()[0];
  db.delete(reservedUsernames).where(eq(reservedUsernames.id, id)).run();
  db.insert(adminActions)
    .values({
      id: createId("act_"),
      adminId,
      action: "RELEASE_USERNAME",
      detail: row?.usernameLower ?? id,
    })
    .run();
  return { ok: true };
}

export function reserveUsername(adminId: string, username: string) {
  const lower = trLower(username.trim());
  if (lower.length < 3) throw new ApiError("Kullanıcı adı çok kısa.", 422);
  db.insert(reservedUsernames)
    .values({
      id: createId("res_"),
      usernameLower: lower,
      normalized: normalizeForFilter(username),
      reason: "MANUAL",
    })
    .onConflictDoNothing()
    .run();
  db.insert(adminActions)
    .values({ id: createId("act_"), adminId, action: "RESERVE_USERNAME", detail: lower })
    .run();
  return { ok: true };
}
