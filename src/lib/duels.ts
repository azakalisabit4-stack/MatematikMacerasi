import "server-only";

import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  duelAnswers,
  duelPlayers,
  duels,
  leagueSeasons,
  profiles,
  users,
} from "@/lib/db/schema";
import { ApiError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import {
  DUEL_BASE_LEAGUE_POINTS,
  DUEL_CORRECT_POINTS,
  DUEL_DURATION_SEC,
  DUEL_INVITE_TTL_MS,
  DUEL_MAX_LEAGUE_POINTS,
  DUEL_MIN_LEAGUE_POINTS,
  DUEL_MODE,
  DUEL_QUESTION_COUNT,
  DUEL_SPEED_BONUS_MAX,
  DUEL_STATUS,
  LEAGUE_BY_KEY,
  NOTIFICATION_TYPE,
} from "@/lib/constants";
import { generateDuelQuestions } from "@/lib/games/generators";
import { applyLeagueDelta, evaluateAchievements, getProfile } from "@/lib/progress";
import { addTaskProgress } from "@/lib/tasks";
import { notify } from "@/lib/notifications";
import { publishToDuel, publishToUser } from "@/lib/realtime";

interface StoredQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  payload: Record<string, unknown>;
  opType: string;
}

const GRACE_MS = 3000;

/* --------------------------------------------------------------- YARDIM */

function loadDuel(duelId: string) {
  const rows = db.select().from(duels).where(eq(duels.id, duelId)).limit(1).all();
  const duel = rows[0];
  if (!duel) throw new ApiError("Düello bulunamadı.", 404);
  return duel;
}

function assertParticipant(duel: typeof duels.$inferSelect, userId: string) {
  if (duel.challengerId !== userId && duel.opponentId !== userId)
    throw new ApiError("Bu düelloya erişimin yok.", 403);
}

function playersOf(duelId: string) {
  return db
    .select({
      id: duelPlayers.id,
      duelId: duelPlayers.duelId,
      userId: duelPlayers.userId,
      score: duelPlayers.score,
      correct: duelPlayers.correct,
      wrong: duelPlayers.wrong,
      currentIndex: duelPlayers.currentIndex,
      totalMs: duelPlayers.totalMs,
      finishedAt: duelPlayers.finishedAt,
      leaguePointsDelta: duelPlayers.leaguePointsDelta,
      username: users.username,
      avatarKey: users.avatarKey,
      frameKey: users.frameKey,
      roleKey: users.roleKey,
    })
    .from(duelPlayers)
    .innerJoin(users, eq(users.id, duelPlayers.userId))
    .where(eq(duelPlayers.duelId, duelId))
    .all();
}

function activeSeasonId(): string | null {
  const s = db.select().from(leagueSeasons).where(eq(leagueSeasons.isActive, true)).limit(1).all();
  return s[0]?.id ?? null;
}

/* --------------------------------------------------------- DÜELLO OLUŞTUR */

