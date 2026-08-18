import { z } from "zod";

import { ApiError, ok, readJson, requireUser, route } from "@/lib/api";
import { acceptDuel, cancelDuel, declineDuel, duelState, forfeitDuel, submitDuelAnswer } from "@/lib/duels";

const schema = z.object({
  action: z.enum(["accept", "decline", "cancel", "answer", "forfeit"]),
  questionIndex: z.number().int().min(0).optional(),
  answerIndex: z.number().int().min(0).optional(),
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = schema.parse(await readJson(req));

  switch (body.action) {
    case "accept":
      acceptDuel(user.id, id);
      return ok({ state: duelState(user.id, id) });
    case "decline":
      return ok(declineDuel(user.id, id));
    case "cancel":
      return ok(cancelDuel(user.id, id));
    case "forfeit":
      return ok({ state: forfeitDuel(user.id, id) });
    case "answer": {
      if (body.questionIndex === undefined || body.answerIndex === undefined)
        throw new ApiError("Eksik cevap bilgisi.", 422);
      // Skor tamamen sunucuda hesaplanır.
      return ok(submitDuelAnswer(user.id, id, body.questionIndex, body.answerIndex));
    }
  }
});
