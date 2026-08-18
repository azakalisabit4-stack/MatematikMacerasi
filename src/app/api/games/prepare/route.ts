import { z } from "zod";

import { ok, readJson, requireUser, route } from "@/lib/api";
import { prepareGame } from "@/lib/games/engine";

const schema = z.object({
  gameKey: z.string(),
  variant: z.string().optional(),
});

export const POST = route(async (req: Request) => {
  await requireUser();
  const body = schema.parse(await readJson(req));
  const prepared = prepareGame(body.gameKey, body.variant);
  return ok({
    needsStart: prepared.needsStart,
    step: prepared.step,
    startOptions: prepared.startOptions,
    variant: prepared.variant,
    durationSec: prepared.game.durationSec,
    questionCount: prepared.game.questionCount,
  });
});