export function createDuel(
  challengerId: string,
  opponentUsernameOrId: string,
  mode: string,
): { duelId: string } {
  const duelMode = mode === DUEL_MODE.NO_SWAP ? DUEL_MODE.NO_SWAP : DUEL_MODE.POINTS_SWAP;

  const target = db
    .select()
    .from(users)
    .where(
      or(
        eq(users.id, opponentUsernameOrId),
        eq(users.usernameLower, opponentUsernameOrId.toLocaleLowerCase("tr-TR")),
      ),
    )
    .limit(1)
    .all()[0];

  if (!target) throw new ApiError("Rakip bulunamadı.", 404);
  if (target.id === challengerId) throw new ApiError("Kendinle düello yapamazsın.", 400);
  if (!target.isActive) throw new ApiError("Bu kullanıcı şu anda düello kabul edemiyor.", 400);

  // Aynı ikili arasında bekleyen davet varsa yenisini açma
  const pending = db
    .select()
    .from(duels)
    .where(
      and(
        eq(duels.status, DUEL_STATUS.PENDING),
        or(
          and(eq(duels.challengerId, challengerId), eq(duels.opponentId, target.id)),
          and(eq(duels.challengerId, target.id), eq(duels.opponentId, challengerId)),
        ),
      ),
    )
    .all();
  if (pending.length > 0) throw new ApiError("Bu oyuncuyla zaten bekleyen bir düello var.", 409);

  const duelId = createId("duel_");
  db.insert(duels)
    .values({
      id: duelId,
      mode: duelMode,
      status: DUEL_STATUS.PENDING,
      challengerId,
      opponentId: target.id,
      questionCount: DUEL_QUESTION_COUNT,
      durationSec: DUEL_DURATION_SEC,
      expiresAt: new Date(Date.now() + DUEL_INVITE_TTL_MS),
      seasonId: activeSeasonId(),
    })
    .run();

  const challenger = db.select().from(users).where(eq(users.id, challengerId)).limit(1).all()[0];

  notify({
    userId: target.id,
    type: NOTIFICATION_TYPE.DUEL_INVITE,
    title: "Düello daveti!",
    body: `${challenger?.username ?? "Bir oyuncu"} sana ${
      duelMode === DUEL_MODE.POINTS_SWAP ? "puan takaslı" : "takassız"
    } düello teklif etti.`,
    iconKey: "swords",
    link: `/duello/${duelId}`,
    meta: { duelId, mode: duelMode },
  });
  publishToUser(target.id, { type: "duel:invite", payload: { duelId, mode: duelMode } });

  return { duelId };
}

/* ------------------------------------------------------------ KABUL / RED */

export function acceptDuel(userId: string, duelId: string) {
  const duel = loadDuel(duelId);
  if (duel.opponentId !== userId) throw new ApiError("Bu daveti yalnızca davet edilen kabul edebilir.", 403);
  if (duel.status !== DUEL_STATUS.PENDING) throw new ApiError("Bu davet artık geçerli değil.", 409);
  if (duel.expiresAt && duel.expiresAt.getTime() < Date.now()) {
    db.update(duels).set({ status: DUEL_STATUS.EXPIRED }).where(eq(duels.id, duelId)).run();
    throw new ApiError("Davetin süresi doldu.", 410);
  }

  const questions: StoredQuestion[] = generateDuelQuestions(duel.questionCount).map((q) => ({
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.correctIndex,
    payload: q.payload,
    opType: q.opType,
  }));

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + duel.durationSec * 1000 + GRACE_MS);

  db.transaction((tx) => {
    tx.update(duels)
      .set({
        status: DUEL_STATUS.ACTIVE,
        acceptedAt: startedAt,
        startedAt,
        expiresAt,
        questionsJson: JSON.stringify(questions),
      })
      .where(eq(duels.id, duelId))
      .run();

    for (const uid of [duel.challengerId, duel.opponentId]) {
      const p = getProfile(uid);
      tx.insert(duelPlayers)
        .values({
          id: createId("dp_"),
          duelId,
          userId: uid,
          leaguePointsBefore: p.leaguePoints,
          ready: true,
        })
        .onConflictDoNothing()
        .run();
    }
  });

  notify({
    userId: duel.challengerId,
    type: NOTIFICATION_TYPE.DUEL_ACCEPTED,
    title: "Düello başlıyor!",
    body: "Rakibin daveti kabul etti.",
    iconKey: "swords",
    link: `/duello/${duelId}`,
    meta: { duelId },
  });
  publishToUser(duel.challengerId, { type: "duel:update", payload: { duelId, status: "ACTIVE" } });
  publishToDuel(duelId, { type: "duel:update", payload: { duelId, status: "ACTIVE" } });

  return { duelId };
}

export function declineDuel(userId: string, duelId: string) {
  const duel = loadDuel(duelId);
  if (duel.opponentId !== userId) throw new ApiError("Bu daveti reddedemezsin.", 403);
  if (duel.status !== DUEL_STATUS.PENDING) throw new ApiError("Bu davet artık geçerli değil.", 409);
  db.update(duels).set({ status: DUEL_STATUS.DECLINED }).where(eq(duels.id, duelId)).run();
  publishToUser(duel.challengerId, { type: "duel:update", payload: { duelId, status: "DECLINED" } });
  return { ok: true };
}

