import { ok, requireUser, route } from "@/lib/api";
import { duelState } from "@/lib/duels";

export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return ok(duelState(user.id, id));
});
