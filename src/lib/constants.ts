/**
 * Matematik Macerası — Sistem Sabitleri
 * Roller, ligler, XP eğrisi, oyun kataloğu ve puanlama kuralları burada tanımlıdır.
 * SQLite enum desteklemediği için tüm "enum" değerler bu dosyadaki sabitlerden gelir.
 */

/* ------------------------------------------------------------------ ROLLER */

export const ROLE = {
  STUDENT: "STUDENT",
  HOCAEFENDI: "HOCAEFENDI",
} as const;

export type RoleKey = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABEL: Record<RoleKey, string> = {
  STUDENT: "Öğrenci",
  HOCAEFENDI: "Hocaefendi",
};

/* ------------------------------------------------------------------ LİGLER */

export interface LeagueDef {
  key: string;
  name: string;
  min: number;
  /** null = üst sınır yok (Şampiyon Ligi) */
  max: number | null;
  /** Rozet görselinin ana rengi (SVG'de kullanılır) */
  colors: [string, string];
  accent: string;
  order: number;
}

export const LEAGUES: LeagueDef[] = [
  { key: "pirinc", name: "Pirinç", min: 0, max: 249, colors: ["#D9B26A", "#B78B3F"], accent: "#8A6522", order: 1 },
  { key: "tugla", name: "Tuğla", min: 250, max: 499, colors: ["#E0785A", "#B94A2C"], accent: "#8C3418", order: 2 },
  { key: "bronz", name: "Bronz", min: 500, max: 999, colors: ["#D08B54", "#A55B2A"], accent: "#7E3F17", order: 3 },
  { key: "gumus", name: "Gümüş", min: 1000, max: 1999, colors: ["#D7DEE6", "#9BA9B8"], accent: "#6C7A8A", order: 4 },
  { key: "altin", name: "Altın", min: 2000, max: 2999, colors: ["#FFD75E", "#E8A317"], accent: "#B37600", order: 5 },
  { key: "elmas", name: "Elmas", min: 3000, max: 4499, colors: ["#7FE3F0", "#2FA9D8"], accent: "#1B7FA8", order: 6 },
  { key: "tac", name: "Taç", min: 4500, max: 6999, colors: ["#C9A6FF", "#8455E6"], accent: "#5E31B8", order: 7 },
  { key: "sampiyon", name: "Şampiyon Ligi", min: 7000, max: null, colors: ["#FF9A6C", "#F4552B"], accent: "#B92E0F", order: 8 },
];

export const LEAGUE_BY_KEY: Record<string, LeagueDef> = Object.fromEntries(
  LEAGUES.map((l) => [l.key, l]),
);

export function leagueForPoints(points: number): LeagueDef {
  const p = Math.max(0, points);
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (p >= LEAGUES[i].min) return LEAGUES[i];
  }
  return LEAGUES[0];
}

/* ------------------------------------------------------------- XP / LEVEL */

/** L seviyesinden L+1'e geçmek için gereken XP. Level 12 → 2.000 XP (tasarım referansı) */
export function xpRequiredForLevel(level: number): number {
  return 200 + 150 * Math.max(1, level);
}

/** Bir seviyenin başlangıcındaki toplam kümülatif XP */
export function cumulativeXpForLevel(level: number): number {
  const n = Math.max(1, level) - 1;
  return 200 * n + 150 * ((n * (n + 1)) / 2);
}

export interface LevelInfo {
  level: number;
  currentXp: number;
  requiredXp: number;
  totalXp: number;
  progress: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (level < 200 && xp >= cumulativeXpForLevel(level + 1)) level++;
  const base = cumulativeXpForLevel(level);
  const required = xpRequiredForLevel(level);
  const current = xp - base;
  return {
    level,
    currentXp: current,
    requiredXp: required,
    totalXp: xp,
    progress: Math.min(1, current / required),
  };
}

/* --------------------------------------------------------- OYUN KATALOĞU */