export function cancelDuel(userId: string, duelId: string) {
  const duel = loadDuel(duelId);
  if (duel.challengerId !== userId) throw new ApiError("Bu daveti iptal edemezsin.", 403);
  if (duel.status !== DUEL_STATUS.PENDING) throw new ApiError("Bu davet artık geçerli değil.", 409);
  db.update(duels).set({ status: DUEL_STATUS.CANCELLED }).where(eq(duels.id, duelId)).run();
  publishToUser(duel.opponentId, { type: "duel:update", payload: { duelId, status: "CANCELLED" } });
  return { ok: true };
}

/* --------------------------------------------------------------- DURUM */

export function duelState(userId: string, duelId: string) {
  const duel = loadDuel(duelId);
  assertParticipant(duel, userId);

  if (
    duel.status === DUEL_STATUS.ACTIVE &&
    duel.expiresAt &&
    Date.now() > duel.expiresAt.getTime()
  ) {
    finalizeDuel(duelId);
  }

  const fresh = loadDuel(duelId);
  const players = playersOf(duelId);
  const me = players.find((p) => p.userId === userId) ?? null;
  const rival = players.find((p) => p.userId !== userId) ?? null;

  const questions = fresh.questionsJson ? (JSON.parse(fresh.questionsJson) as StoredQuestion[]) : [];
  const index = me?.currentIndex ?? 0;
  const question =
    fresh.status === DUEL_STATUS.ACTIVE && index < questions.length
      ? {
          index,
          prompt: questions[index].prompt,
          options: questions[index].options,
          total: questions.length,
        }
      : null;

  const challenger = db.select().from(users).where(eq(users.id, fresh.challengerId)).limit(1).all()[0];
  const opponent = db.select().from(users).where(eq(users.id, fresh.opponentId)).limit(1).all()[0];

  return {
    duel: {
      id: fresh.id,
      mode: fresh.mode,
      status: fresh.status,
      questionCount: fresh.questionCount,
      durationSec: fresh.durationSec,
      startedAt: fresh.startedAt?.getTime() ?? null,
      endsAt: fresh.expiresAt?.getTime() ?? null,
      finishedAt: fresh.finishedAt?.getTime() ?? null,
      winnerId: fresh.winnerId,
      isDraw: fresh.isDraw,
      pointsDelta: fresh.pointsDelta,
      challenger: challenger
        ? { id: challenger.id, username: challenger.username, avatarKey: challenger.avatarKey, frameKey: challenger.frameKey, roleKey: challenger.roleKey }
        : null,
      opponent: opponent
        ? { id: opponent.id, username: opponent.username, avatarKey: opponent.avatarKey, frameKey: opponent.frameKey, roleKey: opponent.roleKey }
        : null,
    },
    me,
    rival,
    question,
    serverTime: Date.now(),
    timeLeftSec: fresh.expiresAt
      ? Math.max(0, Math.ceil((fresh.expiresAt.getTime() - Date.now() - GRACE_MS) / 1000))
      : 0,
  };
}

/* --------------------------------------------------------------- CEVAP */

/**
 * Düello cevabı — skor TAMAMEN sunucuda hesaplanır.
 * Sunucu kaydeder: soru indeksi, seçilen şık, doğruluk, geçen süre, sunucu zaman damgası.
 * İstemciden gelen hiçbir puan/sonuç bilgisi kabul edilmez.
 */
