import { z } from "zod";

import { ok, readJson, requireUser, route } from "@/lib/api";
import { listNotifications, markAllRead, markRead, unreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return ok({
    notifications: listNotifications(user.id).map((n) => ({
      ...n,
      createdAt: n.createdAt.getTime(),
      readAt: n.readAt?.getTime() ?? null,
      meta: JSON.parse(n.meta),
    })),
    unread: unreadCount(user.id),
  });
});

const schema = z.object({ id: z.string().optional(), all: z.boolean().optional() });

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await readJson(req));
  if (body.all || !body.id) markAllRead(user.id);
  else markRead(user.id, body.id);
  return ok({ unread: unreadCount(user.id) });
});
