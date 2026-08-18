import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSessionUser, isAdmin, type SessionUser } from "@/lib/auth/session";
import { boot } from "@/lib/boot";
import { ApiError } from "@/lib/errors";
import { touchPresenceWithEvents } from "@/lib/social";

export { ApiError } from "@/lib/errors";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...(data as object) }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Oturum zorunlu. Aynı zamanda "çevrimiçi" damgasını tazeler. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError("Bu işlem için giriş yapmalısın.", 401);
  touchPresenceWithEvents(user.id);
  return user;
}

/** Yalnızca Hocaefendi. Yetkilendirme SUNUCU tarafında yapılır, arayüzde değil. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) throw new ApiError("Bu alana erişim yetkin yok.", 403);
  return user;
}

type Handler = (...args: never[]) => Promise<Response>;

/** Route handler'ları tek noktadan hata yönetimiyle sarar. */
export function route<T extends Handler>(handler: T): T {
  return (async (...args: never[]) => {
    try {
      boot();
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) return fail(err.message, err.status);
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return fail(first?.message ?? "Geçersiz istek.", 422);
      }
      console.error("[api]", err);
      return fail("Beklenmeyen bir hata oluştu.", 500);
    }
  }) as T;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError("Geçersiz istek gövdesi.", 400);
  }
}
