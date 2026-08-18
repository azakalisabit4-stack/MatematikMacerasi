/**
 * Matematik Macerası — Veri Modeli (Drizzle ORM / SQLite)
 * -----------------------------------------------------------------------------
 * Neden SQLite + Drizzle?
 *  - Sıfır kurulum: `npm install && npm run dev` ile gerçek bir veritabanı hazır.
 *  - Tek dosya (data/matematik.db) → yedeklemesi, taşıması, deploy etmesi kolay.
 *  - 30-100 eşzamanlı kullanıcı için fazlasıyla yeterli (WAL modu açık).
 *  - Drizzle saf TypeScript'tir; native binary indirmesi/derlemesi gerektirmez,
 *    şema tipleri doğrudan sorgulara yansır (type-safe).
 *  - İleride PostgreSQL'e geçiş: drizzle-orm/pg-core'a taşıma tek dosyalık iştir.
 *
 * Puan türleri KESİNLİKLE ayrıdır:
 *   profiles.xp / profiles.level      → yalnızca TEK KİŞİLİK oyunlardan
 *   profiles.totalPoints              → tek kişilik oyunlardan (GLOBAL PUAN SIRALAMASI)
 *   profiles.leaguePoints / leagueKey → yalnızca DÜELLOLARDAN (GLOBAL LİG SIRALAMASI)
 */

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = () => sql`(unixepoch() * 1000)`;

/* ==========================================================================
 * KULLANICI & KİMLİK
 * ======================================================================== */

export const roles = sqliteTable("roles", {
  key: text("key").primaryKey(), // STUDENT | HOCAEFENDI
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
});

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    emailLower: text("email_lower").notNull(),
    username: text("username").notNull(),
    usernameLower: text("username_lower").notNull(),
    passwordHash: text("password_hash").notNull(),
    roleKey: text("role_key").notNull().default("STUDENT"),
    avatarKey: text("avatar_key").notNull().default("avatar-01"),
    frameKey: text("frame_key").notNull().default("frame-none"),
    titleKey: text("title_key"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    /** Hocaefendi'ye özel: profilinde puan/lig görünsün mü? Global sıralamada YİNE DE görünmez. */
    showStatsPublicly: integer("show_stats_publicly", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [
    uniqueIndex("users_email_lower_uq").on(t.emailLower),
    uniqueIndex("users_username_lower_uq").on(t.usernameLower),
    index("users_role_idx").on(t.roleKey),
    index("users_last_seen_idx").on(t.lastSeenAt),
  ],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("auth_sessions_token_uq").on(t.tokenHash),
    index("auth_sessions_user_idx").on(t.userId),
  ],
);

/* ==========================================================================
 * PROFİL / İLERLEME
 * ======================================================================== */

export const profiles = sqliteTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  // --- Tek kişilik ilerleme ---
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  totalPoints: integer("total_points").notNull().default(0),
  coins: integer("coins").notNull().default(0),

  // --- Çok oyunculu ilerleme (düello) ---
  leaguePoints: integer("league_points").notNull().default(0),
  leagueKey: text("league_key").notNull().default("pirinc"),
  peakLeaguePoints: integer("peak_league_points").notNull().default(0),

  duelWins: integer("duel_wins").notNull().default(0),
  duelLosses: integer("duel_losses").notNull().default(0),
  duelDraws: integer("duel_draws").notNull().default(0),
  duelStreak: integer("duel_streak").notNull().default(0),
  bestDuelStreak: integer("best_duel_streak").notNull().default(0),

  // --- İstatistik ---
  gamesPlayed: integer("games_played").notNull().default(0),
  totalCorrect: integer("total_correct").notNull().default(0),
  totalWrong: integer("total_wrong").notNull().default(0),
  bestTimeBonus: integer("best_time_bonus").notNull().default(0),
  perfectGames: integer("perfect_games").notNull().default(0),
  bestAnswerStreak: integer("best_answer_streak").notNull().default(0),

  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
});

/* ==========================================================================
 * OYUN MOTORU
 * ======================================================================== */

export const gameSessions = sqliteTable(
  "game_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    gameKey: text("game_key").notNull(),
    variant: text("variant").notNull().default("default"),
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | FINISHED | ABANDONED | TIMEOUT
    durationSec: integer("duration_sec").notNull(),
    questionCount: integer("question_count").notNull(),
    currentIndex: integer("current_index").notNull().default(0),
    score: integer("score").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    wrong: integer("wrong").notNull().default(0),
    streak: integer("streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    climbStep: integer("climb_step").notNull().default(0),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().default(now()),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    timeLeftSec: integer("time_left_sec").notNull().default(0),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    pointsAwarded: integer("points_awarded").notNull().default(0),
  },
  (t) => [
    index("game_sessions_user_idx").on(t.userId, t.gameKey),
    index("game_sessions_status_idx").on(t.status),
  ],
);

