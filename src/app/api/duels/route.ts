import { z } from "zod";

import { ok, readJson, requireUser, route } from "@/lib/api";
import {
  activeDuelFor,
  createDuel,
  duelHistory,
  duelStatsFor,
  pendingInvites,
  sentInvites,
} from "@/lib/duels";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return ok({
    invites: pendingInvites(user.id).map((i) => ({
      ...i,
      createdAt: i.createdAt.getTime(),
      expiresAt: i.expiresAt?.getTime() ?? null,
    })),
    sent: sentInvites(user.id).map((i) => ({
      ...i,
      createdAt: i.createdAt.getTime(),
      expiresAt: i.expiresAt?.getTime() ?? null,
    })),
    active: activeDuelFor(user.id)?.id ?? null,
    history: duelHistory(user.id),
    stats: duelStatsFor(user.id),
  });
});

const createSchema = z.object({
  opponent: z.string().min(1, "Rakip seç."),
  mode: z.enum(["POINTS_SWAP", "NO_SWAP"]),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const body = createSchema.parse(await readJson(req));
  return ok(createDuel(user.id, body.opponent, body.mode));
});
