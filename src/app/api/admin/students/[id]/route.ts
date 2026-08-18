import { ok, requireAdmin, route } from "@/lib/api";
import { adminStudentDetail } from "@/lib/admin";
import { loadProfileView } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  // VIEW ONLY: yalnızca okuma. Oyuna müdahale eden hiçbir uç nokta yok.
  return ok({
    profile: loadProfileView(id, admin.id),
    detail: adminStudentDetail(id),
  });
});
