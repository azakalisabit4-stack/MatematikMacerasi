import { ok, requireUser, route } from "@/lib/api";
import { finishGame } from "@/lib/games/engine";

export const POST = route(
  async (_req: Request, ctx: { params: Promise<{ sessionId: string }> }) => {
    const user = await requireUser();
    const { sessionId } = await ctx.params;
    // Oyuncu oyunu bıraksa da o ana kadarki puanı korunur.
    const summary = finishGame(user.id, sessionId, "ABANDONED");
    return ok({ summary });
  },
);
