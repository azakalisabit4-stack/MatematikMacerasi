import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { createId } from "@/lib/ids";
import { publishToUser } from "@/lib/realtime";

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  iconKey?: string;
  link?: string;
  meta?: Record<string, unknown>;
}

export function notify(input: NotifyInput) {
  const row = {
    id: createId("ntf_"),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    iconKey: input.iconKey ?? "bell",
    link: input.link ?? null,
    meta: JSON.stringify(input.meta ?? {}),
    createdAt: new Date(),
    readAt: null,
  };
  db.insert(notifications).values(row).run();
  publishToUser(input.userId, {
    type: "notification",
    payload: { ...row, meta: input.meta ?? {} },
  });
  return row;
}

export function listNotifications(userId: string, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all();
}

export function unreadCount(userId: string): number {
  const r = db
    .select({ c: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .all();
  return r[0]?.c ?? 0;
}

export function markAllRead(userId: string) {
  db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .run();
}

export function markRead(userId: string, id: string) {
  db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)))
    .run();
}
