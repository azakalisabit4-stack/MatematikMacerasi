import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  gameQuestions,
  gameRecords,
  gameResults,
  gameSessions,
  profiles,
} from "@/lib/db/schema";
import { GAME_BY_KEY, NOTIFICATION_TYPE, type GameDef } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { addPoints, addXp, evaluateAchievements, getProfile } from "@/lib/progress";
import { addTaskProgress } from "@/lib/tasks";
import { notify } from "@/lib/notifications";
import type { GeneratedQuestion } from "./types";
import {
  generateBank,
  generateBoss,
  generateClimb,
  generateFastOps,
  generateMarket,
  generateMatching,
  generateMissingNumber,
  generateMultiplicationTable,
  generateSequence,
  generateTarget,
  generateTrack,
  prepareClimbStarts,
} from "./generators";

/* ------------------------------------------------------------------ TİPLER */

export interface PublicQuestion {
  index: number;
  prompt: string;
  options: string[];
  payload: Record<string, unknown>;
  total: number;
}

export interface SessionState {
  sessionId: string;
  gameKey: string;
  variant: string;
  status: string;
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  climbStep: number;
  currentIndex: number;
  questionCount: number;
  durationSec: number;
  timeLeftSec: number;
  serverTime: number;
  endsAt: number;
}

export interface GameSummary {
  sessionId: string;
  gameKey: string;
  gameName: string;
  variant: string;
  status: string;
  baseScore: number;
  timeBonus: number;
  score: number;
  correct: number;
  wrong: number;
  bestStreak: number;
  xpEarned: number;
  pointsEarned: number;
  isPerfect: boolean;
  isNewRecord: boolean;
  previousRecord: number;
  completedAll: boolean;
  level: number;
  leveledUp: boolean;
  totalPoints: number;
  unlockedAchievements: Array<{ key: string; name: string; iconKey: string; tier: string }>;
  completedTasks: Array<{ key: string; title: string }>;
}

const GRACE_MS = 2500;

/* ------------------------------------------------------------- YARDIMCILAR */

function gameDef(gameKey: string): GameDef {
  const def = GAME_BY_KEY[gameKey];
  if (!def) throw new ApiError("Böyle bir oyun yok.", 404);
  return def;
}

function resolveVariant(def: GameDef, variant?: string): string {
  if (!variant) return def.variants[0]?.key ?? "default";
  const found = def.variants.find((v) => v.key === variant);
  if (!found) throw new ApiError("Geçersiz oyun seçeneği.", 400);
  return found.key;
}

function pointsFor(def: GameDef, variantStep: number): { correct: number; wrong: number } {
  const correct = def.correctPoints === "step" ? variantStep : def.correctPoints;
  const wrong = def.wrongPenalty === "step2" ? variantStep * 2 : def.wrongPenalty;
  return { correct, wrong };
}

function variantStepOf(def: GameDef, variant: string): number {
  const v = def.variants.find((x) => x.key === variant);
  return v?.step ?? 0;
}

function buildQuestions(def: GameDef, variant: string, startValue: number): GeneratedQuestion[] {
  switch (def.renderer) {
    case "climb": {
      const step = variantStepOf(def, variant);
      return generateClimb(def.key, step, startValue, def.questionCount);
    }
    case "match":
      // Her grup 4 işlemden oluşur.
      return generateMatching(variant, Math.ceil(def.questionCount / 4));
    case "target":
      return generateTarget(variant, def.questionCount);
    case "track":
      return generateTrack(variant, def.questionCount);
    case "boss":
      return generateBoss(variant, def.questionCount);
    case "market":
      return def.key === "matematik-bankasi"
        ? generateBank(variant, def.questionCount)
        : generateMarket(variant, def.questionCount);
    case "quiz":
    default:
      if (def.key === "carpim-tablosu") return generateMultiplicationTable(variant);
      if (def.key === "hizli-islem") return generateFastOps(variant, def.questionCount);
      if (def.key === "eksik-sayi") return generateMissingNumber(variant, def.questionCount);
      if (def.key === "sayi-dizisi") return generateSequence(variant, def.questionCount);
      return generateFastOps(variant, def.questionCount);
  }
}

