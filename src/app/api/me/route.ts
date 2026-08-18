import { ok, requireUser, route } from "@/lib/api";
import { buildSummary } from "@/lib/summary";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ summary: buildSummary(user) });
});