export function submitDuelAnswer(
  userId: string,
  duelId: string,
  questionIndex: number,
  answerIndex: number,
) {
  const duel = loadDuel(duelId);
  assertParticipant(duel, userId);
  if (duel.status !== DUEL_STATUS.ACTIVE) throw new ApiError("Düello aktif değil.", 409);

  if (duel.expiresAt && Date.now() > duel.expiresAt.getTime()) {
    finalizeDuel(duelId);
    throw new ApiError("Düello süresi doldu.", 410);
  }

  const me = db
    .select()
    .from(duelPlayers)
    .where(and(eq(duelPlayers.duelId, duelId), eq(duelPlayers.userId, userId)))
    .limit(1)
    .all()[0];
  if (!me) throw new ApiError("Düello oyuncusu bulunamadı.", 404);
  if (me.finishedAt) throw new ApiError("Bu düelloyu zaten tamamladın.", 409);
  if (questionIndex !== me.currentIndex) throw new ApiError("Soru sırası uyuşmuyor.", 409);

  const questions = JSON.parse(duel.questionsJson) as StoredQuestion[];
  const q = questions[questionIndex];
  if (!q) throw new ApiError("Soru bulunamadı.", 404);

  const startedAt = duel.startedAt?.getTime() ?? Date.now();
  const elapsed = Date.now() - startedAt;
  const msTaken = Math.max(0, elapsed - me.totalMs);

  const isCorrect = Number(answerIndex) === q.correctIndex;
  // Hız bonusu: 2 saniyeden hızlı cevaplar tam bonus alır, 7 saniyede sıfırlanır.
  const speedBonus = isCorrect
    ? Math.max(0, Math.round(DUEL_SPEED_BONUS_MAX * (1 - Math.min(1, Math.max(0, msTaken - 2000) / 5000))))
    : 0;
  const gained = isCorrect ? DUEL_CORRECT_POINTS + speedBonus : 0;

  db.transaction((tx) => {
    tx.insert(duelAnswers)
      .values({
        id: createId("da_"),
        duelId,
        userId,
        questionIndex,
        answerIndex: Number(answerIndex),
        isCorrect,
        msTaken,
      })
      .onConflictDoNothing()
      .run();

    tx.update(duelPlayers)
      .set({
        score: me.score + gained,
        correct: me.correct + (isCorrect ? 1 : 0),
        wrong: me.wrong + (isCorrect ? 0 : 1),
        currentIndex: me.currentIndex + 1,
        totalMs: elapsed,
        finishedAt: me.currentIndex + 1 >= questions.length ? new Date() : null,
      })
      .where(eq(duelPlayers.id, me.id))
      .run();
  });

  publishToDuel(duelId, { type: "duel:update", payload: { duelId } });
  const rival = db
    .select()
    .from(duelPlayers)
    .where(and(eq(duelPlayers.duelId, duelId), sql`${duelPlayers.userId} <> ${userId}`))
    .all()[0];
  if (rival) publishToUser(rival.userId, { type: "duel:update", payload: { duelId } });

  const all = db.select().from(duelPlayers).where(eq(duelPlayers.duelId, duelId)).all();
  const everyoneDone = all.length === 2 && all.every((p) => p.finishedAt !== null);
  if (everyoneDone) finalizeDuel(duelId);

  return {
    isCorrect,
    correctIndex: q.correctIndex,
    gained,
    speedBonus,
    state: duelState(userId, duelId),
  };
}

/** Oyuncu düellodan erken çıkarsa kalan soruları boş bırakıp bitirir. */
export function forfeitDuel(userId: string, duelId: string) {
  const duel = loadDuel(duelId);
  assertParticipant(duel, userId);
  if (duel.status !== DUEL_STATUS.ACTIVE) return duelState(userId, duelId);

  db.update(duelPlayers)
    .set({ finishedAt: new Date() })
    .where(and(eq(duelPlayers.duelId, duelId), eq(duelPlayers.userId, userId)))
    .run();

  const all = db.select().from(duelPlayers).where(eq(duelPlayers.duelId, duelId)).all();
  if (all.every((p) => p.finishedAt !== null)) finalizeDuel(duelId);
  return duelState(userId, duelId);
}

/* ------------------------------------------------------------ SONUÇLANDIR */

/**
 * Kazananı belirler ve lig puanlarını uygular.
 *  - PUAN TAKASLI: kazananın kazandığı kadar kaybedenin puanı düşer (0'ın altına inmez).
 *  - TAKASSIZ: lig puanı değişmez, yalnızca galibiyet/seri istatistikleri işlenir.
 */