function stateOf(session: typeof gameSessions.$inferSelect): SessionState {
  const endsAt = session.expiresAt.getTime();
  return {
    sessionId: session.id,
    gameKey: session.gameKey,
    variant: session.variant,
    status: session.status,
    score: session.score,
    correct: session.correct,
    wrong: session.wrong,
    streak: session.streak,
    bestStreak: session.bestStreak,
    climbStep: session.climbStep,
    currentIndex: session.currentIndex,
    questionCount: session.questionCount,
    durationSec: session.durationSec,
    timeLeftSec: Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
    serverTime: Date.now(),
    endsAt,
  };
}

function loadSession(userId: string, sessionId: string) {
  const rows = db
    .select()
    .from(gameSessions)
    .where(and(eq(gameSessions.id, sessionId), eq(gameSessions.userId, userId)))
    .limit(1)
    .all();
  const session = rows[0];
  if (!session) throw new ApiError("Oyun oturumu bulunamadı.", 404);
  return session;
}

/* -------------------------------------------------------------- HAZIRLIK */

/** Tırmanma oyunlarında öğrenciye sunulacak 4 başlangıç seçeneği. */
export function prepareGame(gameKey: string, variantKey?: string) {
  const def = gameDef(gameKey);
  const variant = resolveVariant(def, variantKey);

  if (def.renderer === "climb") {
    const step = variantStepOf(def, variant);
    const prepared = prepareClimbStarts(def.key, step, def.questionCount);
    return {
      needsStart: true,
      step,
      startOptions: prepared.startOptions,
      variant,
      game: def,
    };
  }
  return { needsStart: false, step: 0, startOptions: [] as number[], variant, game: def };
}

/* ------------------------------------------------------------ OYUN BAŞLAT */

export function startGame(
  userId: string,
  input: { gameKey: string; variant?: string; startValue?: number },
): { state: SessionState; question: PublicQuestion } {
  const def = gameDef(input.gameKey);
  const variant = resolveVariant(def, input.variant);

  const profile = getProfile(userId);
  if (profile.level < def.minLevel) {
    throw new ApiError(`Bu oyun ${def.minLevel}. seviyede açılıyor.`, 403);
  }

  let startValue = 0;
  if (def.renderer === "climb") {
    const step = variantStepOf(def, variant);
    const allowed = prepareClimbStarts(def.key, step, def.questionCount);
    const requested = Number(input.startValue);
    // Sunucu, istemciden gelen başlangıcın kurallara uygun olduğunu doğrular.
    const backwards = def.key.startsWith("ritmik-geri");
    const valid = backwards
      ? requested >= step * def.questionCount && requested <= step * def.questionCount + 9
      : def.key.endsWith("-2")
        ? requested >= 3 && requested <= 99 && requested !== step && requested % step !== 0
        : requested >= 1 && requested <= 9 && requested !== step;
    startValue = valid ? requested : allowed.startOptions[0];
  }

  // Kullanıcının yarım kalmış oturumlarını kapat
  db.update(gameSessions)
    .set({ status: "ABANDONED", endedAt: new Date() })
    .where(and(eq(gameSessions.userId, userId), eq(gameSessions.status, "ACTIVE")))
    .run();

  const questions = buildQuestions(def, variant, startValue);
  const questionCount = Math.min(def.questionCount, questions.length);
  if (questionCount === 0) throw new ApiError("Soru üretilemedi, lütfen tekrar dene.", 500);

  const sessionId = createId("gs_");
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + def.durationSec * 1000 + GRACE_MS);

  db.transaction((tx) => {
    tx.insert(gameSessions)
      .values({
        id: sessionId,
        userId,
        gameKey: def.key,
        variant,
        status: "ACTIVE",
        durationSec: def.durationSec,
        questionCount,
        startedAt,
        expiresAt,
        climbStep: 0,
      })
      .run();

    for (let i = 0; i < questionCount; i++) {
      const q = questions[i];
      tx.insert(gameQuestions)
        .values({
          id: createId("gq_"),
          sessionId,
          idx: i,
          prompt: q.prompt,
          payload: JSON.stringify({ ...q.payload, opType: q.opType }),
          options: JSON.stringify(q.options),
          correctIndex: q.correctIndex,
        })
        .run();
    }
  });

  const session = loadSession(userId, sessionId);
  return { state: stateOf(session), question: publicQuestion(sessionId, 0, questionCount) };
}