export type GameRenderer = "climb" | "quiz" | "match" | "target" | "track" | "market" | "boss";
export type GameCategory = "toplama" | "cikarma" | "carpma" | "karisik" | "problem" | "boss";

export interface GameVariantDef {
  key: string;
  label: string;
  /** ritmik oyunlarda adım değeri */
  step?: number;
  description?: string;
}

export interface GameDef {
  key: string;
  name: string;
  shortName: string;
  description: string;
  renderer: GameRenderer;
  category: GameCategory;
  iconKey: string;
  /** Harita üzerindeki bölge */
  region: string;
  durationSec: number;
  questionCount: number;
  variants: GameVariantDef[];
  /** Doğru cevap puanı (sabit ise sayı; ritmikte adım değeri kullanılır) */
  correctPoints: number | "step";
  /** Yanlış cevap cezası (pozitif sayı olarak yazılır; puandan düşülür) */
  wrongPenalty: number | "step2";
  /** Doğru cevap başına XP */
  xpPerCorrect: number;
  /** Oyunu tamamlama XP bonusu */
  xpCompletion: number;
  /** Yanlışta karakter kaç basamak geri düşer (climb/track/boss) */
  fallSteps: number;
  /** Ana renk teması */
  theme: { from: string; to: string; accent: string };
  /** Düelloda kullanılabilir mi */
  duelable: boolean;
  minLevel: number;
}

const RITMIK_1 = [2, 3, 4, 5, 6, 7, 8, 9];
const RITMIK_2 = [15, 25, 35, 45];

const variantsFromSteps = (steps: number[], suffix: string): GameVariantDef[] =>
  steps.map((s) => ({ key: String(s), label: `${s}'${suffix}`, step: s }));

