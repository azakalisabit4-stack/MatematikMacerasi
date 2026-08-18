import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { and, eq, gt, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { authSessions, users, profiles } from "@/lib/db/schema";
import { createId, randomToken } from "@/lib/ids";
import { ROLE, type RoleKey } from "@/lib/constants";

export const SESSION_COOKIE = "mm_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

function secretKey(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 24) {
    // Geliştirme kolaylığı için sabit bir yedek; üretimde .env zorunludur.
    return new TextEncoder().encode(
      "matematik-macerasi-gelistirme-anahtari-lutfen-degistirin",
    );
  }
  return new TextEncoder().encode(raw);
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export interface SessionUser {
  id: string;
  username: string;
  usernameLower: string;
  email: string;
  roleKey: RoleKey;
  avatarKey: string;
  frameKey: string;
  titleKey: string | null;
  isActive: boolean;
  showStatsPublicly: boolean;
  sessionId: string;
}

/** Yeni oturum oluşturur, imzalı çerezi yazar. */
export async function createSession(userId: string, userAgent?: string): Promise<string> {
  const token = randomToken(32);
  const sessionId = createId("ses_");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  db.insert(authSessions)
    .values({
      id: sessionId,
      userId,
      tokenHash: sha256(token),
      userAgent: userAgent?.slice(0, 250) ?? null,
      expiresAt,
    })
    .run();

  // Süresi geçmiş oturumları temizle (ucuz bakım)
  db.delete(authSessions).where(lt(authSessions.expiresAt, new Date())).run();

  const jwt = await new SignJWT({ sid: sessionId, t: token })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return sessionId;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    try {
      const { payload } = await jwtVerify(raw, secretKey());
      const sid = payload.sid as string | undefined;
      if (sid) db.delete(authSessions).where(eq(authSessions.id, sid)).run();
    } catch {
      /* geçersiz token — sadece çerezi sil */
    }
  }
  store.delete(SESSION_COOKIE);
}

/** Çerezdeki oturumu doğrular; geçerliyse kullanıcıyı döner. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  let sid: string;
  let token: string;
  try {
    const { payload } = await jwtVerify(raw, secretKey());
    sid = payload.sid as string;
    token = payload.t as string;
    if (!sid || !token) return null;
  } catch {
    return null;
  }

  const rows = db
    .select({
      sessionId: authSessions.id,
      tokenHash: authSessions.tokenHash,
      id: users.id,
      username: users.username,
      usernameLower: users.usernameLower,
      email: users.email,
      roleKey: users.roleKey,
      avatarKey: users.avatarKey,
      frameKey: users.frameKey,
      titleKey: users.titleKey,
      isActive: users.isActive,
      showStatsPublicly: users.showStatsPublicly,
    })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(and(eq(authSessions.id, sid), gt(authSessions.expiresAt, new Date())))
    .limit(1)
    .all();

  const row = rows[0];
  if (!row) return null;
  if (row.tokenHash !== sha256(token)) return null;
  if (!row.isActive) return null;

  return {
    id: row.id,
    username: row.username,
    usernameLower: row.usernameLower,
    email: row.email,
    roleKey: row.roleKey as RoleKey,
    avatarKey: row.avatarKey,
    frameKey: row.frameKey,
    titleKey: row.titleKey,
    isActive: row.isActive,
    showStatsPublicly: row.showStatsPublicly,
    sessionId: row.sessionId,
  };
}

/** Çevrimiçi göstergesi için "son görülme" damgasını tazeler. */
export function touchPresence(userId: string) {
  db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId)).run();
}

export function isAdmin(user: { roleKey: string } | null | undefined): boolean {
  return user?.roleKey === ROLE.HOCAEFENDI;
}

export function ensureProfile(userId: string) {
  const existing = db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1).all();
  if (existing.length === 0) {
    db.insert(profiles).values({ userId }).run();
  }
}
