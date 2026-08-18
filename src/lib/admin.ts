import "server-only";

import { and, desc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  adminActions,
  duels,
  gameResults,
  gameSessions,
  profiles,
  systemSettings,
  users,
} from "@/lib/db/schema";
import { ApiError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { GAMES, GAME_BY_KEY, LEAGUES, LEAGUE_BY_KEY, ONLINE_WINDOW_MS, ROLE, levelFromXp } from "@/lib/constants";
import { isOnline } from "@/lib/social";
import { trLower } from "@/lib/moderation";

/**
 * HOCAEFENDİ PANELİ — VIEW ONLY
 * -----------------------------------------------------------------------------
 * Hocaefendi öğrencilerin ilerlemesini, istatistiklerini ve oyunlarını görebilir;
 * ancak devam eden bir oyuna müdahale edemez, puan/XP değiştiremez.
 * Yazma yetkisi yalnızca moderasyon alanındadır:
 *   - kullanıcı adı düzenleme
 *   - yasaklı kelime yönetimi
 *   - rezerve kullanıcı adı yönetimi
 *   - hesabı devre dışı bırakma
 *   - sistem ayarları
 */

export function adminOverview() {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const today = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const studentCount =
    db.select({ c: sql<number>`count(*)` }).from(users).where(eq(users.roleKey, ROLE.STUDENT)).all()[0]?.c ?? 0;
  const adminCount =
    db.select({ c: sql<number>`count(*)` }).from(users).where(eq(users.roleKey, ROLE.HOCAEFENDI)).all()[0]?.c ?? 0;
  const onlineCount =
    db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.roleKey, ROLE.STUDENT), gt(users.lastSeenAt, since)))
      .all()[0]?.c ?? 0;
  const gamesToday =
    db.select({ c: sql<number>`count(*)` }).from(gameResults).where(gt(gameResults.createdAt, today)).all()[0]?.c ?? 0;
  const gamesTotal = db.select({ c: sql<number>`count(*)` }).from(gameResults).all()[0]?.c ?? 0;
  const duelsTotal = db.select({ c: sql<number>`count(*)` }).from(duels).where(eq(duels.status, "FINISHED")).all()[0]?.c ?? 0;
  const activeDuels = db.select({ c: sql<number>`count(*)` }).from(duels).where(eq(duels.status, "ACTIVE")).all()[0]?.c ?? 0;
  const totals =
    db
      .select({
        points: sql<number>`coalesce(sum(${profiles.totalPoints}), 0)`,
        xp: sql<number>`coalesce(sum(${profiles.xp}), 0)`,
        correct: sql<number>`coalesce(sum(${profiles.totalCorrect}), 0)`,
        wrong: sql<number>`coalesce(sum(${profiles.totalWrong}), 0)`,
      })
      .from(profiles)
      .all()[0] ?? { points: 0, xp: 0, correct: 0, wrong: 0 };

  const perGame = db
    .select({
      gameKey: gameResults.gameKey,
      plays: sql<number>`count(*)`,
      avgScore: sql<number>`coalesce(round(avg(${gameResults.score})), 0)`,
      bestScore: sql<number>`coalesce(max(${gameResults.score}), 0)`,
      correct: sql<number>`coalesce(sum(${gameResults.correct}), 0)`,
      wrong: sql<number>`coalesce(sum(${gameResults.wrong}), 0)`,
    })
    .from(gameResults)
    .groupBy(gameResults.gameKey)
    .all();

  const gameStats = GAMES.map((g) => {
    const found = perGame.find((p) => p.gameKey === g.key);
    return {
      gameKey: g.key,
      name: g.shortName,
      iconKey: g.iconKey,
      plays: found?.plays ?? 0,
      avgScore: found?.avgScore ?? 0,
      bestScore: found?.bestScore ?? 0,
      correct: found?.correct ?? 0,
      wrong: found?.wrong ?? 0,
    };
  }).sort((a, b) => b.plays - a.plays);

  const leagueRows = db
    .select({ leagueKey: profiles.leagueKey, c: sql<number>`count(*)` })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.roleKey, ROLE.STUDENT))
    .groupBy(profiles.leagueKey)
    .all();

  return {
    studentCount,
    adminCount,
    onlineCount,
    gamesToday,
    gamesTotal,
    duelsTotal,
    activeDuels,
    totals,
    gameStats,
    // Tüm ligler her zaman listelenir (boş olanlar 0 ile).
    leagues: LEAGUES.map((l) => ({
      leagueKey: l.key,
      name: l.name,
      count: leagueRows.find((r) => r.leagueKey === l.key)?.c ?? 0,
    })),
  };
}

