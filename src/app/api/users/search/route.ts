import { ok, requireUser, route } from "@/lib/api";
import { searchUsers } from "@/lib/social";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const user = await requireUser();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return ok({ results: searchUsers(q, user.id) });
});
