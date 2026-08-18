import { ok, requireAdmin, route } from "@/lib/api";
import { adminActionLog, adminOverview } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  return ok({ overview: adminOverview(), actions: adminActionLog(20) });
});
