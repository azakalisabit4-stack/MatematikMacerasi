import { ok, requireUser, route } from "@/lib/api";
import { currentQuestion } from "@/lib/games/engine";

export const dynamic = "force-dynamic";

export const GET = route(
  async (_req: Request, ctx: { params: Promise<{ sessionId: string }> }) => {
    const user = await requireUser();
    const { sessionId } = await ctx.params;
    return ok(currentQuestion(user.id, sessionId));
  },
);
