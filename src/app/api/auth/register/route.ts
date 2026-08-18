import { z } from "zod";
import { eq } from "drizzle-orm";

import { ApiError, ok, readJson, route } from "@/lib/api";
import { db } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";
import { hashPassword, validatePasswordShape } from "@/lib/auth/password";
import { assertUsernameUsable } from "@/lib/usernames";
import { createId } from "@/lib/ids";
import { ROLE } from "@/lib/constants";
import { ensureTodayTasks } from "@/lib/tasks";
import { evaluateAchievements } from "@/lib/progress";

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi gir."),
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
  role: z.enum(["STUDENT", "HOCAEFENDI"]).optional(),
  inviteCode: z.string().optional(),
  avatarKey: z.string().optional(),
});

export const POST = route(async (req: Request) => {
  const body = schema.parse(await readJson(req));

  const pwError = validatePasswordShape(body.password);
  if (pwError) throw new ApiError(pwError, 422);

  const emailLower = body.email.trim().toLowerCase();
  const existing = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailLower, emailLower))
    .limit(1)
    .all()[0];
  if (existing) throw new ApiError("Bu e-posta adresi zaten kayıtlı.", 409);

  // Hocaefendi hesabı yalnızca geçerli davet koduyla açılabilir.
  // Kontrol TAMAMEN sunucu tarafındadır; arayüzden bypass edilemez.
  let roleKey: string = ROLE.STUDENT;
  if (body.role === ROLE.HOCAEFENDI) {
    const expected = process.env.HOCAEFENDI_INVITE_CODE ?? "MATEMATIK-2026-HOCA";
    if (!body.inviteCode || body.inviteCode.trim() !== expected) {
      throw new ApiError("Hocaefendi davet kodu geçersiz.", 403);
    }
    roleKey = ROLE.HOCAEFENDI;
  }

  const username = assertUsernameUsable(body.username);
  const id = createId("usr_");

  db.transaction((tx) => {
    tx.insert(users)
      .values({
        id,
        email: body.email.trim(),
        emailLower,
        username: username.username,
        usernameLower: username.usernameLower,
        passwordHash: "",
        roleKey,
        avatarKey: body.avatarKey ?? "avatar-01",
      })
      .run();
    tx.insert(profiles).values({ userId: id }).run();
  });

  const hash = await hashPassword(body.password);
  db.update(users).set({ passwordHash: hash }).where(eq(users.id, id)).run();

  ensureTodayTasks(id);
  evaluateAchievements(id);

  await createSession(id, req.headers.get("user-agent") ?? undefined);

  return ok({
    user: { id, username: username.username, roleKey },
  });
});
