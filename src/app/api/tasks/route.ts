import { ok, requireUser, route } from "@/lib/api";
import { listTodayTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ tasks: listTodayTasks(user.id) });
});
