import "server-only";

import { and, desc, eq, gt, inArray, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { friendships, profiles, users } from "@/lib/db/schema";
import { ApiError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { LEAGUE_BY_KEY, NOTIFICATION_TYPE, ONLINE_WINDOW_MS, ROLE, levelFromXp } from "@/lib/constants";
import { notify } from "@/lib/notifications";
import { publishToUser } from "@/lib/realtime";
import { trLower } from "@/lib/moderation";

/* ------------------------------------------------------------- ÇEVRİMİÇİ */

export function isOnline(lastSeenAt: Date | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt.getTime() < ONLINE_WINDOW_MS;
}

/**
 * "Son görülme" damgasını tazeler. Kullanıcı çevrimdışıyken tekrar çevrimiçi
 * olduysa arkadaşlarına bildirim gönderir.
 * Hocaefendi hesapları çevrimiçi listesinde GÖRÜNMEZ ve bildirim üretmez.
 */
export function touchPresenceWithEvents(userId: string) {
  const row = db
    .select({ lastSeenAt: users.lastSeenAt, username: users.username, roleKey: users.roleKey })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .all()[0];
  if (!row) return;

  const wasOffline = !isOnline(row.lastSeenAt);
  db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId)).run();

  if (!wasOffline) return;
  if (row.roleKey === ROLE.HOCAEFENDI) return; // Hocaefendi'nin durumu öğrencilere sızmaz

  for (const friend of friendIdsOf(userId)) {
    notify({
      userId: friend,
      type: NOTIFICATION_TYPE.FRIEND_ONLINE,
      title: `${row.username} çevrimiçi oldu`,
      body: "Hemen düelloya davet edebilirsin.",
      iconKey: "user-online",
      link: `/arkadaslar`,
      meta: { userId, username: row.username },
    });
    publishToUser(friend, { type: "presence", payload: { userId, username: row.username, online: true } });
  }
}

/* ------------------------------------------------------------ ARKADAŞLIK */

export function friendIdsOf(userId: string): string[] {
  const rows = db
    .select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "ACCEPTED"),
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
      ),
    )
    .all();
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

export interface PublicUserCard {
  id: string;
  username: string;
  avatarKey: string;
  frameKey: string;
  titleKey: string | null;
  roleKey: string;
  level: number;
  totalPoints: number;
  leagueKey: string;
  leagueName: string;
  leaguePoints: number;
  online: boolean;
  lastSeenAt: number | null;
}

function cardSelect() {
  return db
    .select({
      id: users.id,
      username: users.username,
      avatarKey: users.avatarKey,
      frameKey: users.frameKey,
      titleKey: users.titleKey,
      roleKey: users.roleKey,
      lastSeenAt: users.lastSeenAt,
      xp: profiles.xp,
      level: profiles.level,
      totalPoints: profiles.totalPoints,
      leagueKey: profiles.leagueKey,
      leaguePoints: profiles.leaguePoints,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id));
}

type CardRow = {
  id: string;
  username: string;
  avatarKey: string;
  frameKey: string;
  titleKey: string | null;
  roleKey: string;
  lastSeenAt: Date;
  xp: number;
  level: number;
  totalPoints: number;
  leagueKey: string;
  leaguePoints: number;
};

function toCard(r: CardRow): PublicUserCard {
  return {
    id: r.id,
    username: r.username,
    avatarKey: r.avatarKey,
    frameKey: r.frameKey,
    titleKey: r.titleKey,
    roleKey: r.roleKey,
    level: levelFromXp(r.xp).level,
    totalPoints: r.totalPoints,
    leagueKey: r.leagueKey,
    leagueName: LEAGUE_BY_KEY[r.leagueKey]?.name ?? "Pirinç",
    leaguePoints: r.leaguePoints,
    online: isOnline(r.lastSeenAt),
    lastSeenAt: r.lastSeenAt?.getTime() ?? null,
  };
}

export function listFriends(userId: string) {
  const ids = friendIdsOf(userId);
  if (ids.length === 0) return [];
  const rows = cardSelect().where(inArray(users.id, ids)).all() as CardRow[];
  return rows
    .map(toCard)
    .sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username, "tr"));
}

export function incomingRequests(userId: string) {
  const rows = db
    .select({
      id: friendships.id,
      createdAt: friendships.createdAt,
      userId: users.id,
      username: users.username,
      avatarKey: users.avatarKey,
      frameKey: users.frameKey,
      roleKey: users.roleKey,
    })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.requesterId))
    .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, "PENDING")))
    .orderBy(desc(friendships.createdAt))
    .all();
  return rows;
}

export function outgoingRequests(userId: string) {
  return db
    .select({
      id: friendships.id,
      createdAt: friendships.createdAt,
      userId: users.id,
      username: users.username,
      avatarKey: users.avatarKey,
      roleKey: users.roleKey,
    })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.addresseeId))
    .where(and(eq(friendships.requesterId, userId), eq(friendships.status, "PENDING")))
    .orderBy(desc(friendships.createdAt))
    .all();
}

