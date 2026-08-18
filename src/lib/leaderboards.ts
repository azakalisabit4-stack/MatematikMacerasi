import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import { LEAGUES, LEAGUE_BY_KEY, ROLE, levelFromXp } from "@/lib/constants";
import { isOnline } from "@/lib/social";

/**
 * GLOBAL SIRALAMALAR
 * -----------------------------------------------------------------------------
 * KURAL: Hocaefendi hesapları global sıralamalara ASLA dahil edilmez.
 * Puanı 100.000 bile olsa, ligi Şampiyon Ligi bile olsa listede görünmez.
 * Bu filtre sorgu seviyesinde uygulanır — arayüzde gizleme yapılmaz.
 */
const STUDENTS_ONLY = and(eq(users.roleKey, ROLE.STUDENT), eq(users.isActive, true));

export interface LeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  avatarKey: string;
  frameKey: string;
  titleKey: string | null;
  level: number;
  totalPoints: number;
  leagueKey: string;
  leagueName: string;
  leaguePoints: number;
  online: boolean;
}

function baseQuery() {
  return db
    .select({
      userId: users.id,
      username: users.username,
      avatarKey: users.avatarKey,
      frameKey: users.frameKey,
      titleKey: users.titleKey,
      lastSeenAt: users.lastSeenAt,
      xp: profiles.xp,
      totalPoints: profiles.totalPoints,
      leagueKey: profiles.leagueKey,
      leaguePoints: profiles.leaguePoints,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(STUDENTS_ONLY);
}

type Row = {
  userId: string;
  username: string;
  avatarKey: string;
  frameKey: string;
  titleKey: string | null;
  lastSeenAt: Date;
  xp: number;
  totalPoints: number;
  leagueKey: string;
  leaguePoints: number;
};

function decorate(rows: Row[], offset = 0): LeaderboardRow[] {
  return rows.map((r, i) => ({
    rank: offset + i + 1,
    userId: r.userId,
    username: r.username,
    avatarKey: r.avatarKey,
    frameKey: r.frameKey,
    titleKey: r.titleKey,
    level: levelFromXp(r.xp).level,
    totalPoints: r.totalPoints,
    leagueKey: r.leagueKey,
    leagueName: LEAGUE_BY_KEY[r.leagueKey]?.name ?? "Pirinç",
    leaguePoints: r.leaguePoints,
    online: isOnline(r.lastSeenAt),
  }));
}

/** PUAN SIRALAMASI — toplam puana göre (tek kişilik oyunlardan gelir). */
export function pointsLeaderboard(limit = 100): LeaderboardRow[] {
  const rows = baseQuery()
    .orderBy(desc(profiles.totalPoints), desc(profiles.xp), asc(users.id))
    .limit(limit)
    .all() as Row[];
  return decorate(rows);
}

/** LİG SIRALAMASI — lig seviyesine, sonra lig puanına göre (düellolardan gelir). */
export function leagueLeaderboard(limit = 100): LeaderboardRow[] {
  const rows = baseQuery()
    .orderBy(desc(profiles.leaguePoints), asc(users.id))
    .limit(limit)
    .all() as Row[];
  return decorate(rows);
}

/** Belirli bir ligdeki oyuncular */
export function leagueMembers(leagueKey: string, limit = 100): LeaderboardRow[] {
  const rows = db
    .select({
      userId: users.id,
      username: users.username,
      avatarKey: users.avatarKey,
      frameKey: users.frameKey,
      titleKey: users.titleKey,
      lastSeenAt: users.lastSeenAt,
      xp: profiles.xp,
      totalPoints: profiles.totalPoints,
      leagueKey: profiles.leagueKey,
      leaguePoints: profiles.leaguePoints,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(STUDENTS_ONLY, eq(profiles.leagueKey, leagueKey)))
    .orderBy(desc(profiles.leaguePoints), asc(users.id))
    .limit(limit)
    .all() as Row[];
  return decorate(rows);
}

/** Kullanıcının kendi sırası (Hocaefendi ise null döner — sıralamaya dahil değil). */
export function myRanks(userId: string): {
  pointsRank: number | null;
  leagueRank: number | null;
  leagueInnerRank: number | null;
  totalStudents: number;
} {
  const me = db
    .select({
      roleKey: users.roleKey,
      id: users.id,
      xp: profiles.xp,
      totalPoints: profiles.totalPoints,
      leaguePoints: profiles.leaguePoints,
      leagueKey: profiles.leagueKey,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1)
    .all()[0];

  const totalStudents =
    db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .where(STUDENTS_ONLY)
      .all()[0]?.c ?? 0;

  if (!me || me.roleKey !== ROLE.STUDENT)
    return { pointsRank: null, leagueRank: null, leagueInnerRank: null, totalStudents };

  // Sıralama, listeleme ile AYNI sıralama ölçütlerini kullanır (eşitlikte XP, sonra id).
  const pointsAhead =
    db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          STUDENTS_ONLY,
          sql`(${profiles.totalPoints} > ${me.totalPoints}
               OR (${profiles.totalPoints} = ${me.totalPoints} AND ${profiles.xp} > ${me.xp})
               OR (${profiles.totalPoints} = ${me.totalPoints} AND ${profiles.xp} = ${me.xp} AND ${users.id} < ${me.id}))`,
        ),
      )
      .all()[0]?.c ?? 0;

  const leagueAhead =
    db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          STUDENTS_ONLY,
          sql`(${profiles.leaguePoints} > ${me.leaguePoints}
               OR (${profiles.leaguePoints} = ${me.leaguePoints} AND ${users.id} < ${me.id}))`,
        ),
      )
      .all()[0]?.c ?? 0;

  const innerAhead =
    db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          STUDENTS_ONLY,
          eq(profiles.leagueKey, me.leagueKey),
          sql`(${profiles.leaguePoints} > ${me.leaguePoints}
               OR (${profiles.leaguePoints} = ${me.leaguePoints} AND ${users.id} < ${me.id}))`,
        ),
      )
      .all()[0]?.c ?? 0;

  return {
    pointsRank: pointsAhead + 1,
    leagueRank: leagueAhead + 1,
    leagueInnerRank: innerAhead + 1,
    totalStudents,
  };
}

/** Lig bazında öğrenci dağılımı (lig sayfası için) */
export function leagueDistribution(): Array<{ leagueKey: string; count: number }> {
  const rows = db
    .select({ leagueKey: profiles.leagueKey, c: sql<number>`count(*)` })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(STUDENTS_ONLY)
    .groupBy(profiles.leagueKey)
    .all();
  const map = new Map(rows.map((r) => [r.leagueKey, r.c]));
  return LEAGUES.map((l) => ({ leagueKey: l.key, count: map.get(l.key) ?? 0 }));
}