export const GAMES: GameDef[] = [
  {
    key: "ritmik-ileri-1",
    name: "Bulut Tırmanışı — 1 Basamaklı Ritmik Sayma",
    shortName: "Bulut Tırmanışı",
    description:
      "Seçtiğin sayıyla ileri doğru ritmik sayarak bulutlara tırman. 20 soruda zirveye ulaş.",
    renderer: "climb",
    category: "toplama",
    iconKey: "cloud-climb",
    region: "toplama-vadisi",
    durationSec: 75,
    questionCount: 20,
    variants: variantsFromSteps(RITMIK_1, "er ritmik sayma"),
    correctPoints: "step",
    wrongPenalty: "step2",
    xpPerCorrect: 4,
    xpCompletion: 40,
    fallSteps: 3,
    theme: { from: "#8ED2FF", to: "#DCF1FF", accent: "#2F9BE0" },
    duelable: true,
    minLevel: 1,
  },
  {
    key: "ritmik-ileri-2",
    name: "Yüksek Tırmanış — 2 Basamaklı Ritmik Sayma",
    shortName: "Yüksek Tırmanış",
    description: "15, 25, 35 veya 45'er ileri ritmik sayarak zirveye çık.",
    renderer: "climb",
    category: "toplama",
    iconKey: "cloud-climb-2",
    region: "ritmik-tepeler",
    durationSec: 90,
    questionCount: 20,
    variants: variantsFromSteps(RITMIK_2, "er ritmik sayma"),
    correctPoints: "step",
    wrongPenalty: "step2",
    xpPerCorrect: 6,
    xpCompletion: 60,
    fallSteps: 3,
    theme: { from: "#A5B4FC", to: "#E8ECFF", accent: "#5B6CE8" },
    duelable: true,
    minLevel: 1,
  },
  {
    key: "ritmik-geri-1",
    name: "İniş Yolu — 1 Basamaklı Geriye Ritmik Sayma",
    shortName: "İniş Yolu",
    description: "Seçtiğin sayıyla geriye doğru ritmik sayarak basamakları in.",
    renderer: "climb",
    category: "cikarma",
    iconKey: "cloud-descend",
    region: "cikarma-ormani",
    durationSec: 75,
    questionCount: 20,
    variants: variantsFromSteps(RITMIK_1, "er geriye sayma"),
    correctPoints: "step",
    wrongPenalty: "step2",
    xpPerCorrect: 4,
    xpCompletion: 40,
    fallSteps: 3,
    theme: { from: "#86E5B8", to: "#E4FBF0", accent: "#20A46B" },
    duelable: true,
    minLevel: 1,
  },
  {
    key: "ritmik-geri-2",
    name: "Derin İniş — 2 Basamaklı Geriye Ritmik Sayma",
    shortName: "Derin İniş",
    description: "15, 25, 35 veya 45'er geriye ritmik sayarak in.",
    renderer: "climb",
    category: "cikarma",
    iconKey: "cloud-descend-2",
    region: "cikarma-ormani",
    durationSec: 90,
    questionCount: 20,
    variants: variantsFromSteps(RITMIK_2, "er geriye sayma"),
    correctPoints: "step",
    wrongPenalty: "step2",
    xpPerCorrect: 6,
    xpCompletion: 60,
    fallSteps: 3,
    theme: { from: "#7FD7C4", to: "#E2FAF5", accent: "#12907E" },
    duelable: true,
    minLevel: 1,
  },
  {
    key: "carpim-tablosu",
    name: "Çarpım Dağı",
    shortName: "Çarpım Dağı",
    description:
      "1-9 çarpım tablosunun tüm benzersiz işlemleri, her oyunda karışık sırayla. Tekrar eden işlem yok.",
    renderer: "quiz",
    category: "carpma",
    iconKey: "multiply",
    region: "carpma-dagi",
    durationSec: 55,
    questionCount: 45,
    variants: [
      { key: "tam", label: "Tüm tablo (1-9)", description: "45 benzersiz işlem" },
      { key: "kucuk", label: "Kolay tablo (1-5)", description: "15 benzersiz işlem" },
      { key: "buyuk", label: "Zor tablo (6-9)", description: "10 benzersiz işlem" },
    ],
    correctPoints: 5,
    wrongPenalty: 5,
    xpPerCorrect: 3,
    xpCompletion: 50,
    fallSteps: 0,
    theme: { from: "#C4B5FD", to: "#F1EBFF", accent: "#7C4DE8" },
    duelable: true,
    minLevel: 1,
  },
  {
    key: "hizli-islem",
    name: "Hızlı İşlem Bölgesi",
    shortName: "Hızlı İşlem",
    description: "Toplama, çıkarma ve çarpma soruları rastgele karışık gelir.",
    renderer: "quiz",
    category: "karisik",
    iconKey: "bolt",
    region: "hizli-islem",
    durationSec: 60,
    questionCount: 30,
    variants: [
      { key: "kolay", label: "Kolay" },
      { key: "orta", label: "Orta" },
      { key: "zor", label: "Zor" },
    ],
    correctPoints: 6,
    wrongPenalty: 6,
    xpPerCorrect: 3,
    xpCompletion: 45,
    fallSteps: 0,
    theme: { from: "#FDE68A", to: "#FFF7DB", accent: "#E39A00" },
    duelable: true,
    minLevel: 1,
  },
  {
    key: "eksik-sayi",
    name: "Eksik Sayıyı Bul",
    shortName: "Eksik Sayı",
    description: "7 + ? = 15 gibi işlemlerdeki eksik sayıyı bul.",
    renderer: "quiz",
    category: "karisik",
    iconKey: "puzzle",
    region: "hizli-islem",
    durationSec: 60,
    questionCount: 20,
    variants: [
      { key: "toplama", label: "Toplama" },
      { key: "cikarma", label: "Çıkarma" },
      { key: "carpma", label: "Çarpma" },
      { key: "karisik", label: "Karışık" },
    ],
    correctPoints: 7,
    wrongPenalty: 7,
    xpPerCorrect: 4,
    xpCompletion: 45,
    fallSteps: 0,
    theme: { from: "#A7F3D0", to: "#ECFDF5", accent: "#0D9488" },
    duelable: true,
    minLevel: 1,
  },
  {
    key: "sayi-dizisi",
    name: "Sayı Dizisi",
    shortName: "Sayı Dizisi",
    description: "4 → 9 → 14 → 19 → ? Diziyi çöz ve devamını bul.",
    renderer: "quiz",
    category: "karisik",
    iconKey: "sequence",
    region: "ritmik-tepeler",
    durationSec: 60,
    questionCount: 15,
    variants: [
      { key: "artan", label: "Artan diziler" },
      { key: "azalan", label: "Azalan diziler" },
      { key: "karisik", label: "Karışık" },
    ],
    correctPoints: 8,
    wrongPenalty: 8,
    xpPerCorrect: 5,
    xpCompletion: 45,
    fallSteps: 0,
    theme: { from: "#BFDBFE", to: "#EFF6FF", accent: "#2563EB" },
    duelable: true,
    minLevel: 1,
  },
  {
    key: "islem-eslestirme",
    name: "İşlem Eşleştirme",
    shortName: "Eşleştirme",
    description: "İşlemleri doğru sonuçlarıyla eşleştir.",
    renderer: "match",
    category: "karisik",
    iconKey: "match",
    region: "hizli-islem",
    durationSec: 70,
    questionCount: 16,
    variants: [
      { key: "kolay", label: "Kolay" },
      { key: "zor", label: "Zor" },
    ],
    correctPoints: 10,
    wrongPenalty: 5,
    xpPerCorrect: 6,
    xpCompletion: 45,
    fallSteps: 0,
    theme: { from: "#FBCFE8", to: "#FDF2F8", accent: "#DB2777" },
    duelable: false,
    minLevel: 1,
  },
  {
    key: "hedefi-vur",
    name: "Hedefi Vur",
    shortName: "Hedefi Vur",
    description: "Verilen sonucu veren işlemi hedef tahtasından seç.",
    renderer: "target",
    category: "karisik",
    iconKey: "target",
    region: "hizli-islem",
    durationSec: 60,
    questionCount: 20,
    variants: [
      { key: "kolay", label: "Kolay" },
      { key: "zor", label: "Zor" },
    ],
    correctPoints: 7,
    wrongPenalty: 7,
    xpPerCorrect: 4,
    xpCompletion: 45,
    fallSteps: 0,
    theme: { from: "#FECACA", to: "#FEF2F2", accent: "#DC2626" },
    duelable: true,
    minLevel: 1,
  },
  {
    key: "matematik-parkuru",
    name: "Matematik Parkuru",
    shortName: "Parkur",
    description: "Doğru cevaplarla karakterini parkurda ilerlet, engelleri aş.",
    renderer: "track",
    category: "karisik",
    iconKey: "track",
    region: "hizli-islem",
    durationSec: 75,
    questionCount: 25,
    variants: [
      { key: "orman", label: "Orman Parkuru" },
      { key: "sahil", label: "Sahil Parkuru" },
    ],
    correctPoints: 6,
    wrongPenalty: 6,
    xpPerCorrect: 3,
    xpCompletion: 50,
    fallSteps: 2,
    theme: { from: "#BBF7D0", to: "#F0FDF4", accent: "#16A34A" },
    duelable: true,
    minLevel: 1,
  },
  {
    key: "matematik-marketi",
    name: "Matematik Marketi",
    shortName: "Market",
    description: "Alışveriş, toplam fiyat ve para üstü problemleri.",
    renderer: "market",
    category: "problem",
    iconKey: "cart",
    region: "market-kasabasi",
    durationSec: 90,
    questionCount: 15,
    variants: [
      { key: "toplam", label: "Toplam Fiyat" },
      { key: "paraustu", label: "Para Üstü" },
      { key: "karisik", label: "Karışık" },
    ],
    correctPoints: 10,
    wrongPenalty: 8,
    xpPerCorrect: 6,
    xpCompletion: 60,
    fallSteps: 0,
    theme: { from: "#FED7AA", to: "#FFF7ED", accent: "#EA580C" },
    duelable: false,
    minLevel: 1,
  },
  {
    key: "matematik-bankasi",
    name: "Matematik Bankası",
    shortName: "Banka",
    description: "Bütçe, birikim ve para işlemleri üzerine problemler.",
    renderer: "market",
    category: "problem",
    iconKey: "bank",
    region: "market-kasabasi",
    durationSec: 90,
    questionCount: 15,
    variants: [
      { key: "birikim", label: "Birikim" },
      { key: "butce", label: "Bütçe" },
      { key: "karisik", label: "Karışık" },
    ],
    correctPoints: 10,
    wrongPenalty: 8,
    xpPerCorrect: 6,
    xpCompletion: 60,
    fallSteps: 0,
    theme: { from: "#BAE6FD", to: "#F0F9FF", accent: "#0284C7" },
    duelable: false,
    minLevel: 1,
  },
  {
    key: "boss-savasi",
    name: "Boss Savaşı",
    shortName: "Boss Savaşı",
    description: "Doğru cevaplarla boss'a hasar ver. Yanlışlarda o sana vurur!",
    renderer: "boss",
    category: "boss",
    iconKey: "boss",
    region: "boss-zirvesi",
    durationSec: 120,
    questionCount: 25,
    variants: [
      { key: "golem", label: "Sayı Golemi" },
      { key: "ejderha", label: "Çarpım Ejderhası" },
    ],
    correctPoints: 9,
    wrongPenalty: 9,
    xpPerCorrect: 5,
    xpCompletion: 90,
    fallSteps: 0,
    theme: { from: "#DDD6FE", to: "#F5F3FF", accent: "#6D28D9" },
    duelable: false,
    minLevel: 5,
  },
];