export function finalizeDuel(duelId: string) {
  const duel = loadDuel(duelId);
  if (duel.status !== DUEL_STATUS.ACTIVE) return;

  const players = db.select().from(duelPlayers).where(eq(duelPlayers.duelId, duelId)).all();
  if (players.length < 2) {
    db.update(duels)
      .set({ status: DUEL_STATUS.CANCELLED, finishedAt: new Date() })
      .where(eq(duels.id, duelId))
      .run();
    return;
  }

  const [a, b] = players;
  let winner: typeof a | null = null;
  let loser: typeof a | null = null;
  let isDraw = false;

  if (a.score !== b.score) {
    winner = a.score > b.score ? a : b;
    loser = a.score > b.score ? b : a;
  } else if (a.correct !== b.correct) {
    winner = a.correct > b.correct ? a : b;
    loser = a.correct > b.correct ? b : a;
  } else if (a.totalMs !== b.totalMs && a.totalMs > 0 && b.totalMs > 0) {
    winner = a.totalMs < b.totalMs ? a : b;
    loser = a.totalMs < b.totalMs ? b : a;
  } else {
    isDraw = true;
  }

  let delta = 0;
  if (!isDraw && winner && loser && duel.mode === DUEL_MODE.POINTS_SWAP) {
    const scoreGap = Math.abs(winner.score - loser.score);
    delta = Math.min(
      DUEL_MAX_LEAGUE_POINTS,
      Math.max(DUEL_MIN_LEAGUE_POINTS, DUEL_BASE_LEAGUE_POINTS + Math.round(scoreGap / 4)),
    );
  }

  db.update(duels)
    .set({
      status: DUEL_STATUS.FINISHED,
      finishedAt: new Date(),
      winnerId: winner?.userId ?? null,
      isDraw,
      pointsDelta: delta,
    })
    .where(eq(duels.id, duelId))
    .run();

  // --- Lig puanı ve istatistikler ---
  if (isDraw) {
    for (const p of players) {
      const prof = getProfile(p.userId);
      db.update(profiles)
        .set({ duelDraws: prof.duelDraws + 1, updatedAt: new Date() })
        .where(eq(profiles.userId, p.userId))
        .run();
      db.update(duelPlayers)
        .set({ leaguePointsAfter: prof.leaguePoints, leaguePointsDelta: 0 })
        .where(eq(duelPlayers.id, p.id))
        .run();
    }
  } else if (winner && loser) {
    // Kazanan
    const wProf = getProfile(winner.userId);
    const nextStreak = wProf.duelStreak + 1;
    db.update(profiles)
      .set({
        duelWins: wProf.duelWins + 1,
        duelStreak: nextStreak,
        bestDuelStreak: Math.max(wProf.bestDuelStreak, nextStreak),
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, winner.userId))
      .run();

    // Kaybeden — seri sıfırlanır
    const lProf = getProfile(loser.userId);
    db.update(profiles)
      .set({ duelLosses: lProf.duelLosses + 1, duelStreak: 0, updatedAt: new Date() })
      .where(eq(profiles.userId, loser.userId))
      .run();

    if (delta > 0) {
      const wRes = applyLeagueDelta(winner.userId, delta, "DUEL_WIN", duelId);
      const lRes = applyLeagueDelta(loser.userId, -delta, "DUEL_LOSS", duelId);
      db.update(duelPlayers)
        .set({ leaguePointsAfter: wRes.points, leaguePointsDelta: wRes.delta })
        .where(eq(duelPlayers.id, winner.id))
        .run();
      db.update(duelPlayers)
        .set({ leaguePointsAfter: lRes.points, leaguePointsDelta: lRes.delta })
        .where(eq(duelPlayers.id, loser.id))
        .run();
    } else {
      for (const p of players) {
        const prof = getProfile(p.userId);
        db.update(duelPlayers)
          .set({ leaguePointsAfter: prof.leaguePoints, leaguePointsDelta: 0 })
          .where(eq(duelPlayers.id, p.id))
          .run();
      }
    }
  }

  // --- Bildirim, görev ve başarım ---
  for (const p of players) {
    const isWinner = winner?.userId === p.userId;
    const rival = players.find((x) => x.userId !== p.userId);
    const finalDelta =
      db.select().from(duelPlayers).where(eq(duelPlayers.id, p.id)).limit(1).all()[0]
        ?.leaguePointsDelta ?? 0;

    notify({
      userId: p.userId,
      type: NOTIFICATION_TYPE.DUEL_RESULT,
      title: isDraw ? "Düello berabere!" : isWinner ? "Düelloyu kazandın!" : "Düelloyu kaybettin",
      body: isDraw
        ? `Skor ${p.score} - ${rival?.score ?? 0}`
        : `Skor ${p.score} - ${rival?.score ?? 0}${
            finalDelta !== 0 ? ` · Lig puanı ${finalDelta > 0 ? "+" : ""}${finalDelta}` : ""
          }`,
      iconKey: isDraw ? "handshake" : isWinner ? "trophy" : "shield",
      link: `/duello/${duelId}`,
      meta: { duelId, isWinner, isDraw, delta: finalDelta },
    });

    addTaskProgress(p.userId, { duel_played: 1, duel_win: isWinner ? 1 : 0 });
    evaluateAchievements(p.userId);
    publishToUser(p.userId, { type: "duel:finished", payload: { duelId } });
  }

  publishToDuel(duelId, { type: "duel:finished", payload: { duelId } });
}

