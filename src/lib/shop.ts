import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { profiles, shopItems, userItems, users } from "@/lib/db/schema";
import { ApiError } from "@/lib/errors";
import { getProfile } from "@/lib/progress";
import { SHOP_BY_KEY } from "@/lib/catalog/shop";

const FREE_DEFAULTS = ["avatar-01", "avatar-02", "avatar-03", "avatar-04", "frame-none", "title-kasif"];

export function listShop(userId: string) {
  const profile = getProfile(userId);
  const owned = new Set(
    db.select({ itemKey: userItems.itemKey }).from(userItems).where(eq(userItems.userId, userId)).all().map((r) => r.itemKey),
  );
  FREE_DEFAULTS.forEach((k) => owned.add(k));

  const me = db.select().from(users).where(eq(users.id, userId)).limit(1).all()[0];
  const items = db.select().from(shopItems).orderBy(shopItems.sortOrder).all();

  return {
    coins: profile.coins,
    level: profile.level,
    equipped: { avatarKey: me?.avatarKey, frameKey: me?.frameKey, titleKey: me?.titleKey },
    items: items.map((i) => ({
      key: i.key,
      name: i.name,
      type: i.type,
      price: i.price,
      minLevel: i.minLevel,
      assetKey: i.assetKey,
      owned: owned.has(i.key) || i.price === 0,
      locked: profile.level < i.minLevel,
    })),
  };
}

export function buyItem(userId: string, itemKey: string) {
  const def = SHOP_BY_KEY[itemKey];
  if (!def) throw new ApiError("Ürün bulunamadı.", 404);
  const profile = getProfile(userId);
  if (profile.level < def.minLevel)
    throw new ApiError(`Bu ürün ${def.minLevel}. seviyede açılıyor.`, 403);

  const already = db
    .select()
    .from(userItems)
    .where(and(eq(userItems.userId, userId), eq(userItems.itemKey, itemKey)))
    .limit(1)
    .all()[0];
  if (already || def.price === 0) return { ok: true, coins: profile.coins };

  if (profile.coins < def.price) throw new ApiError("Yeterli jetonun yok.", 400);

  db.transaction((tx) => {
    tx.insert(userItems).values({ userId, itemKey }).onConflictDoNothing().run();
    tx.update(profiles)
      .set({ coins: profile.coins - def.price, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .run();
  });

  return { ok: true, coins: profile.coins - def.price };
}

export function equipItem(userId: string, itemKey: string) {
  const def = SHOP_BY_KEY[itemKey];
  if (!def) throw new ApiError("Ürün bulunamadı.", 404);

  const owned =
    def.price === 0 ||
    FREE_DEFAULTS.includes(itemKey) ||
    !!db
      .select()
      .from(userItems)
      .where(and(eq(userItems.userId, userId), eq(userItems.itemKey, itemKey)))
      .limit(1)
      .all()[0];
  if (!owned) throw new ApiError("Bu ürüne sahip değilsin.", 403);

  const patch =
    def.type === "AVATAR"
      ? { avatarKey: itemKey }
      : def.type === "FRAME"
        ? { frameKey: itemKey }
        : { titleKey: itemKey };

  db.update(users).set({ ...patch, updatedAt: new Date() }).where(eq(users.id, userId)).run();
  return { ok: true };
}
