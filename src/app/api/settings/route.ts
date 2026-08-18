import { z } from "zod";
import { eq } from "drizzle-orm";

import { ApiError, ok, readJson, requireUser, route } from "@/lib/api";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, validatePasswordShape, verifyPassword } from "@/lib/auth/password";
import { selfRename } from "@/lib/usernames";
import { ROLE } from "@/lib/constants";

const schema = z.object({
  username: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  showStatsPublicly: z.boolean().optional(),
});

export const PATCH = route(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await readJson(req));
  const changes: string[] = [];

  if (body.username && body.username !== user.username) {
    selfRename(user.id, body.username);
    changes.push("username");
  }

  if (body.newPassword) {
    const err = validatePasswordShape(body.newPassword);
    if (err) throw new ApiError(err, 422);
    const row = db.select().from(users).where(eq(users.id, user.id)).limit(1).all()[0];
    const okPw = await verifyPassword(body.currentPassword ?? "", row?.passwordHash ?? "");
    if (!okPw) throw new ApiError("Mevcut şifren hatalı.", 403);
    const hash = await hashPassword(body.newPassword);
    db.update(users).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(users.id, user.id)).run();
    changes.push("password");
  }

  // "Puan ve Lig Bilgilerimi Göster" ayarı YALNIZCA Hocaefendi içindir.
  // Öğrenciler puanını/ligini gizleyemez.
  if (typeof body.showStatsPublicly === "boolean") {
    if (user.roleKey !== ROLE.HOCAEFENDI)
      throw new ApiError("Öğrenciler puan ve lig bilgilerini gizleyemez.", 403);
    db.update(users)
      .set({ showStatsPublicly: body.showStatsPublicly, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .run();
    changes.push("visibility");
  }

  return ok({ changes });
});