/* --------------------------------------------------------------- LİSTELER */

export function pendingInvites(userId: string) {
  const now = Date.now();
  const rows = db
    .select({
      id: duels.id,
      mode: duels.mode,
      createdAt: duels.createdAt,
      expiresAt: duels.expiresAt,
      challengerId: duels.challengerId,
      username: users.username,
      avatarKey: users.avatarKey,
      frameKey: users.frameKey,
      roleKey: users.roleKey,
    })
    .from(duels)
    .innerJoin(users, eq(users.id, duels.challengerId))
    .where(and(eq(duels.opponentId, userId), eq(duels.status, DUEL_STATUS.PENDING)))
    .orderBy(desc(duels.createdAt))
    .all();

  return rows.filter((r) => !r.expiresAt || r.expiresAt.getTime() > now);
}

export function sentInvites(userId: string) {
  return db
    .select({
      id: duels.id,
      mode: duels.mode,
      createdAt: duels.createdAt,
      expiresAt: duels.expiresAt,
      username: users.username,
      avatarKey: users.avatarKey,
      roleKey: users.roleKey,
    })
    .from(duels)
    .innerJoin(users, eq(users.id, duels.opponentId))
    .where(and(eq(duels.challengerId, userId), eq(duels.status, DUEL_STATUS.PENDING)))
    .orderBy(desc(duels.createdAt))
    .all();
}

export function activeDuelFor(userId: string) {
  const rows = db
    .select()
    .from(duels)
    .where(
      and(
        eq(duels.status, DUEL_STATUS.ACTIVE),
        or(eq(duels.challengerId, userId), eq(duels.opponentId, userId)),
      ),
    )
    .orderBy(desc(duels.startedAt))
    .limit(1)
    .all();
  return rows[0] ?? null;
}

export function duelHistory(userId: string, limit = 20) {
  const rows = db
    .select()
    .from(duels)
    .where(
      and(
        inArray(duels.status, [DUEL_STATUS.FINISHED]),
        or(eq(duels.challengerId, userId), eq(duels.opponentId, userId)),
      ),
    )
    .orderBy(desc(duels.finishedAt))
    .limit(limit)
    .all();

  return rows.map((d) => {
    const players = playersOf(d.id);
    const me = players.find((p) => p.userId === userId);
    const rival = players.find((p) => p.userId !== userId);
    return {
      id: d.id,
      mode: d.mode,
      finishedAt: d.finishedAt?.getTime() ?? null,
      isDraw: d.isDraw,
      won: d.winnerId === userId,
      myScore: me?.score ?? 0,
      rivalScore: rival?.score ?? 0,
      delta: me?.leaguePointsDelta ?? 0,
      rival: rival
        ? { username: rival.username, avatarKey: rival.avatarKey, roleKey: rival.roleKey }
        : null,
    };
  });
}

export function duelStatsFor(userId: string) {
  const p = getProfile(userId);
  return {
    wins: p.duelWins,
    losses: p.duelLosses,
    draws: p.duelDraws,
    streak: p.duelStreak,
    bestStreak: p.bestDuelStreak,
    leaguePoints: p.leaguePoints,
    leagueKey: p.leagueKey,
    leagueName: LEAGUE_BY_KEY[p.leagueKey]?.name ?? "Pirinç",
  };
}