/* ------------------------------------------------------------ SORU GETİR */

function publicQuestion(sessionId: string, index: number, total: number): PublicQuestion {
  const rows = db
    .select()
    .from(gameQuestions)
    .where(and(eq(gameQuestions.sessionId, sessionId), eq(gameQuestions.idx, index)))
    .limit(1)
    .all();
  const q = rows[0];
  if (!q) throw new ApiError("Soru bulunamadı.", 404);

  if (!q.servedAt) {
    db.update(gameQuestions)
      .set({ servedAt: new Date() })
      .where(eq(gameQuestions.id, q.id))
      .run();
  }

  const payload = JSON.parse(q.payload) as Record<string, unknown>;
  delete payload.answer; // güvenlik: cevap asla istemciye gitmez
  return {
    index: q.idx,
    prompt: q.prompt,
    options: JSON.parse(q.options) as string[],
    payload,
    total,
  };
}

export function currentQuestion(userId: string, sessionId: string) {
  const session = loadSession(userId, sessionId);
  if (session.status !== "ACTIVE") throw new ApiError("Bu oyun sona ermiş.", 410);
  if (session.currentIndex >= session.questionCount)
    throw new ApiError("Tüm sorular tamamlandı.", 410);
  return {
    state: stateOf(session),
    question: publicQuestion(sessionId, session.currentIndex, session.questionCount),
  };
}

/* ----------------------------------------------------------- CEVAP GÖNDER */

export interface AnswerOutcome {
  isCorrect: boolean;
  correctIndex: number;
  pointsDelta: number;
  state: SessionState;
  nextQuestion: PublicQuestion | null;
  finished: boolean;
  summary: GameSummary | null;
}

/**
 * Cevap doğrulaması TAMAMEN sunucuda yapılır.
 * İstemciden yalnızca "hangi şıkkı seçtim" bilgisi gelir; puan, XP veya sonuç
 * istemciden ASLA kabul edilmez.
 */
