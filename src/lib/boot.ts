import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  achievements,
  bannedWords,
  dailyTasks,
  leagueSeasons,
  profiles,
  roles,
  shopItems,
  systemSettings,
  users,
} from "@/lib/db/schema";
import { ACHIEVEMENTS } from "@/lib/catalog/achievements";
import { DAILY_TASK_POOL } from "@/lib/catalog/daily-tasks";
import { SHOP_ITEMS } from "@/lib/catalog/shop";
import { DEFAULT_BANNED_WORDS, normalizeForFilter, trLower } from "@/lib/moderation";
import { ROLE, ROLE_LABEL } from "@/lib/constants";
import { createId } from "@/lib/ids";
import bcrypt from "bcryptjs";

const BOOT_VERSION = "1.0.0";

let booted = false;

/**
 * Referans verilerini ve ilk Hocaefendi hesabını hazırlar.
 * Idempotenttir: her açılışta güvenle çalışır, mevcut veriyi bozmaz.
 * Öğrenci/oyun/puan verisi ÜRETMEZ — tüm ilerleme gerçek kullanımdan gelir.
 */
export function boot(): void {
  if (booted) return;
  booted = true;

  db.transaction((tx) => {
    // --- Roller ---
    for (const key of [ROLE.STUDENT, ROLE.HOCAEFENDI]) {
      tx.insert(roles)
        .values({
          key,
          label: ROLE_LABEL[key],
          description:
            key === ROLE.HOCAEFENDI
              ? "Yönetici hesabı. Öğrencileri izler, kullanıcı adlarını ve yasaklı kelimeleri yönetir."
              : "Öğrenci hesabı. Oyun oynar, XP ve puan kazanır, düello yapar.",
        })
        .onConflictDoUpdate({ target: roles.key, set: { label: ROLE_LABEL[key] } })
        .run();
    }

    // --- Başarımlar ---
    for (const a of ACHIEVEMENTS) {
      tx.insert(achievements)
        .values({
          key: a.key,
          name: a.name,
          description: a.description,
          iconKey: a.iconKey,
          category: a.category,
          tier: a.tier,
          target: a.target,
          rewardXp: a.rewardXp,
          rewardCoins: a.rewardCoins,
          sortOrder: a.sortOrder,
        })
        .onConflictDoUpdate({
          target: achievements.key,
          set: {
            name: a.name,
            description: a.description,
            iconKey: a.iconKey,
            category: a.category,
            tier: a.tier,
            target: a.target,
            rewardXp: a.rewardXp,
            rewardCoins: a.rewardCoins,
            sortOrder: a.sortOrder,
          },
        })
        .run();
    }

    // --- Günlük görev havuzu ---
    for (const t of DAILY_TASK_POOL) {
      tx.insert(dailyTasks)
        .values({
          key: t.key,
          title: t.title,
          description: t.description,
          metric: t.metric,
          target: t.target,
          rewardXp: t.rewardXp,
          rewardPoints: t.rewardPoints,
          rewardCoins: t.rewardCoins,
          iconKey: t.iconKey,
          weight: t.weight,
        })
        .onConflictDoUpdate({
          target: dailyTasks.key,
          set: {
            title: t.title,
            description: t.description,
            metric: t.metric,
            target: t.target,
            rewardXp: t.rewardXp,
            rewardPoints: t.rewardPoints,
            rewardCoins: t.rewardCoins,
            iconKey: t.iconKey,
          },
        })
        .run();
    }

    // --- Mağaza ---
    for (const i of SHOP_ITEMS) {
      tx.insert(shopItems)
        .values({
          key: i.key,
          name: i.name,
          type: i.type,
          price: i.price,
          minLevel: i.minLevel,
          assetKey: i.assetKey,
          sortOrder: i.sortOrder,
        })
        .onConflictDoUpdate({
          target: shopItems.key,
          set: {
            name: i.name,
            type: i.type,
            price: i.price,
            minLevel: i.minLevel,
            assetKey: i.assetKey,
            sortOrder: i.sortOrder,
          },
        })
        .run();
    }

    // --- Yasaklı kelimeler (varsayılan liste, Hocaefendi düzenleyebilir) ---
    for (const w of DEFAULT_BANNED_WORDS) {
      const normalized = normalizeForFilter(w);
      if (!normalized) continue;
      tx.insert(bannedWords)
        .values({ id: createId("bw_"), word: w, normalized })
        .onConflictDoNothing()
        .run();
    }

    // --- Aktif sezon ---
    const activeSeason = tx.select().from(leagueSeasons).where(eq(leagueSeasons.isActive, true)).all();
    if (activeSeason.length === 0) {
      const year = new Date().getFullYear();
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year + 1, 0, 1));
      tx.insert(leagueSeasons)
        .values({
          id: createId("sea_"),
          name: `${year} Sezon 1`,
          code: `${year}-S1`,
          startsAt: start,
          endsAt: end,
          isActive: true,
        })
        .run();
    }

    // --- Sistem ayarları ---
    const defaults: Record<string, string> = {
      bootstrap_version: BOOT_VERSION,
      site_name: "Matematik Macerası",
      duel_enabled: "true",
      registration_open: "true",
      duel_invite_ttl_sec: "180",
    };
    for (const [key, value] of Object.entries(defaults)) {
      tx.insert(systemSettings).values({ key, value }).onConflictDoNothing().run();
    }

    // --- İlk Hocaefendi hesabı ---
    const adminCount = tx
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.roleKey, ROLE.HOCAEFENDI))
      .all()[0]?.c ?? 0;

    if (adminCount === 0) {
      const email = process.env.ADMIN_EMAIL ?? "hocaefendi@matematikmacerasi.com";
      const username = process.env.ADMIN_USERNAME ?? "Hocaefendi";
      const password = process.env.ADMIN_PASSWORD ?? "Hoca!2026";
      const id = createId("usr_");
      tx.insert(users)
        .values({
          id,
          email,
          emailLower: email.toLowerCase(),
          username,
          usernameLower: trLower(username),
          passwordHash: bcrypt.hashSync(password, 11),
          roleKey: ROLE.HOCAEFENDI,
          avatarKey: "avatar-09",
          frameKey: "frame-gold",
        })
        .onConflictDoNothing()
        .run();
      tx.insert(profiles).values({ userId: id }).onConflictDoNothing().run();
    }
  });
}
