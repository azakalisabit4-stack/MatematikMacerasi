/**
 * Başarım kataloğu — genişletilebilir.
 * Yeni bir başarım eklemek için buraya bir satır eklemek yeterlidir;
 * ilerleme takibi `metric` alanına göre otomatik yapılır.
 */

export type AchievementMetric =
  | "games_played"
  | "answer_streak"
  | "perfect_game"
  | "time_bonus"
  | "total_points"
  | "duel_wins"
  | "duel_streak"
  | "level"
  | "league_order"
  | "daily_tasks"
  | "friends"
  | "game_complete:ritmik-ileri-1"
  | "game_complete:carpim-tablosu"
  | "game_complete:climb"
  | "perfect_variant:ritmik-ileri-1:7"
  | "perfect_game:carpim-tablosu"
  | "boss_defeated";

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  iconKey: string;
  category: "GAME" | "DUEL" | "STREAK" | "PROGRESS" | "SPECIAL";
  tier: "bronze" | "silver" | "gold" | "diamond";
  target: number;
  rewardXp: number;
  rewardCoins: number;
  sortOrder: number;
  metric: AchievementMetric;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---------------------------------------------------------------- OYUN
  { key: "ilk-adim", name: "İlk Adım", description: "İlk oyununu tamamla.", iconKey: "sprout", category: "GAME", tier: "bronze", target: 1, rewardXp: 25, rewardCoins: 20, sortOrder: 10, metric: "games_played" },
  { key: "maratoncu", name: "Maratoncu", description: "Toplam 50 oyun tamamla.", iconKey: "flag", category: "GAME", tier: "silver", target: 50, rewardXp: 200, rewardCoins: 150, sortOrder: 20, metric: "games_played" },
  { key: "efsane-oyuncu", name: "Efsane Oyuncu", description: "Toplam 250 oyun tamamla.", iconKey: "medal", category: "GAME", tier: "gold", target: 250, rewardXp: 800, rewardCoins: 500, sortOrder: 30, metric: "games_played" },
  { key: "tirmanis-ustasi", name: "Tırmanış Ustası", description: "Bir tırmanma oyununu baştan sona tamamla.", iconKey: "mountain", category: "GAME", tier: "silver", target: 1, rewardXp: 120, rewardCoins: 80, sortOrder: 40, metric: "game_complete:climb" },
  { key: "yedinin-efendisi", name: "7'nin Efendisi", description: "7'şer ritmik saymayı hatasız tamamla.", iconKey: "seven", category: "GAME", tier: "gold", target: 1, rewardXp: 200, rewardCoins: 150, sortOrder: 50, metric: "perfect_variant:ritmik-ileri-1:7" },
  { key: "carpim-ustasi", name: "Çarpım Ustası", description: "Çarpım tablosunu hatasız tamamla.", iconKey: "multiply", category: "GAME", tier: "gold", target: 1, rewardXp: 250, rewardCoins: 200, sortOrder: 60, metric: "perfect_game:carpim-tablosu" },
  { key: "kusursuz", name: "Kusursuz", description: "Bir oyunda hiç yanlış yapma.", iconKey: "shield-check", category: "GAME", tier: "silver", target: 1, rewardXp: 150, rewardCoins: 100, sortOrder: 70, metric: "perfect_game" },
  { key: "kusursuz-10", name: "Hatasız On", description: "10 oyunu hiç yanlış yapmadan bitir.", iconKey: "shield-star", category: "GAME", tier: "diamond", target: 10, rewardXp: 600, rewardCoins: 400, sortOrder: 80, metric: "perfect_game" },
  { key: "hiz-canavari", name: "Hız Canavarı", description: "Bir oyunda 20 saniye veya daha fazla süre bonusu kazan.", iconKey: "bolt", category: "GAME", tier: "gold", target: 20, rewardXp: 180, rewardCoins: 120, sortOrder: 90, metric: "time_bonus" },
  { key: "boss-avcisi", name: "Boss Avcısı", description: "Boss savaşında canavarı yen.", iconKey: "boss", category: "GAME", tier: "diamond", target: 1, rewardXp: 400, rewardCoins: 300, sortOrder: 100, metric: "boss_defeated" },

  // --------------------------------------------------------------- SERİ
  { key: "seri-10", name: "Seri Başlangıcı", description: "10 soruyu arka arkaya doğru cevapla.", iconKey: "flame", category: "STREAK", tier: "bronze", target: 10, rewardXp: 80, rewardCoins: 50, sortOrder: 110, metric: "answer_streak" },
  { key: "seri-ustasi", name: "Seri Ustası", description: "20 soruyu arka arkaya doğru cevapla.", iconKey: "flame-star", category: "STREAK", tier: "gold", target: 20, rewardXp: 220, rewardCoins: 150, sortOrder: 120, metric: "answer_streak" },
  { key: "seri-efsanesi", name: "Seri Efsanesi", description: "40 soruyu arka arkaya doğru cevapla.", iconKey: "flame-crown", category: "STREAK", tier: "diamond", target: 40, rewardXp: 500, rewardCoins: 350, sortOrder: 130, metric: "answer_streak" },

  // -------------------------------------------------------------- DÜELLO
  { key: "ilk-duello", name: "İlk Zafer", description: "İlk düellonu kazan.", iconKey: "swords", category: "DUEL", tier: "bronze", target: 1, rewardXp: 60, rewardCoins: 40, sortOrder: 140, metric: "duel_wins" },
  { key: "duello-sampiyonu", name: "Düello Şampiyonu", description: "10 düello kazan.", iconKey: "trophy", category: "DUEL", tier: "gold", target: 10, rewardXp: 300, rewardCoins: 200, sortOrder: 150, metric: "duel_wins" },
  { key: "duello-efsanesi", name: "Düello Efsanesi", description: "50 düello kazan.", iconKey: "crown", category: "DUEL", tier: "diamond", target: 50, rewardXp: 900, rewardCoins: 600, sortOrder: 160, metric: "duel_wins" },
  { key: "duello-serisi", name: "Düello Serisi", description: "5 düelloyu arka arkaya kazan.", iconKey: "flame-swords", category: "DUEL", tier: "gold", target: 5, rewardXp: 260, rewardCoins: 180, sortOrder: 170, metric: "duel_streak" },
  { key: "duello-serisi-10", name: "Durdurulamaz", description: "10 düelloyu arka arkaya kazan.", iconKey: "flame-crown", category: "DUEL", tier: "diamond", target: 10, rewardXp: 700, rewardCoins: 450, sortOrder: 180, metric: "duel_streak" },

  // ------------------------------------------------------------ İLERLEME
  { key: "level-5", name: "Yükselen Yıldız", description: "5. seviyeye ulaş.", iconKey: "star", category: "PROGRESS", tier: "bronze", target: 5, rewardXp: 0, rewardCoins: 60, sortOrder: 190, metric: "level" },
  { key: "level-15", name: "Deneyimli Kâşif", description: "15. seviyeye ulaş.", iconKey: "star-double", category: "PROGRESS", tier: "silver", target: 15, rewardXp: 0, rewardCoins: 200, sortOrder: 200, metric: "level" },
  { key: "level-30", name: "Matematik Bilgesi", description: "30. seviyeye ulaş.", iconKey: "star-crown", category: "PROGRESS", tier: "diamond", target: 30, rewardXp: 0, rewardCoins: 600, sortOrder: 210, metric: "level" },
  { key: "puan-avcisi", name: "Puan Avcısı", description: "Toplam 5.000 puana ulaş.", iconKey: "coins", category: "PROGRESS", tier: "silver", target: 5000, rewardXp: 150, rewardCoins: 150, sortOrder: 220, metric: "total_points" },
  { key: "puan-krali", name: "Puan Kralı", description: "Toplam 25.000 puana ulaş.", iconKey: "treasure", category: "PROGRESS", tier: "diamond", target: 25000, rewardXp: 500, rewardCoins: 500, sortOrder: 230, metric: "total_points" },
  { key: "lig-gumus", name: "Gümüş Çağı", description: "Gümüş Lig'e yüksel.", iconKey: "league-gumus", category: "PROGRESS", tier: "silver", target: 4, rewardXp: 120, rewardCoins: 100, sortOrder: 240, metric: "league_order" },
  { key: "lig-altin", name: "Altın Çağı", description: "Altın Lig'e yüksel.", iconKey: "league-altin", category: "PROGRESS", tier: "gold", target: 5, rewardXp: 250, rewardCoins: 200, sortOrder: 250, metric: "league_order" },
  { key: "lig-elmas", name: "Elmas Çağı", description: "Elmas Lig'e yüksel.", iconKey: "league-elmas", category: "PROGRESS", tier: "diamond", target: 6, rewardXp: 450, rewardCoins: 350, sortOrder: 260, metric: "league_order" },
  { key: "lig-sampiyon", name: "Şampiyon", description: "Şampiyon Ligi'ne yüksel.", iconKey: "league-sampiyon", category: "PROGRESS", tier: "diamond", target: 8, rewardXp: 1000, rewardCoins: 800, sortOrder: 270, metric: "league_order" },

  // --------------------------------------------------------------- ÖZEL
  { key: "gorev-adami", name: "Görev Adamı", description: "10 günlük görev tamamla.", iconKey: "checklist", category: "SPECIAL", tier: "silver", target: 10, rewardXp: 200, rewardCoins: 150, sortOrder: 280, metric: "daily_tasks" },
  { key: "sosyal-kelebek", name: "Sosyal Kelebek", description: "5 arkadaş edin.", iconKey: "users", category: "SPECIAL", tier: "bronze", target: 5, rewardXp: 100, rewardCoins: 80, sortOrder: 290, metric: "friends" },
];

export const ACHIEVEMENT_BY_KEY: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.key, a]),
);