export function submitAnswer(
  userId: string,
  sessionId: string,
  questionIndex: number,
  answerIndex: number,
): AnswerOutcome {
  const session = loadSession(userId, sessionId);
  if (session.status !== "ACTIVE") throw new ApiError("Bu oyun sona ermiş.", 410);

  // Süre kontrolü — sunucu saatiyle
  if (Date.now() > session.expiresAt.getTime()) {
    const summary = finishGame(userId, sessionId, "TIMEOUT");
    return {
      isCorrect: false,
      correctIndex: -1,
      pointsDelta: 0,
      state: { ...stateOf(loadSession(userId, sessionId)), timeLeftSec: 0 },
      nextQuestion: null,
      finished: true,
      summary,
    };
  }

  if (questionIndex !== session.currentIndex)
    throw new ApiError("Soru sırası uyuşmuyor.", 409);

  const rows = db
    .select()
    .from(gameQuestions)
    .where(and(eq(gameQuestions.sessionId, sessionId), eq(gameQuestions.idx, questionIndex)))
    .limit(1)
    .all();
  const q = rows[0];
  if (!q) throw new ApiError("Soru bulunamadı.", 404);
  if (q.answerIndex !== null) throw new ApiError("Bu soru zaten cevaplanmış.", 409);

  const def = gameDef(session.gameKey);
  const step = variantStepOf(def, session.variant);
  const { correct: gain, wrong: penalty } = pointsFor(def, step);

  const isCorrect = Number(answerIndex) === q.correctIndex;
  const beforeScore = session.score;
  const nextScore = Math.max(0, beforeScore + (isCorrect ? gain : -penalty));
  const pointsDelta = nextScore - beforeScore;

  const nextStreak = isCorrect ? session.streak + 1 : 0;
  const nextBestStreak = Math.max(session.bestStreak, nextStreak);
  const nextClimb = isCorrect
    ? session.climbStep + 1
    : Math.max(0, session.climbStep - def.fallSteps);

  const msTaken = q.servedAt ? Date.now() - q.servedAt.getTime() : 0;

  db.transaction((tx) => {
    tx.update(gameQuestions)
      .set({
        answerIndex: Number(answerIndex),
        isCorrect,
        answeredAt: new Date(),
        msTaken,
        awardedPoints: pointsDelta,
      })
      .where(eq(gameQuestions.id, q.id))
      .run();

    tx.update(gameSessions)
      .set({
        score: nextScore,
        correct: session.correct + (isCorrect ? 1 : 0),
        wrong: session.wrong + (isCorrect ? 0 : 1),
        streak: nextStreak,
        bestStreak: nextBestStreak,
        climbStep: nextClimb,
        currentIndex: session.currentIndex + 1,
      })
      .where(eq(gameSessions.id, sessionId))
      .run();
  });

  const updated = loadSession(userId, sessionId);
  const completedAll = updated.currentIndex >= updated.questionCount;

  if (completedAll) {
    const summary = finishGame(userId, sessionId, "FINISHED");
    return {
      isCorrect,
      correctIndex: q.correctIndex,
      pointsDelta,
      state: stateOf(loadSession(userId, sessionId)),
      nextQuestion: null,
      finished: true,
      summary,
    };
  }

  return {
    isCorrect,
    correctIndex: q.correctIndex,
    pointsDelta,
    state: stateOf(updated),
    nextQuestion: publicQuestion(sessionId, updated.currentIndex, updated.questionCount),
    finished: false,
    summary: null,
  };
}

/* ----------------------------------------------------------- OYUNU BİTİR */

/**
 * Oyunu sonlandırır ve ödülleri dağıtır.
 * Öğrenci oyunu istediği an bırakabilir; o ana kadar kazandığı puan KAYBOLMAZ.
 * Süre bonusu yalnızca tüm sorular bitirildiğinde verilir (erken çıkışta değil).
 */