export const GAME_BY_KEY: Record<string, GameDef> = Object.fromEntries(
  GAMES.map((g) => [g.key, g]),
);

/* -------------------------------------------------------- HARİTA BÖLGELERİ */

export interface MapRegionDef {
  key: string;
  name: string;
  subtitle: string;
  iconKey: string;
  games: string[];
  unlockLevel: number;
  colors: [string, string];
}

export const MAP_REGIONS: MapRegionDef[] = [
  {
    key: "baslangic",
    name: "Başlangıç Çayırı",
    subtitle: "Maceraya ilk adım",
    iconKey: "sprout",
    games: [],
    unlockLevel: 1,
    colors: ["#BBF7D0", "#4ADE80"],
  },
  {
    key: "toplama-vadisi",
    name: "Toplama Vadisi",
    subtitle: "Bulutlara tırmanış",
    iconKey: "cloud",
    games: ["ritmik-ileri-1"],
    unlockLevel: 1,
    colors: ["#BAE6FD", "#38BDF8"],
  },
  {
    key: "ritmik-tepeler",
    name: "Ritmik Sayma Tepeleri",
    subtitle: "İki basamaklı zirveler",
    iconKey: "mountain",
    games: ["ritmik-ileri-2", "sayi-dizisi"],
    unlockLevel: 1,
    colors: ["#C7D2FE", "#6366F1"],
  },
  {
    key: "cikarma-ormani",
    name: "Çıkarma Ormanı",
    subtitle: "Geriye doğru yolculuk",
    iconKey: "tree",
    games: ["ritmik-geri-1", "ritmik-geri-2"],
    unlockLevel: 1,
    colors: ["#BBF7D0", "#22C55E"],
  },
  {
    key: "hizli-islem",
    name: "Hızlı İşlem Bölgesi",
    subtitle: "Refleks ve dikkat",
    iconKey: "bolt",
    games: ["hizli-islem", "eksik-sayi", "islem-eslestirme", "hedefi-vur", "matematik-parkuru"],
    unlockLevel: 1,
    colors: ["#FDE68A", "#F59E0B"],
  },
  {
    key: "carpma-dagi",
    name: "Çarpma Dağı",
    subtitle: "Çarpım tablosunun zirvesi",
    iconKey: "multiply",
    games: ["carpim-tablosu"],
    unlockLevel: 1,
    colors: ["#DDD6FE", "#8B5CF6"],
  },
  {
    key: "market-kasabasi",
    name: "Market Kasabası",
    subtitle: "Gerçek hayat problemleri",
    iconKey: "cart",
    games: ["matematik-marketi", "matematik-bankasi"],
    unlockLevel: 1,
    colors: ["#FED7AA", "#F97316"],
  },
  {
    key: "boss-zirvesi",
    name: "Boss Zirvesi",
    subtitle: "Son sınav",
    iconKey: "boss",
    games: ["boss-savasi"],
    unlockLevel: 5,
    colors: ["#E9D5FF", "#A855F7"],
  },
  {
    key: "sampiyonlar",
    name: "Matematik Şampiyonları",
    subtitle: "Düello ve lig arenası",
    iconKey: "crown",
    games: [],
    unlockLevel: 1,
    colors: ["#FEF08A", "#EAB308"],
  },
];