export function sendFriendRequest(userId: string, targetUsername: string) {
  const target = db
    .select()
    .from(users)
    .where(eq(users.usernameLower, trLower(targetUsername)))
    .limit(1)
    .all()[0];
  if (!target) throw new ApiError("Bu kullanıcı adına sahip biri yok.", 404);
  if (target.id === userId) throw new ApiError("Kendine arkadaşlık isteği gönderemezsin.", 400);

  const existing = db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, target.id)),
        and(eq(friendships.requesterId, target.id), eq(friendships.addresseeId, userId)),
      ),
    )
    .all();

  const accepted = existing.find((e) => e.status === "ACCEPTED");
  if (accepted) throw new ApiError("Zaten arkadaşsınız.", 409);
  const pending = existing.find((e) => e.status === "PENDING");
  if (pending) {
    if (pending.addresseeId === userId) {
      return acceptFriendRequest(userId, pending.id);
    }
    throw new ApiError("İsteğin zaten gönderildi.", 409);
  }

  const me = db.select().from(users).where(eq(users.id, userId)).limit(1).all()[0];
  const id = createId("frd_");
  db.insert(friendships)
    .values({ id, requesterId: userId, addresseeId: target.id, status: "PENDING" })
    .onConflictDoUpdate({
      target: [friendships.requesterId, friendships.addresseeId],
      set: { status: "PENDING", createdAt: new Date(), respondedAt: null },
    })
    .run();

  notify({
    userId: target.id,
    type: NOTIFICATION_TYPE.FRIEND_REQUEST,
    title: "Yeni arkadaşlık isteği",
    body: `${me?.username ?? "Bir oyuncu"} seni arkadaş olarak eklemek istiyor.`,
    iconKey: "user-plus",
    link: "/arkadaslar",
    meta: { fromId: userId },
  });

  return { ok: true };
}

export function acceptFriendRequest(userId: string, requestId: string) {
  const row = db.select().from(friendships).where(eq(friendships.id, requestId)).limit(1).all()[0];
  if (!row) throw new ApiError("İstek bulunamadı.", 404);
  if (row.addresseeId !== userId) throw new ApiError("Bu isteği kabul edemezsin.", 403);
  if (row.status !== "PENDING") throw new ApiError("Bu istek artık geçerli değil.", 409);

  db.update(friendships)
    .set({ status: "ACCEPTED", respondedAt: new Date() })
    .where(eq(friendships.id, requestId))
    .run();

  const me = db.select().from(users).where(eq(users.id, userId)).limit(1).all()[0];
  notify({
    userId: row.requesterId,
    type: NOTIFICATION_TYPE.FRIEND_ACCEPTED,
    title: "Arkadaşlık isteğin kabul edildi",
    body: `${me?.username ?? "Bir oyuncu"} artık arkadaşın.`,
    iconKey: "user-check",
    link: "/arkadaslar",
    meta: { userId },
  });
  return { ok: true };
}

export function declineFriendRequest(userId: string, requestId: string) {
  const row = db.select().from(friendships).where(eq(friendships.id, requestId)).limit(1).all()[0];
  if (!row) throw new ApiError("İstek bulunamadı.", 404);
  if (row.addresseeId !== userId && row.requesterId !== userId)
    throw new ApiError("Bu isteği reddedemezsin.", 403);
  db.delete(friendships).where(eq(friendships.id, requestId)).run();
  return { ok: true };
}

export function removeFriend(userId: string, otherId: string) {
  db.delete(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, otherId)),
        and(eq(friendships.requesterId, otherId), eq(friendships.addresseeId, userId)),
      ),
    )
    .run();
  return { ok: true };
}

/** Kullanıcı adına göre arama — Hocaefendi hesapları da bulunabilir (düello için). */
export function searchUsers(query: string, excludeUserId: string, limit = 15) {
  const q = trLower(query.trim());
  if (q.length < 2) return [];
  const rows = cardSelect()
    .where(and(sql`${users.usernameLower} like ${"%" + q + "%"}`, ne(users.id, excludeUserId)))
    .limit(limit)
    .all() as CardRow[];
  return rows.map(toCard);
}

/**
 * Aktif (çevrimiçi) öğrenciler.
 * Hocaefendi hesapları bu listede ASLA görünmez — öğrenciler onların çevrimiçi
 * durumunu göremez.
 */
export function onlineStudents(excludeUserId: string, limit = 40) {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const rows = cardSelect()
    .where(
      and(
        eq(users.roleKey, ROLE.STUDENT),
        eq(users.isActive, true),
        gt(users.lastSeenAt, since),
        ne(users.id, excludeUserId),
      ),
    )
    .orderBy(desc(users.lastSeenAt))
    .limit(limit)
    .all() as CardRow[];
  return rows.map(toCard);
}

export function friendshipStatus(userId: string, otherId: string) {
  const row = db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, otherId)),
        and(eq(friendships.requesterId, otherId), eq(friendships.addresseeId, userId)),
      ),
    )
    .limit(1)
    .all()[0];
  if (!row) return { status: "NONE" as const, requestId: null, incoming: false };
  return {
    status: row.status as "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED",
    requestId: row.id,
    incoming: row.addresseeId === userId,
  };
}
