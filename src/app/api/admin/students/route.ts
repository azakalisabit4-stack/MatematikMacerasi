import { z } from "zod";

import { ok, readJson, requireAdmin, route } from "@/lib/api";
import { adminListStudents, adminSetActive } from "@/lib/admin";
import { adminRenameUser } from "@/lib/usernames";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  await requireAdmin();
  const url = new URL(req.url);
  return ok({
    students: adminListStudents(
      url.searchParams.get("q") ?? "",
      url.searchParams.get("online") === "1",
    ),
  });
});

const schema = z.object({
  action: z.enum(["rename", "setActive"]),
  userId: z.string(),
  username: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const POST = route(async (req: Request) => {
  const admin = await requireAdmin();
  const body = schema.parse(await readJson(req));
  if (body.action === "rename")
    return ok(adminRenameUser(admin.id, body.userId, body.username ?? ""));
  return ok(adminSetActive(admin.id, body.userId, body.isActive ?? true));
});