/* ------------------------------------------------------------------ DÜELLO */

export const DUEL_MODE = {
  POINTS_SWAP: "POINTS_SWAP",
  NO_SWAP: "NO_SWAP",
} as const;
export type DuelMode = (typeof DUEL_MODE)[keyof typeof DUEL_MODE];

export const DUEL_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  FINISHED: "FINISHED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

/** Düello temel lig puanı ödülü (fark ve performansla ölçeklenir) */
export const DUEL_BASE_LEAGUE_POINTS = 30;
export const DUEL_MIN_LEAGUE_POINTS = 12;
export const DUEL_MAX_LEAGUE_POINTS = 60;
export const DUEL_INVITE_TTL_MS = 3 * 60 * 1000;
export const DUEL_QUESTION_COUNT = 10;
export const DUEL_DURATION_SEC = 90;
export const DUEL_CORRECT_POINTS = 10;
export const DUEL_SPEED_BONUS_MAX = 5;

/* --------------------------------------------------------------- ÇEVRİMİÇİ */

export const ONLINE_WINDOW_MS = Number(process.env.ONLINE_WINDOW_SECONDS ?? 70) * 1000;

/* ---------------------------------------------------------------- AVATARLAR */

export const AVATAR_KEYS = [
  "avatar-01",
  "avatar-02",
  "avatar-03",
  "avatar-04",
  "avatar-05",
  "avatar-06",
  "avatar-07",
  "avatar-08",
  "avatar-09",
  "avatar-10",
  "avatar-11",
  "avatar-12",
] as const;

export const FRAME_KEYS = [
  "frame-none",
  "frame-gold",
  "frame-emerald",
  "frame-violet",
  "frame-flame",
] as const;

/* ------------------------------------------------------------ BİLDİRİM TİPİ */

export const NOTIFICATION_TYPE = {
  FRIEND_ONLINE: "FRIEND_ONLINE",
  FRIEND_REQUEST: "FRIEND_REQUEST",
  FRIEND_ACCEPTED: "FRIEND_ACCEPTED",
  DUEL_INVITE: "DUEL_INVITE",
  DUEL_ACCEPTED: "DUEL_ACCEPTED",
  DUEL_RESULT: "DUEL_RESULT",
  ACHIEVEMENT: "ACHIEVEMENT",
  LEAGUE_UP: "LEAGUE_UP",
  LEAGUE_DOWN: "LEAGUE_DOWN",
  LEVEL_UP: "LEVEL_UP",
  TASK: "TASK",
  RECORD: "RECORD",
  ADMIN: "ADMIN",
} as const;
