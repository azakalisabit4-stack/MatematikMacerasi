import { z } from "zod";

import { ok, readJson, requireUser, route } from "@/lib/api";
import { buyItem, equipItem, listShop } from "@/lib/shop";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(listShop(user.id));
});

const schema = z.object({ action: z.enum(["buy", "equip"]), itemKey: z.string() });

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await readJson(req));
  if (body.action === "buy") return ok(buyItem(user.id, body.itemKey));
  return ok(equipItem(user.id, body.itemKey));
});
