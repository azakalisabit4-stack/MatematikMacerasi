import { z } from "zod";

import { ok, readJson, requireAdmin, route } from "@/lib/api";
import { adminListDuels, adminSettings, adminUpdateSetting } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  return ok({
    settings: adminSettings().map((s) => ({ ...s, updatedAt: s.updatedAt.getTime() })),
    duels: adminListDuels(),
  });
});

const schema = z.object({ key: z.string(), value: z.string() });

export const PATCH = route(async (req: Request) => {
  const admin = await requireAdmin();
  const body = schema.parse(await readJson(req));
  return ok(adminUpdateSetting(admin.id, body.key, body.value));
});
