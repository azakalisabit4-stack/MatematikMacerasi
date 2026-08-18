import { ok, requireUser, route } from "@/lib/api";
import { loadProfileView } from "@/lib/profiles";
import { friendshipStatus } from "@/lib/social";

export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ username: string }> }) => {
  const viewer = await requireUser();
  const { username } = await ctx.params;
  const profile = loadProfileView(decodeURIComponent(username), viewer.id);
  return ok({
    profile,
    friendship: profile.isSelf ? null : friendshipStatus(viewer.id, profile.id),
  });
});
