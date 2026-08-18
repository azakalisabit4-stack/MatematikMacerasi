import { z } from "zod";

import { ok, readJson, requireUser, route } from "@/lib/api";
import {
  acceptFriendRequest,
  declineFriendRequest,
  incomingRequests,
  listFriends,
  onlineStudents,
  outgoingRequests,
  removeFriend,
  sendFriendRequest,
} from "@/lib/social";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return ok({
    friends: listFriends(user.id),
    incoming: incomingRequests(user.id).map((r) => ({ ...r, createdAt: r.createdAt.getTime() })),
    outgoing: outgoingRequests(user.id).map((r) => ({ ...r, createdAt: r.createdAt.getTime() })),
    online: onlineStudents(user.id, 40),
  });
});

const schema = z.object({
  action: z.enum(["request", "accept", "decline", "remove"]),
  username: z.string().optional(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await readJson(req));

  if (body.action === "request") return ok(sendFriendRequest(user.id, body.username ?? ""));
  if (body.action === "accept") return ok(acceptFriendRequest(user.id, body.requestId ?? ""));
  if (body.action === "decline") return ok(declineFriendRequest(user.id, body.requestId ?? ""));
  return ok(removeFriend(user.id, body.userId ?? ""));
});
