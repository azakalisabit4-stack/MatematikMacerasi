import { z } from "zod";
import { eq, or } from "drizzle-orm";

import { ApiError, ok, readJson, route } from "@/lib/api";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession, ensureProfile } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { trLower } from "@/lib/moderation";
import { ensureTodayTasks } from "@/lib/tasks";

const schema = z.object({
  identifier: z.string().min(3, "E-posta veya kullanıcı adı gir."),
  password: z.string().min(1, "Şifre gir."),
});

export const POST = route(async (req: Request) => {
  const body = schema.parse(await readJson(req));
  const id = body.identifier.trim();

  const user = db
    .select()
    .from(users)
    .where(or(eq(users.emailLower, id.toLowerCase()), eq(users.usernameLower, trLower(id))))
    .limit(1)
    .all()[0];

  // Zamanlama saldırılarını azaltmak için her durumda doğrulama yapılır.
  const hash = user?.passwordHash ?? "$2a$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
  const valid = await verifyPassword(body.password, hash);

  if (!user || !valid) throw new ApiError("E-posta/kullanıcı adı veya şifre hatalı.", 401);
  if (!user.isActive) throw new ApiError("Bu hesap devre dışı bırakılmış.", 403);

  ensureProfile(user.id);
  ensureTodayTasks(user.id);
  await createSession(user.id, req.headers.get("user-agent") ?? undefined);

  return ok({
    user: { id: user.id, username: user.username, roleKey: user.roleKey },
  });
});
