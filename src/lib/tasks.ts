import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userDailyTasks } from "@/lib/db/schema";
import { pickDailyTasks, TASK_BY_KEY, type TaskMetric } from "@/lib/catalog/daily-tasks";
import { createId } from "@/lib/ids";
import { dayKey } from "@/lib/utils";
import { addCoins, addPoints, addXp } from "@/lib/progress";
import { notify } from "@/lib/notifications";
import { NOTIFICATION_TYPE } from "@/lib/constants";

/** Bugünün görevlerini garanti eder (her gün otomatik yenilenir). */
export function ensureTodayTasks(userId: string) {
  const day = dayKey();
  const existing = db
    .select()
    .from(userDailyTasks)
    .where(and(eq(userDailyTasks.userId, userId), eq(userDailyTasks.dayKey, day)))
    .all();

  if (existing.length > 0) return existing;

  const chosen = pickDailyTasks(userId, day, 3);
  for (const t of chosen) {
    db.insert(userDailyTasks)
      .values({
        id: createId("udt_"),
        userId,
        taskKey: t.key,
        dayKey: day,
        progress: 0,
        target: t.target,
        completed: false,
      })
      .onConflictDoNothing()
      .run();
  }

  return db
    .select()
    .from(userDailyTasks)
    .where(and(eq(userDailyTasks.userId, userId), eq(userDailyTasks.dayKey, day)))
    .all();
}

export interface TaskCompletion {
  key: string;
  title: string;
  rewardXp: number;
  rewardPoints: number;
  rewardCoins: number;
}

/**
 * Metrik ilerlemesini işler.
 * `mode: "increment"` → toplanan değerler (doğru sayısı, oyun sayısı…)
 * `mode: "max"`       → en iyi değer (seri, süre bonusu…)
 */
export function addTaskProgress(
  userId: string,
  updates: Partial<Record<TaskMetric, number>>,
  mode: "increment" | "max" = "increment",
): TaskCompletion[] {
  const day = dayKey();
  const rows = ensureTodayTasks(userId);
  const completions: TaskCompletion[] = [];

  for (const row of rows) {
    if (row.completed) continue;
    const def = TASK_BY_KEY[row.taskKey];
    if (!def) continue;
    const inc = updates[def.metric];
    if (inc === undefined || inc <= 0) continue;

    const nextProgress =
      mode === "max" ? Math.max(row.progress, inc) : row.progress + inc;
    const done = nextProgress >= row.target;

    db.update(userDailyTasks)
      .set({
        progress: Math.min(nextProgress, row.target),
        completed: done,
        claimedAt: done ? new Date() : null,
      })
      .where(and(eq(userDailyTasks.id, row.id)))
      .run();

    if (done) {
      if (def.rewardXp) addXp(userId, def.rewardXp);
      if (def.rewardPoints) addPoints(userId, def.rewardPoints);
      if (def.rewardCoins) addCoins(userId, def.rewardCoins);
      completions.push({
        key: def.key,
        title: def.title,
        rewardXp: def.rewardXp,
        rewardPoints: def.rewardPoints,
        rewardCoins: def.rewardCoins,
      });
      notify({
        userId,
        type: NOTIFICATION_TYPE.TASK,
        title: "Günlük görev tamamlandı!",
        body: `${def.title} — +${def.rewardXp} XP, +${def.rewardPoints} puan`,
        iconKey: def.iconKey,
        link: "/gorevler",
        meta: { taskKey: def.key, day },
      });
    }
  }

  return completions;
}

export function listTodayTasks(userId: string) {
  const rows = ensureTodayTasks(userId);
  return rows.map((r) => {
    const def = TASK_BY_KEY[r.taskKey];
    return {
      id: r.id,
      key: r.taskKey,
      title: def?.title ?? r.taskKey,
      description: def?.description ?? "",
      iconKey: def?.iconKey ?? "target",
      progress: r.progress,
      target: r.target,
      completed: r.completed,
      rewardXp: def?.rewardXp ?? 0,
      rewardPoints: def?.rewardPoints ?? 0,
      rewardCoins: def?.rewardCoins ?? 0,
    };
  });
}
