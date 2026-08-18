import { z } from "zod";

import { ok, readJson, requireUser, route } from "@/lib/api";
import { submitAnswer } from "@/lib/games/engine";

const schema = z.object({
  questionIndex: z.number().int().min(0),
  answerIndex: z.number().int().min(0),
});

export const POST = route(
  async (req: Request, ctx: { params: Promise<{ sessionId: string }> }) => {
    const user = await requireUser();
    const { sessionId } = await ctx.params;
    const body = schema.parse(await readJson(req));
    // Puanlama, doğruluk ve süre kontrolü tamamen sunucuda yapılır.
    const outcome = submitAnswer(user.id, sessionId, body.questionIndex, body.answerIndex);
    return ok(outcome);
  },
);
