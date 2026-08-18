/** Mağaza kataloğu — avatarlar, profil çerçeveleri ve unvanlar. */

export interface ShopItemDef {
  key: string;
  name: string;
  type: "AVATAR" | "FRAME" | "TITLE";
  price: number;
  minLevel: number;
  assetKey: string;
  sortOrder: number;
}

export const SHOP_ITEMS: ShopItemDef[] = [
  // Avatarlar (ilk dördü ücretsiz)
  { key: "avatar-01", name: "Kâşif", type: "AVATAR", price: 0, minLevel: 1, assetKey: "avatar-01", sortOrder: 1 },
  { key: "avatar-02", name: "Meraklı", type: "AVATAR", price: 0, minLevel: 1, assetKey: "avatar-02", sortOrder: 2 },
  { key: "avatar-03", name: "Bilgin", type: "AVATAR", price: 0, minLevel: 1, assetKey: "avatar-03", sortOrder: 3 },
  { key: "avatar-04", name: "Neşeli", type: "AVATAR", price: 0, minLevel: 1, assetKey: "avatar-04", sortOrder: 4 },
  { key: "avatar-05", name: "Dedektif", type: "AVATAR", price: 150, minLevel: 2, assetKey: "avatar-05", sortOrder: 5 },
  { key: "avatar-06", name: "Sporcu", type: "AVATAR", price: 150, minLevel: 3, assetKey: "avatar-06", sortOrder: 6 },
  { key: "avatar-07", name: "Astronot", type: "AVATAR", price: 300, minLevel: 5, assetKey: "avatar-07", sortOrder: 7 },
  { key: "avatar-08", name: "Mucit", type: "AVATAR", price: 300, minLevel: 6, assetKey: "avatar-08", sortOrder: 8 },
  { key: "avatar-09", name: "Kâhin", type: "AVATAR", price: 500, minLevel: 8, assetKey: "avatar-09", sortOrder: 9 },
  { key: "avatar-10", name: "Şövalye", type: "AVATAR", price: 500, minLevel: 10, assetKey: "avatar-10", sortOrder: 10 },
  { key: "avatar-11", name: "Büyücü", type: "AVATAR", price: 800, minLevel: 14, assetKey: "avatar-11", sortOrder: 11 },
  { key: "avatar-12", name: "Ejderha Ustası", type: "AVATAR", price: 1200, minLevel: 18, assetKey: "avatar-12", sortOrder: 12 },

  // Çerçeveler
  { key: "frame-none", name: "Sade", type: "FRAME", price: 0, minLevel: 1, assetKey: "frame-none", sortOrder: 20 },
  { key: "frame-emerald", name: "Zümrüt Çerçeve", type: "FRAME", price: 400, minLevel: 4, assetKey: "frame-emerald", sortOrder: 21 },
  { key: "frame-violet", name: "Mor Işıltı", type: "FRAME", price: 600, minLevel: 7, assetKey: "frame-violet", sortOrder: 22 },
  { key: "frame-gold", name: "Altın Çerçeve", type: "FRAME", price: 900, minLevel: 10, assetKey: "frame-gold", sortOrder: 23 },
  { key: "frame-flame", name: "Alev Çerçeve", type: "FRAME", price: 1400, minLevel: 15, assetKey: "frame-flame", sortOrder: 24 },

  // Unvanlar
  { key: "title-kasif", name: "Kâşif", type: "TITLE", price: 0, minLevel: 1, assetKey: "Kâşif", sortOrder: 30 },
  { key: "title-hesapci", name: "Hesap Ustası", type: "TITLE", price: 250, minLevel: 5, assetKey: "Hesap Ustası", sortOrder: 31 },
  { key: "title-tirmanisci", name: "Bulut Tırmanıcısı", type: "TITLE", price: 350, minLevel: 8, assetKey: "Bulut Tırmanıcısı", sortOrder: 32 },
  { key: "title-duellocu", name: "Düello Ustası", type: "TITLE", price: 500, minLevel: 10, assetKey: "Düello Ustası", sortOrder: 33 },
  { key: "title-sampiyon", name: "Matematik Şampiyonu", type: "TITLE", price: 1000, minLevel: 16, assetKey: "Matematik Şampiyonu", sortOrder: 34 },
];

export const SHOP_BY_KEY: Record<string, ShopItemDef> = Object.fromEntries(
  SHOP_ITEMS.map((i) => [i.key, i]),
);
