import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { achievements, gameResults, profiles, userAchievements, users } from "@/lib/db/schema";
import { GAME_BY_KEY, LEAGUE_BY_KEY, ROLE, levelFromXp, leagueForPoints } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { isOnline } from "@/lib/social";
import { listRecords } from "@/lib/games/engine";
import { trLower } from "@/lib/moderation";

export interface ProfileView {
  id: string;
  username: string;
  avatarKey: string;
  frameKey: string;
  titleKey: string | null;
  roleKey: string;
  isSelf: boolean;
  online: boolean;
  memberSince: number;
  /** E-POSTA ADRESİ PROFİLDE ASLA GÖSTERİLMEZ — yalnızca kişinin kendi ayarlar sayfasında */
  level: number;
  xp: number;
  xpCurrent: number;
  xpRequired: number;
  xpProgress: number;
  totalPoints: number;
  coins: number;
  /** Hocaefendi profilinde puan/lig gizlenmiş olabilir */
  statsHidden: boolean;
  leagueKey: string;
  leagueName: string;
  leaguePoints: number;
  leagueMin: number;
  leagueMax: number | null;
  duelWins: number;
  duelLosses: number;
  duelDraws: number;
  duelStreak: number;
  bestDuelStreak: number;
  gamesPlayed: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;
  bestTimeBonus: number;
  perfectGames: number;
  bestAnswerStreak: number;
  achievements: Array<{
    key: string;
    name: string;
    description: string;
    iconKey: string;
    tier: string;
    category: string;
    target: number;
    progress: number;
    unlocked: boolean;
    unlockedAt: number | null;
  }>;
  records: ReturnType<typeof listRecords>;
  recentGames: Array<{
    gameKey: string;
    gameName: string;
    score: number;
    correct: number;
    wrong: number;
    createdAt: number;
    isPerfect: boolean;
  }>;
}

export function loadProfileView(
  targetIdOrUsername: string,
  viewerId: string | null,
): ProfileView {
  const target =
    db
      .select()
      .from(users)
      .where(eq(users.id, targetIdOrUsername))
      .limit(1)
      .all()[0] ??
    db
      .select()
      .from(users)
      .where(eq(users.usernameLower, trLower(targetIdOrUsername)))
      .limit(1)
      .all()[0];

  if (!target) throw new ApiError("Kullanıcı bulunamadı.", 404);

  const profile =
    db.select().from(profiles).where(eq(profiles.userId, target.id)).limit(1).all()[0] ??
    (() => {
      db.insert(profiles).values({ userId: target.id }).onConflictDoNothing().run();
      return db.select().from(profiles).where(eq(profiles.userId, target.id)).limit(1).all()[0];
    })();

  const isSelf = viewerId === target.id;
  const isAdminProfile = target.roleKey === ROLE.HOCAEFENDI;
  // Öğrenciler puanını/ligini GİZLEYEMEZ. Yalnızca Hocaefendi kendi puan/lig
  // bilgisini profilinde gizleyebilir (varsayılan: gizli).
  const statsHidden = isAdminProfile && !target.showStatsPublicly && !isSelf;

  const info = levelFromXp(profile.xp);
  const league = leagueForPoints(profile.leaguePoints);

  const achRows = db
    .select({
      key: achievements.key,
      name: achievements.name,
      description: achievements.description,
      iconKey: achievements.iconKey,
      tier: achievements.tier,
      category: achievements.category,
      target: achievements.target,
      sortOrder: achievements.sortOrder,
      progress: userAchievements.progress,
      unlockedAt: userAchievements.unlockedAt,
    })
    .from(achievements)
    .leftJoin(
      userAchievements,
      and(
        eq(userAchievements.achievementKey, achievements.key),
        eq(userAchievements.userId, target.id),
      ),
    )
    .orderBy(achievements.sortOrder)
    .all();

  const recent = db
    .select()
    .from(gameResults)
    .where(eq(gameResults.userId, target.id))
    .orderBy(desc(gameResults.createdAt))
    .limit(8)
    .all();

  const totalAnswers = profile.totalCorrect + profile.totalWrong;

  return {
    id: target.id,
    username: target.username,
    avatarKey: target.avatarKey,
    frameKey: target.frameKey,
    titleKey: target.titleKey,
    roleKey: target.roleKey,
    isSelf,
    online: target.roleKey === ROLE.HOCAEFENDI && !isSelf ? false : isOnline(target.lastSeenAt),
    memberSince: target.createdAt.getTime(),
    level: info.level,
    xp: profile.xp,
    xpCurrent: info.currentXp,
    xpRequired: info.requiredXp,
    xpProgress: info.progress,
    totalPoints: statsHidden ? 0 : profile.totalPoints,
    coins: isSelf ? profile.coins : 0,
    statsHidden,
    leagueKey: statsHidden ? "gizli" : league.key,
    leagueName: statsHidden ? "Gizli" : league.name,
    leaguePoints: statsHidden ? 0 : profile.leaguePoints,
    leagueMin: LEAGUE_BY_KEY[league.key]?.min ?? 0,
    leagueMax: LEAGUE_BY_KEY[league.key]?.max ?? null,
    duelWins: profile.duelWins,
    duelLosses: profile.duelLosses,
    duelDraws: profile.duelDraws,
    duelStreak: profile.duelStreak,
    bestDuelStreak: profile.bestDuelStreak,
    gamesPlayed: profile.gamesPlayed,
    totalCorrect: profile.totalCorrect,
    totalWrong: profile.totalWrong,
    accuracy: totalAnswers === 0 ? 0 : Math.round((profile.totalCorrect / totalAnswers) * 100),
    bestTimeBonus: profile.bestTimeBonus,
    perfectGames: profile.perfectGames,
    bestAnswerStreak: profile.bestAnswerStreak,
    achievements: achRows.map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      iconKey: a.iconKey,
      tier: a.tier,
      category: a.category,
      target: a.target,
      progress: a.progress ?? 0,
      unlocked: !!a.unlockedAt,
      unlockedAt: a.unlockedAt?.getTime() ?? null,
    })),
    records: listRecords(target.id),
    recentGames: recent.map((r) => ({
      gameKey: r.gameKey,
      gameName: GAME_BY_KEY[r.gameKey]?.shortName ?? r.gameKey,
      score: r.score,
      correct: r.correct,
      wrong: r.wrong,
      createdAt: r.createdAt.getTime(),
      isPerfect: r.isPerfect,
    })),
  };
}
