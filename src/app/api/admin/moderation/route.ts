import { z } from "zod";

import { ok, readJson, requireAdmin, route } from "@/lib/api";
import {
  addBannedWord,
  listBannedWords,
  listReservedUsernames,
  releaseReservedUsername,
  removeBannedWord,
  reserveUsername,
  updateBannedWord,
} from "@/lib/usernames";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  // Yasaklı kelime listesi YALNIZCA Hocaefendi'ye döner; öğrenci uçları bu veriyi görmez.
  return ok({
    bannedWords: listBannedWords().map((w) => ({ ...w, createdAt: w.createdAt.getTime() })),
    reserved: listReservedUsernames().map((r) => ({ ...r, createdAt: r.createdAt.getTime() })),
  });
});

const schema = z.object({
  action: z.enum(["addWord", "updateWord", "removeWord", "reserveUsername", "releaseUsername"]),
  id: z.string().optional(),
  word: z.string().optional(),
  username: z.string().optional(),
});

export const POST = route(async (req: Request) => {
  const admin = await requireAdmin();
  const body = schema.parse(await readJson(req));

  switch (body.action) {
    case "addWord":
      return ok(addBannedWord(admin.id, body.word ?? ""));
    case "updateWord":
      return ok(updateBannedWord(admin.id, body.id ?? "", body.word ?? ""));
    case "removeWord":
      return ok(removeBannedWord(admin.id, body.id ?? ""));
    case "reserveUsername":
      return ok(reserveUsername(admin.id, body.username ?? ""));
    case "releaseUsername":
      return ok(releaseReservedUsername(admin.id, body.id ?? ""));
  }
});