export function adminListStudents(query = "", onlyOnline = false, limit = 200) {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const conditions = [eq(users.roleKey, ROLE.STUDENT)];
  if (query.trim().length >= 1) {
    conditions.push(sql`${users.usernameLower} like ${"%" + trLower(query.trim()) + "%"}`);
  }
  if (onlyOnline) conditions.push(gt(users.lastSeenAt, since));

  const rows = db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      avatarKey: users.avatarKey,
      frameKey: users.frameKey,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
      xp: profiles.xp,
      totalPoints: profiles.totalPoints,
      leagueKey: profiles.leagueKey,
      leaguePoints: profiles.leaguePoints,
      duelWins: profiles.duelWins,
      duelLosses: profiles.duelLosses,
      gamesPlayed: profiles.gamesPlayed,
      totalCorrect: profiles.totalCorrect,
      totalWrong: profiles.totalWrong,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(profiles.totalPoints))
    .limit(limit)
    .all();

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    email: r.email,
    avatarKey: r.avatarKey,
    frameKey: r.frameKey,
    isActive: r.isActive,
    createdAt: r.createdAt.getTime(),
    lastSeenAt: r.lastSeenAt.getTime(),
    online: isOnline(r.lastSeenAt),
    level: levelFromXp(r.xp).level,
    xp: r.xp,
    totalPoints: r.totalPoints,
    leagueKey: r.leagueKey,
    leagueName: LEAGUE_BY_KEY[r.leagueKey]?.name ?? r.leagueKey,
    leaguePoints: r.leaguePoints,
    duelWins: r.duelWins,
    duelLosses: r.duelLosses,
    gamesPlayed: r.gamesPlayed,
    accuracy:
      r.totalCorrect + r.totalWrong === 0
        ? 0
        : Math.round((r.totalCorrect / (r.totalCorrect + r.totalWrong)) * 100),
  }));
}

export function adminStudentDetail(studentId: string) {
  const user = db.select().from(users).where(eq(users.id, studentId)).limit(1).all()[0];
  if (!user) throw new ApiError("Öğrenci bulunamadı.", 404);

  const sessions = db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.userId, studentId))
    .orderBy(desc(gameSessions.startedAt))
    .limit(25)
    .all();

  const results = db
    .select()
    .from(gameResults)
    .where(eq(gameResults.userId, studentId))
    .orderBy(desc(gameResults.createdAt))
    .limit(25)
    .all();

  return {
    sessions: sessions.map((s) => ({
      id: s.id,
      gameKey: s.gameKey,
      gameName: GAME_BY_KEY[s.gameKey]?.shortName ?? s.gameKey,
      variant: s.variant,
      status: s.status,
      score: s.score,
      correct: s.correct,
      wrong: s.wrong,
      startedAt: s.startedAt.getTime(),
      endedAt: s.endedAt?.getTime() ?? null,
    })),
    results: results.map((r) => ({
      id: r.id,
      gameKey: r.gameKey,
      gameName: GAME_BY_KEY[r.gameKey]?.shortName ?? r.gameKey,
      score: r.score,
      timeBonus: r.timeBonus,
      correct: r.correct,
      wrong: r.wrong,
      xpEarned: r.xpEarned,
      isPerfect: r.isPerfect,
      isNewRecord: r.isNewRecord,
      createdAt: r.createdAt.getTime(),
    })),
  };
}

export function adminListDuels(limit = 60) {
  const rows = db.select().from(duels).orderBy(desc(duels.createdAt)).limit(limit).all();
  const names = new Map(
    db.select({ id: users.id, username: users.username, roleKey: users.roleKey }).from(users).all().map((u) => [u.id, u]),
  );
  return rows.map((d) => ({
    id: d.id,
    mode: d.mode,
    status: d.status,
    createdAt: d.createdAt.getTime(),
    finishedAt: d.finishedAt?.getTime() ?? null,
    pointsDelta: d.pointsDelta,
    isDraw: d.isDraw,
    challenger: names.get(d.challengerId)?.username ?? "—",
    challengerRole: names.get(d.challengerId)?.roleKey ?? ROLE.STUDENT,
    opponent: names.get(d.opponentId)?.username ?? "—",
    opponentRole: names.get(d.opponentId)?.roleKey ?? ROLE.STUDENT,
    winner: d.winnerId ? (names.get(d.winnerId)?.username ?? "—") : null,
  }));
}

export function adminSetActive(adminId: string, userId: string, isActive: boolean) {
  const target = db.select().from(users).where(eq(users.id, userId)).limit(1).all()[0];
  if (!target) throw new ApiError("Kullanıcı bulunamadı.", 404);
  if (target.roleKey === ROLE.HOCAEFENDI)
    throw new ApiError("Hocaefendi hesapları bu panelden kapatılamaz.", 403);

  db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, userId)).run();
  db.insert(adminActions)
    .values({
      id: createId("act_"),
      adminId,
      targetUserId: userId,
      action: isActive ? "ENABLE_USER" : "DISABLE_USER",
      detail: target.username,
    })
    .run();
  return { ok: true };
}

export function adminSettings() {
  return db.select().from(systemSettings).all();
}

export function adminUpdateSetting(adminId: string, key: string, value: string) {
  const allowed = ["site_name", "duel_enabled", "registration_open", "duel_invite_ttl_sec"];
  if (!allowed.includes(key)) throw new ApiError("Bu ayar değiştirilemez.", 403);
  db.insert(systemSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedAt: new Date() } })
    .run();
  db.insert(adminActions)
    .values({ id: createId("act_"), adminId, action: "UPDATE_SETTING", detail: `${key}=${value}` })
    .run();
  return { ok: true };
}

export function adminActionLog(limit = 50) {
  const rows = db.select().from(adminActions).orderBy(desc(adminActions.createdAt)).limit(limit).all();
  const names = new Map(db.select({ id: users.id, username: users.username }).from(users).all().map((u) => [u.id, u.username]));
  return rows.map((r) => ({
    id: r.id,
    admin: names.get(r.adminId) ?? "—",
    target: r.targetUserId ? (names.get(r.targetUserId) ?? "—") : null,
    action: r.action,
    detail: r.detail,
    createdAt: r.createdAt.getTime(),
  }));
}
