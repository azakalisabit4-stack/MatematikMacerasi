import "server-only";

import { and, eq, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  friendships,
  leaguePointEvents,
  leagueSeasons,
  profiles,
  userAchievements,
  userDailyTasks,
} from "@/lib/db/schema";
import {
  LEAGUE_BY_KEY,
  NOTIFICATION_TYPE,
  leagueForPoints,
  levelFromXp,
} from "@/lib/constants";
import { ACHIEVEMENTS, type AchievementDef } from "@/lib/catalog/achievements";
import { createId } from "@/lib/ids";
import { notify } from "@/lib/notifications";

/* --------------------------------------------------------------- PROFİL */

export function getProfile(userId: string) {
  const rows = db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1).all();
  if (rows[0]) return rows[0];
  db.insert(profiles).values({ userId }).onConflictDoNothing().run();
  return db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1).all()[0];
}

/* ------------------------------------------------------------- XP / LEVEL */

export interface XpResult {
  xp: number;
  level: number;
  leveledUp: boolean;
  previousLevel: number;
}

/** XP YALNIZCA tek kişilik oyunlardan gelir. Lig puanıyla hiçbir ilişkisi yoktur. */
export function addXp(userId: string, amount: number): XpResult {
  const profile = getProfile(userId);
  const before = levelFromXp(profile.xp);
  const nextXp = Math.max(0, profile.xp + Math.round(amount));
  const after = levelFromXp(nextXp);

  db.update(profiles)
    .set({ xp: nextXp, level: after.level, updatedAt: new Date() })
    .where(eq(profiles.userId, userId))
    .run();

  if (after.level > before.level) {
    notify({
      userId,
      type: NOTIFICATION_TYPE.LEVEL_UP,
      title: `Seviye ${after.level}!`,
      body: `Tebrikler, ${after.level}. seviyeye ulaştın.`,
      iconKey: "level-up",
      link: "/profil",
      meta: { level: after.level },
    });
  }

  return {
    xp: nextXp,
    level: after.level,
    leveledUp: after.level > before.level,
    previousLevel: before.level,
  };
}

/** Toplam puan — global PUAN sıralamasını belirler. Lig puanından bağımsızdır. */
export function addPoints(userId: string, amount: number): number {
  const profile = getProfile(userId);
  const next = Math.max(0, profile.totalPoints + Math.round(amount));
  db.update(profiles)
    .set({ totalPoints: next, updatedAt: new Date() })
    .where(eq(profiles.userId, userId))
    .run();
  return next;
}

export function addCoins(userId: string, amount: number): number {
  const profile = getProfile(userId);
  const next = Math.max(0, profile.coins + Math.round(amount));
  db.update(profiles).set({ coins: next, updatedAt: new Date() }).where(eq(profiles.userId, userId)).run();
  return next;
}

/* ------------------------------------------------------------------ LİG */

export interface LeagueResult {
  points: number;
  leagueKey: string;
  previousLeagueKey: string;
  promoted: boolean;
  demoted: boolean;
  delta: number;
}

function activeSeasonId(): string | null {
  const s = db.select().from(leagueSeasons).where(eq(leagueSeasons.isActive, true)).limit(1).all();
  return s[0]?.id ?? null;
}

/**
 * Lig puanı YALNIZCA düellolardan değişir. 0'ın altına ASLA düşmez.
 * (Kaybedenin 5 puanı varsa ve 20 puan kaybetmesi gerekiyorsa 0'da kalır.)
 */
export function applyLeagueDelta(
  userId: string,
  delta: number,
  reason: string,
  duelId?: string,
): LeagueResult {
  const profile = getProfile(userId);
  const previousLeagueKey = profile.leagueKey;
  const raw = profile.leaguePoints + Math.round(delta);
  const points = Math.max(0, raw);
  const appliedDelta = points - profile.leaguePoints;
  const league = leagueForPoints(points);

  db.update(profiles)
    .set({
      leaguePoints: points,
      leagueKey: league.key,
      peakLeaguePoints: Math.max(profile.peakLeaguePoints, points),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId))
    .run();

  db.insert(leaguePointEvents)
    .values({
      id: createId("lpe_"),
      userId,
      seasonId: activeSeasonId(),
      delta: appliedDelta,
      balance: points,
      reason,
      duelId: duelId ?? null,
    })
    .run();

  const before = LEAGUE_BY_KEY[previousLeagueKey];
  const promoted = !!before && league.order > before.order;
  const demoted = !!before && league.order < before.order;

  if (promoted) {
    notify({
      userId,
      type: NOTIFICATION_TYPE.LEAGUE_UP,
      title: `${league.name}'e yükseldin!`,
      body: `Lig puanın ${points}. Tebrikler!`,
      iconKey: `league-${league.key}`,
      link: "/lig",
      meta: { leagueKey: league.key },
    });
  } else if (demoted) {
    notify({
      userId,
      type: NOTIFICATION_TYPE.LEAGUE_DOWN,
      title: `${league.name}'e düştün`,
      body: `Lig puanın ${points}. Düellolarla geri yükselebilirsin.`,
      iconKey: `league-${league.key}`,
      link: "/lig",
      meta: { leagueKey: league.key },
    });
  }

  return {
    points,
    leagueKey: league.key,
    previousLeagueKey,
    promoted,
    demoted,
    delta: appliedDelta,
  };
}