export const gameQuestions = sqliteTable(
  "game_questions",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    prompt: text("prompt").notNull(),
    /** JSON — oyuna özel görsel/mantıksal veri */
    payload: text("payload").notNull().default("{}"),
    /** JSON — seçenek listesi (string[]) */
    options: text("options").notNull(),
    correctIndex: integer("correct_index").notNull(),
    answerIndex: integer("answer_index"),
    isCorrect: integer("is_correct", { mode: "boolean" }),
    answeredAt: integer("answered_at", { mode: "timestamp_ms" }),
    servedAt: integer("served_at", { mode: "timestamp_ms" }),
    msTaken: integer("ms_taken"),
    awardedPoints: integer("awarded_points").notNull().default(0),
  },
  (t) => [uniqueIndex("game_questions_session_idx_uq").on(t.sessionId, t.idx)],
);

export const gameResults = sqliteTable(
  "game_results",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    gameKey: text("game_key").notNull(),
    variant: text("variant").notNull(),
    score: integer("score").notNull(),
    baseScore: integer("base_score").notNull(),
    timeBonus: integer("time_bonus").notNull(),
    correct: integer("correct").notNull(),
    wrong: integer("wrong").notNull(),
    bestStreak: integer("best_streak").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    pointsEarned: integer("points_earned").notNull().default(0),
    isNewRecord: integer("is_new_record", { mode: "boolean" }).notNull().default(false),
    isPerfect: integer("is_perfect", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [
    uniqueIndex("game_results_session_uq").on(t.sessionId),
    index("game_results_user_idx").on(t.userId, t.gameKey),
    index("game_results_leaderboard_idx").on(t.gameKey, t.score),
  ],
);

export const gameRecords = sqliteTable(
  "game_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    gameKey: text("game_key").notNull(),
    variant: text("variant").notNull(),
    bestScore: integer("best_score").notNull().default(0),
    bestCorrect: integer("best_correct").notNull().default(0),
    fastestMs: integer("fastest_ms"),
    bestTimeBonus: integer("best_time_bonus").notNull().default(0),
    playCount: integer("play_count").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [
    uniqueIndex("game_records_uq").on(t.userId, t.gameKey, t.variant),
    index("game_records_board_idx").on(t.gameKey, t.bestScore),
  ],
);

/* ==========================================================================
 * BAŞARIMLAR
 * ======================================================================== */

export const achievements = sqliteTable("achievements", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconKey: text("icon_key").notNull(),
  category: text("category").notNull(), // GAME | DUEL | STREAK | PROGRESS | SPECIAL
  tier: text("tier").notNull().default("bronze"),
  target: integer("target").notNull().default(1),
  rewardXp: integer("reward_xp").notNull().default(0),
  rewardCoins: integer("reward_coins").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const userAchievements = sqliteTable(
  "user_achievements",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    achievementKey: text("achievement_key").notNull().references(() => achievements.key, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    unlockedAt: integer("unlocked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.achievementKey] })],
);

/* ==========================================================================
 * GÜNLÜK GÖREVLER
 * ======================================================================== */

export const dailyTasks = sqliteTable("daily_tasks", {
  key: text("key").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  metric: text("metric").notNull(),
  target: integer("target").notNull(),
  rewardXp: integer("reward_xp").notNull().default(0),
  rewardPoints: integer("reward_points").notNull().default(0),
  rewardCoins: integer("reward_coins").notNull().default(0),
  iconKey: text("icon_key").notNull().default("target"),
  weight: integer("weight").notNull().default(1),
});

export const userDailyTasks = sqliteTable(
  "user_daily_tasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    taskKey: text("task_key").notNull().references(() => dailyTasks.key, { onDelete: "cascade" }),
    dayKey: text("day_key").notNull(), // YYYY-MM-DD (Europe/Istanbul)
    progress: integer("progress").notNull().default(0),
    target: integer("target").notNull(),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    claimedAt: integer("claimed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [
    uniqueIndex("user_daily_tasks_uq").on(t.userId, t.taskKey, t.dayKey),
    index("user_daily_tasks_day_idx").on(t.userId, t.dayKey),
  ],
);

/* ==========================================================================
 * DÜELLO
 * ======================================================================== */

export const duels = sqliteTable(
  "duels",
  {
    id: text("id").primaryKey(),
    mode: text("mode").notNull(), // POINTS_SWAP | NO_SWAP
    status: text("status").notNull().default("PENDING"), // PENDING | ACTIVE | FINISHED | DECLINED | CANCELLED | EXPIRED
    challengerId: text("challenger_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    opponentId: text("opponent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    gameKey: text("game_key").notNull().default("duello-karisik"),
    questionCount: integer("question_count").notNull().default(10),
    durationSec: integer("duration_sec").notNull().default(90),
    /** JSON — iki oyuncuya da AYNI sırayla gösterilen soru listesi; cevaplar sunucuda kalır */
    questionsJson: text("questions_json").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    winnerId: text("winner_id"),
    isDraw: integer("is_draw", { mode: "boolean" }).notNull().default(false),
    pointsDelta: integer("points_delta").notNull().default(0),
    seasonId: text("season_id"),
  },
  (t) => [
    index("duels_challenger_idx").on(t.challengerId, t.status),
    index("duels_opponent_idx").on(t.opponentId, t.status),
    index("duels_status_idx").on(t.status),
  ],
);

export const duelPlayers = sqliteTable(
  "duel_players",
  {
    id: text("id").primaryKey(),
    duelId: text("duel_id").notNull().references(() => duels.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    wrong: integer("wrong").notNull().default(0),
    currentIndex: integer("current_index").notNull().default(0),
    totalMs: integer("total_ms").notNull().default(0),
    ready: integer("ready", { mode: "boolean" }).notNull().default(false),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    leaguePointsBefore: integer("league_points_before").notNull().default(0),
    leaguePointsAfter: integer("league_points_after").notNull().default(0),
    leaguePointsDelta: integer("league_points_delta").notNull().default(0),
  },
  (t) => [uniqueIndex("duel_players_uq").on(t.duelId, t.userId)],
);

export const duelAnswers = sqliteTable(
  "duel_answers",
  {
    id: text("id").primaryKey(),
    duelId: text("duel_id").notNull().references(() => duels.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questionIndex: integer("question_index").notNull(),
    answerIndex: integer("answer_index").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    msTaken: integer("ms_taken").notNull(),
    serverTs: integer("server_ts", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [
    uniqueIndex("duel_answers_uq").on(t.duelId, t.userId, t.questionIndex),
    index("duel_answers_duel_idx").on(t.duelId),
  ],
);

/* ==========================================================================
 * LİG & SEZON
 * ======================================================================== */

export const leagueSeasons = sqliteTable("league_seasons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
});

export const leaguePointEvents = sqliteTable(
  "league_point_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    seasonId: text("season_id"),
    delta: integer("delta").notNull(),
    balance: integer("balance").notNull(),
    reason: text("reason").notNull(),
    duelId: text("duel_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [index("league_events_user_idx").on(t.userId, t.createdAt)],
);

/* ==========================================================================
 * SOSYAL
 * ======================================================================== */

export const friendships = sqliteTable(
  "friendships",
  {
    id: text("id").primaryKey(),
    requesterId: text("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    addresseeId: text("addressee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("PENDING"), // PENDING | ACCEPTED | DECLINED | BLOCKED
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
    respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    uniqueIndex("friendships_uq").on(t.requesterId, t.addresseeId),
    index("friendships_addressee_idx").on(t.addresseeId, t.status),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    iconKey: text("icon_key").notNull().default("bell"),
    link: text("link"),
    meta: text("meta").notNull().default("{}"),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [
    index("notifications_user_read_idx").on(t.userId, t.readAt),
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
  ],
);

/* ==========================================================================
 * MAĞAZA
 * ======================================================================== */

export const shopItems = sqliteTable("shop_items", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // AVATAR | FRAME | TITLE
  price: integer("price").notNull().default(0),
  minLevel: integer("min_level").notNull().default(1),
  assetKey: text("asset_key").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const userItems = sqliteTable(
  "user_items",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull().references(() => shopItems.key, { onDelete: "cascade" }),
    acquiredAt: integer("acquired_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemKey] })],
);

/* ==========================================================================
 * MODERASYON & YÖNETİM
 * ======================================================================== */

export const bannedWords = sqliteTable(
  "banned_words",
  {
    id: text("id").primaryKey(),
    word: text("word").notNull(),
    /** Unicode/leetspeak normalize edilmiş biçim — filtre bunun üzerinden çalışır */
    normalized: text("normalized").notNull(),
    createdById: text("created_by_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [uniqueIndex("banned_words_uq").on(t.normalized)],
);

export const reservedUsernames = sqliteTable(
  "reserved_usernames",
  {
    id: text("id").primaryKey(),
    usernameLower: text("username_lower").notNull(),
    normalized: text("normalized").notNull(),
    reason: text("reason").notNull().default("MODERATION"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [
    uniqueIndex("reserved_usernames_uq").on(t.usernameLower),
    index("reserved_usernames_norm_idx").on(t.normalized),
  ],
);

export const adminActions = sqliteTable(
  "admin_actions",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetUserId: text("target_user_id"),
    action: text("action").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => [index("admin_actions_idx").on(t.adminId, t.createdAt)],
);

export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
});

/* ==========================================================================
 * TİPLER
 * ======================================================================== */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type GameSessionRow = typeof gameSessions.$inferSelect;
export type GameQuestionRow = typeof gameQuestions.$inferSelect;
export type DuelRow = typeof duels.$inferSelect;
export type DuelPlayerRow = typeof duelPlayers.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type AchievementRow = typeof achievements.$inferSelect;
export type UserAchievementRow = typeof userAchievements.$inferSelect;
export type DailyTaskRow = typeof dailyTasks.$inferSelect;
export type UserDailyTaskRow = typeof userDailyTasks.$inferSelect;
export type GameRecordRow = typeof gameRecords.$inferSelect;
export type ShopItemRow = typeof shopItems.$inferSelect;
