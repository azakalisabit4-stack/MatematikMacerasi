/**
 * Günlük görev havuzu. Her öğrenciye her gün bu havuzdan 3 görev atanır.
 * Atama kullanıcı + gün anahtarına göre deterministiktir (aynı gün yeniden
 * hesaplansa bile aynı görevler gelir), her gece Europe/Istanbul saatiyle yenilenir.
 */

export type TaskMetric =
  | "correct_any"
  | "correct_add"
  | "correct_sub"
  | "correct_mul"
  | "games_played"
  | "duel_win"
  | "duel_played"
  | "perfect_game"
  | "time_bonus"
  | "answer_streak";

export interface DailyTaskDef {
  key: string;
  title: string;
  description: string;
  metric: TaskMetric;
  target: number;
  rewardXp: number;
  rewardPoints: number;
  rewardCoins: number;
  iconKey: string;
  weight: number;
}

export const DAILY_TASK_POOL: DailyTaskDef[] = [
  { key: "toplama-20", title: "20 toplama sorusu çöz", description: "Ritmik sayma veya toplama içeren oyunlarda 20 doğru cevap ver.", metric: "correct_add", target: 20, rewardXp: 100, rewardPoints: 40, rewardCoins: 30, iconKey: "plus", weight: 3 },
  { key: "cikarma-20", title: "20 çıkarma sorusu çöz", description: "Geriye ritmik sayma veya çıkarma sorularında 20 doğru cevap ver.", metric: "correct_sub", target: 20, rewardXp: 100, rewardPoints: 40, rewardCoins: 30, iconKey: "minus", weight: 3 },
  { key: "carpma-10", title: "10 çarpma sorusu doğru cevapla", description: "Çarpım tablosu veya çarpma içeren oyunlarda 10 doğru cevap ver.", metric: "correct_mul", target: 10, rewardXp: 100, rewardPoints: 40, rewardCoins: 30, iconKey: "multiply", weight: 3 },
  { key: "duello-1", title: "1 düello kazan", description: "Bir arkadaşınla düello yap ve kazan.", metric: "duel_win", target: 1, rewardXp: 150, rewardPoints: 0, rewardCoins: 50, iconKey: "swords", weight: 3 },
  { key: "duello-2-oyna", title: "2 düello oyna", description: "Sonucu ne olursa olsun 2 düello tamamla.", metric: "duel_played", target: 2, rewardXp: 90, rewardPoints: 0, rewardCoins: 30, iconKey: "swords", weight: 2 },
  { key: "oyun-3", title: "3 oyun tamamla", description: "Herhangi üç oyunu sonuna kadar oyna.", metric: "games_played", target: 3, rewardXp: 80, rewardPoints: 30, rewardCoins: 25, iconKey: "gamepad", weight: 3 },
  { key: "kusursuz-1", title: "Hatasız bir oyun bitir", description: "Bir oyunu hiç yanlış yapmadan tamamla.", metric: "perfect_game", target: 1, rewardXp: 160, rewardPoints: 50, rewardCoins: 60, iconKey: "shield-check", weight: 2 },
  { key: "sure-bonusu-15", title: "15 saniye süre bonusu kazan", description: "Bir oyunu erken bitirerek süre bonusu topla.", metric: "time_bonus", target: 15, rewardXp: 120, rewardPoints: 40, rewardCoins: 40, iconKey: "timer", weight: 2 },
  { key: "seri-12", title: "12'lik doğru serisi yap", description: "Tek bir oyunda 12 soruyu arka arkaya doğru cevapla.", metric: "answer_streak", target: 12, rewardXp: 140, rewardPoints: 45, rewardCoins: 45, iconKey: "flame", weight: 2 },
  { key: "dogru-40", title: "40 soru doğru cevapla", description: "Günün toplamında 40 doğru cevaba ulaş.", metric: "correct_any", target: 40, rewardXp: 130, rewardPoints: 50, rewardCoins: 40, iconKey: "check", weight: 3 },
];

export const TASK_BY_KEY: Record<string, DailyTaskDef> = Object.fromEntries(
  DAILY_TASK_POOL.map((t) => [t.key, t]),
);

/** Kullanıcı + gün için deterministik 3 görev seçimi */
export function pickDailyTasks(userId: string, day: string, count = 3): DailyTaskDef[] {
  const seedStr = `${userId}::${day}`;
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const rand = () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >> 17;
    h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };

  const pool = [...DAILY_TASK_POOL];
  const chosen: DailyTaskDef[] = [];
  while (chosen.length < Math.min(count, pool.length)) {
    const idx = Math.floor(rand() * pool.length) % pool.length;
    const [t] = pool.splice(idx, 1);
    if (t) chosen.push(t);
  }
  return chosen;
}