export function finishGame(
  userId: string,
  sessionId: string,
  reason: "FINISHED" | "ABANDONED" | "TIMEOUT" = "FINISHED",
): GameSummary {
  const session = loadSession(userId, sessionId);
  const def = gameDef(session.gameKey);

  if (session.status !== "ACTIVE") {
    const existing = db
      .select()
      .from(gameResults)
      .where(eq(gameResults.sessionId, sessionId))
      .limit(1)
      .all()[0];
    if (existing) {
      const profile = getProfile(userId);
      return {
        sessionId,
        gameKey: session.gameKey,
        gameName: def.name,
        variant: session.variant,
        status: session.status,
        baseScore: existing.baseScore,
        timeBonus: existing.timeBonus,
        score: existing.score,
        correct: existing.correct,
        wrong: existing.wrong,
        bestStreak: existing.bestStreak,
        xpEarned: existing.xpEarned,
        pointsEarned: existing.pointsEarned,
        isPerfect: existing.isPerfect,
        isNewRecord: existing.isNewRecord,
        previousRecord: 0,
        completedAll: existing.correct + existing.wrong >= session.questionCount,
        level: profile.level,
        leveledUp: false,
        totalPoints: profile.totalPoints,
        unlockedAchievements: [],
        completedTasks: [],
      };
    }
  }

  const completedAll = session.currentIndex >= session.questionCount;
  const answered = session.correct + session.wrong;
  const timeLeft = Math.max(0, Math.ceil((session.expiresAt.getTime() - Date.now() - GRACE_MS) / 1000));
  const timeBonus = completedAll && reason === "FINISHED" ? timeLeft : 0;

  const baseScore = session.score;
  const finalScore = Math.max(0, baseScore + timeBonus);
  const isPerfect = answered > 0 && session.wrong === 0 && completedAll;

  // ---- Rekor ----
  const recordRows = db
    .select()
    .from(gameRecords)
    .where(
      and(
        eq(gameRecords.userId, userId),
        eq(gameRecords.gameKey, session.gameKey),
        eq(gameRecords.variant, session.variant),
      ),
    )
    .limit(1)
    .all();
  const record = recordRows[0];
  const previousRecord = record?.bestScore ?? 0;
  const isNewRecord = finalScore > previousRecord;
  const durationMs = Date.now() - session.startedAt.getTime();

  // ---- XP ----
  const xpEarned =
    def.xpPerCorrect * session.correct +
    (completedAll ? def.xpCompletion : 0) +
    (isPerfect ? Math.round(def.xpCompletion * 0.5) : 0) +
    timeBonus;

  db.transaction((tx) => {
    tx.update(gameSessions)
      .set({
        status: reason === "FINISHED" ? "FINISHED" : reason,
        endedAt: new Date(),
        timeLeftSec: timeLeft,
        score: finalScore,
        xpAwarded: xpEarned,
        pointsAwarded: finalScore,
      })
      .where(eq(gameSessions.id, sessionId))
      .run();

    tx.insert(gameResults)
      .values({
        id: createId("gr_"),
        sessionId,
        userId,
        gameKey: session.gameKey,
        variant: session.variant,
        score: finalScore,
        baseScore,
        timeBonus,
        correct: session.correct,
        wrong: session.wrong,
        bestStreak: session.bestStreak,
        durationMs,
        xpEarned,
        pointsEarned: finalScore,
        isNewRecord,
        isPerfect,
      })
      .onConflictDoNothing()
      .run();

    if (record) {
      tx.update(gameRecords)
        .set({
          bestScore: Math.max(record.bestScore, finalScore),
          bestCorrect: Math.max(record.bestCorrect, session.correct),
          bestTimeBonus: Math.max(record.bestTimeBonus, timeBonus),
          fastestMs:
            completedAll && (record.fastestMs === null || durationMs < record.fastestMs)
              ? durationMs
              : record.fastestMs,
          playCount: record.playCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(gameRecords.id, record.id))
        .run();
    } else {
      tx.insert(gameRecords)
        .values({
          id: createId("rec_"),
          userId,
          gameKey: session.gameKey,
          variant: session.variant,
          bestScore: finalScore,
          bestCorrect: session.correct,
          bestTimeBonus: timeBonus,
          fastestMs: completedAll ? durationMs : null,
          playCount: 1,
        })
        .run();
    }
  });

  // ---- Profil istatistikleri ----
  const before = getProfile(userId);
  db.update(profiles)
    .set({
      gamesPlayed: before.gamesPlayed + 1,
      totalCorrect: before.totalCorrect + session.correct,
      totalWrong: before.totalWrong + session.wrong,
      bestTimeBonus: Math.max(before.bestTimeBonus, timeBonus),
      perfectGames: before.perfectGames + (isPerfect ? 1 : 0),
      bestAnswerStreak: Math.max(before.bestAnswerStreak, session.bestStreak),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId))
    .run();

  const totalPoints = addPoints(userId, finalScore);
  const xpResult = addXp(userId, xpEarned);

  // ---- Günlük görevler ----
  const opCounts = db
    .select({ payload: gameQuestions.payload, isCorrect: gameQuestions.isCorrect })
    .from(gameQuestions)
    .where(eq(gameQuestions.sessionId, sessionId))
    .all();

  let addCorrect = 0;
  let subCorrect = 0;
  let mulCorrect = 0;
  for (const row of opCounts) {
    if (!row.isCorrect) continue;
    let opType = "mixed";
    try {
      opType = (JSON.parse(row.payload).opType as string) ?? "mixed";
    } catch {
      /* yoksay */
    }
    if (opType === "add") addCorrect++;
    else if (opType === "sub") subCorrect++;
    else if (opType === "mul") mulCorrect++;
  }

  const completedTasks = [
    ...addTaskProgress(userId, {
      correct_any: session.correct,
      correct_add: addCorrect,
      correct_sub: subCorrect,
      correct_mul: mulCorrect,
      games_played: 1,
      perfect_game: isPerfect ? 1 : 0,
    }),
    ...addTaskProgress(userId, { answer_streak: session.bestStreak, time_bonus: timeBonus }, "max"),
  ];

  // ---- Başarımlar ----
  const unlocked = evaluateAchievements(userId, {
    climbCompleted: def.renderer === "climb" && completedAll,
    perfectSeven: def.key === "ritmik-ileri-1" && session.variant === "7" && isPerfect,
    perfectMulTable: def.key === "carpim-tablosu" && isPerfect,
    bossDefeated: def.key === "boss-savasi" && completedAll && session.correct >= Math.ceil(session.questionCount * 0.6),
  });

  if (isNewRecord && previousRecord > 0) {
    notify({
      userId,
      type: NOTIFICATION_TYPE.RECORD,
      title: "Yeni rekor!",
      body: `${def.shortName} oyununda ${finalScore} puanla rekorunu kırdın.`,
      iconKey: "trophy",
      link: "/profil",
      meta: { gameKey: def.key, score: finalScore },
    });
  }

  const profileAfter = getProfile(userId);

  return {
    sessionId,
    gameKey: session.gameKey,
    gameName: def.name,
    variant: session.variant,
    status: reason,
    baseScore,
    timeBonus,
    score: finalScore,
    correct: session.correct,
    wrong: session.wrong,
    bestStreak: session.bestStreak,
    xpEarned,
    pointsEarned: finalScore,
    isPerfect,
    isNewRecord,
    previousRecord,
    completedAll,
    level: profileAfter.level,
    leveledUp: xpResult.leveledUp,
    totalPoints,
    unlockedAchievements: unlocked.map((u) => ({
      key: u.key,
      name: u.name,
      iconKey: u.iconKey,
      tier: u.tier,
    })),
    completedTasks: completedTasks.map((t) => ({ key: t.key, title: t.title })),
  };
}

/* ------------------------------------------------------------- REKORLAR */

export function listRecords(userId: string) {
  const rows = db.select().from(gameRecords).where(eq(gameRecords.userId, userId)).all();
  return rows
    .map((r) => {
      const def = GAME_BY_KEY[r.gameKey];
      const variantLabel = def?.variants.find((v) => v.key === r.variant)?.label ?? r.variant;
      return {
        gameKey: r.gameKey,
        gameName: def?.shortName ?? r.gameKey,
        iconKey: def?.iconKey ?? "game",
        variant: r.variant,
        variantLabel,
        bestScore: r.bestScore,
        bestCorrect: r.bestCorrect,
        bestTimeBonus: r.bestTimeBonus,
        fastestMs: r.fastestMs,
        playCount: r.playCount,
        theme: def?.theme,
      };
    })
    .sort((a, b) => b.bestScore - a.bestScore);
}

export function recentResults(userId: string, limit = 10) {
  return db
    .select()
    .from(gameResults)
    .where(eq(gameResults.userId, userId))
    .orderBy(sql`${gameResults.createdAt} desc`)
    .limit(limit)
    .all()
    .map((r) => ({
      ...r,
      gameName: GAME_BY_KEY[r.gameKey]?.shortName ?? r.gameKey,
      createdAt: r.createdAt.getTime(),
    }));
}

export function activeSessionFor(userId: string) {
  const rows = db
    .select()
    .from(gameSessions)
    .where(and(eq(gameSessions.userId, userId), eq(gameSessions.status, "ACTIVE")))
    .orderBy(asc(gameSessions.startedAt))
    .all();
  return rows[0] ?? null;
}
