import "server-only";

import { LEAGUE_BY_KEY, levelFromXp, leagueForPoints } from "@/lib/constants";
import { getProfile } from "@/lib/progress";
import { listTodayTasks } from "@/lib/tasks";
import { listFriends, onlineStudents } from "@/lib/social";
import { unreadCount } from "@/lib/notifications";
import { myRanks } from "@/lib/leaderboards";
import { activeSessionFor } from "@/lib/games/engine";
import { activeDuelFor, pendingInvites } from "@/lib/duels";
import type { SessionUser } from "@/lib/auth/session";

export function buildSummary(user: SessionUser) {
  const profile = getProfile(user.id);
  const level = levelFromXp(profile.xp);
  const league = leagueForPoints(profile.leaguePoints);
  const nextLeague = LEAGUE_BY_KEY[league.key];
  const ranks = myRanks(user.id);
  const active = activeSessionFor(user.id);
  const duel = activeDuelFor(user.id);

  return {
    user: {
      id: user.id,
      username: user.username,
      roleKey: user.roleKey,
      avatarKey: user.avatarKey,
      frameKey: user.frameKey,
      titleKey: user.titleKey,
      showStatsPublicly: user.showStatsPublicly,
    },
    progress: {
      xp: profile.xp,
      level: level.level,
      xpCurrent: level.currentXp,
      xpRequired: level.requiredXp,
      xpProgress: level.progress,
      totalPoints: profile.totalPoints,
      coins: profile.coins,
      leagueKey: league.key,
      leagueName: league.name,
      leaguePoints: profile.leaguePoints,
      leagueMin: nextLeague?.min ?? 0,
      leagueMax: nextLeague?.max ?? null,
      duelWins: profile.duelWins,
      duelLosses: profile.duelLosses,
      duelStreak: profile.duelStreak,
      bestDuelStreak: profile.bestDuelStreak,
      gamesPlayed: profile.gamesPlayed,
      perfectGames: profile.perfectGames,
      bestAnswerStreak: profile.bestAnswerStreak,
    },
    ranks,
    tasks: listTodayTasks(user.id),
    friends: listFriends(user.id).slice(0, 8),
    onlineNow: onlineStudents(user.id, 12),
    unread: unreadCount(user.id),
    duelInvites: pendingInvites(user.id).length,
    activeSession: active
      ? { sessionId: active.id, gameKey: active.gameKey, variant: active.variant }
      : null,
    activeDuel: duel ? { duelId: duel.id } : null,
  };
}

export type Summary = ReturnType<typeof buildSummary>;