/* ---------------------------------------------------------- BAŞARIMLAR */

export interface AchievementFlags {
  climbCompleted?: boolean;
  perfectSeven?: boolean;
  perfectMulTable?: boolean;
  bossDefeated?: boolean;
}

export interface UnlockedAchievement {
  key: string;
  name: string;
  description: string;
  iconKey: string;
  tier: string;
  rewardXp: number;
  rewardCoins: number;
}

function currentMetricValue(
  def: AchievementDef,
  ctx: {
    profile: typeof profiles.$inferSelect;
    leagueOrder: number;
    completedTasks: number;
    friendCount: number;
    flags: AchievementFlags;
  },
): number {
  const p = ctx.profile;
  switch (def.metric) {
    case "games_played":
      return p.gamesPlayed;
    case "answer_streak":
      return p.bestAnswerStreak;
    case "perfect_game":
      return p.perfectGames;
    case "time_bonus":
      return p.bestTimeBonus;
    case "total_points":
      return p.totalPoints;
    case "duel_wins":
      return p.duelWins;
    case "duel_streak":
      return p.bestDuelStreak;
    case "level":
      return p.level;
    case "league_order":
      return ctx.leagueOrder;
    case "daily_tasks":
      return ctx.completedTasks;
    case "friends":
      return ctx.friendCount;
    case "game_complete:climb":
      return ctx.flags.climbCompleted ? 1 : 0;
    case "perfect_variant:ritmik-ileri-1:7":
      return ctx.flags.perfectSeven ? 1 : 0;
    case "perfect_game:carpim-tablosu":
      return ctx.flags.perfectMulTable ? 1 : 0;
    case "boss_defeated":
      return ctx.flags.bossDefeated ? 1 : 0;
    default:
      return 0;
  }
}

/**
 * Tüm başarımların ilerlemesini günceller, yeni açılanları döndürür.
 * Başarım ödülleri (XP/jeton) burada verilir; sonsuz döngü olmaması için
 * ödül verildikten sonra tekrar değerlendirme yapılmaz.
 */
export function evaluateAchievements(
  userId: string,
  flags: AchievementFlags = {},
): UnlockedAchievement[] {
  const profile = getProfile(userId);
  const leagueOrder = LEAGUE_BY_KEY[profile.leagueKey]?.order ?? 1;

  const completedTasks =
    db
      .select({ c: sql<number>`count(*)` })
      .from(userDailyTasks)
      .where(and(eq(userDailyTasks.userId, userId), eq(userDailyTasks.completed, true)))
      .all()[0]?.c ?? 0;

  const friendCount =
    db
      .select({ c: sql<number>`count(*)` })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "ACCEPTED"),
          or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
        ),
      )
      .all()[0]?.c ?? 0;

  const existing = db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId))
    .all();
  const byKey = new Map(existing.map((e) => [e.achievementKey, e]));

  const unlocked: UnlockedAchievement[] = [];
  let bonusXp = 0;
  let bonusCoins = 0;

  for (const def of ACHIEVEMENTS) {
    const value = currentMetricValue(def, { profile, leagueOrder, completedTasks, friendCount, flags });
    const row = byKey.get(def.key);
    const prevProgress = row?.progress ?? 0;
    const progress = Math.max(prevProgress, Math.min(value, def.target));
    const alreadyUnlocked = !!row?.unlockedAt;
    const shouldUnlock = !alreadyUnlocked && progress >= def.target;

    if (!row) {
      db.insert(userAchievements)
        .values({
          userId,
          achievementKey: def.key,
          progress,
          unlockedAt: shouldUnlock ? new Date() : null,
        })
        .onConflictDoNothing()
        .run();
    } else if (progress !== prevProgress || shouldUnlock) {
      db.update(userAchievements)
        .set({ progress, unlockedAt: shouldUnlock ? new Date() : row.unlockedAt })
        .where(
          and(
            eq(userAchievements.userId, userId),
            eq(userAchievements.achievementKey, def.key),
          ),
        )
        .run();
    }

    if (shouldUnlock) {
      bonusXp += def.rewardXp;
      bonusCoins += def.rewardCoins;
      unlocked.push({
        key: def.key,
        name: def.name,
        description: def.description,
        iconKey: def.iconKey,
        tier: def.tier,
        rewardXp: def.rewardXp,
        rewardCoins: def.rewardCoins,
      });
      notify({
        userId,
        type: NOTIFICATION_TYPE.ACHIEVEMENT,
        title: "Yeni başarım!",
        body: `${def.name} — ${def.description}`,
        iconKey: def.iconKey,
        link: "/basarimlar",
        meta: { key: def.key, tier: def.tier },
      });
    }
  }

  if (bonusXp > 0) {
    const p = getProfile(userId);
    const nextXp = p.xp + bonusXp;
    const info = levelFromXp(nextXp);
    db.update(profiles)
      .set({ xp: nextXp, level: info.level, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .run();
  }
  if (bonusCoins > 0) addCoins(userId, bonusCoins);

  return unlocked;
}
