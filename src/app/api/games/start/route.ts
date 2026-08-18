import { z } from "zod";

import { ok, readJson, requireUser, route } from "@/lib/api";
import { startGame } from "@/lib/games/engine";

const schema = z.object({
  gameKey: z.string(),
  variant: z.string().optional(),
  startValue: z.number().int().optional(),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await readJson(req));
  const result = startGame(user.id, body);
  return ok(result);
});
