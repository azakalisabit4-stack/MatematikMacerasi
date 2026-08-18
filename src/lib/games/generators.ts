/**
 * Soru üreticileri — TAMAMEN SUNUCU TARAFI
 * -----------------------------------------------------------------------------
 * Doğru cevaplar hiçbir zaman istemciye gönderilmez; yalnızca seçenek metinleri
 * gider. Cevap doğrulaması `game-engine.ts` içinde veritabanındaki
 * `correct_index` ile yapılır.
 *
 * Her üretici, oyunun tüm kurallarını (negatif olmayan sonuçlar, tekrar etmeyen
 * sorular, geçerli aralıklar) garanti eder.
 */

import { pick, secureInt, shuffle } from "@/lib/ids";
import type { GeneratedQuestion, PreparedStart } from "./types";

/* ----------------------------------------------------------- YARDIMCILAR */

/** Doğru cevabın etrafında benzersiz, mantıklı çeldiriciler üretir. */
function numericOptions(correct: number, opts?: { spread?: number; min?: number; step?: number }): {
  options: string[];
  correctIndex: number;
} {
  const spread = opts?.spread ?? Math.max(3, Math.round(Math.abs(correct) * 0.2) || 3);
  const min = opts?.min ?? 0;
  const step = opts?.step;

  const candidates = new Set<number>();
  const push = (v: number) => {
    if (v >= min && v !== correct && Number.isFinite(v)) candidates.add(v);
  };

  if (step) {
    push(correct + step);
    push(correct - step);
    push(correct + 1);
    push(correct - 1);
    push(correct + step + 1);
    push(correct - step - 1);
    push(correct + 2 * step);
  }

  let guard = 0;
  while (candidates.size < 8 && guard++ < 80) {
    const delta = secureInt(1, Math.max(2, spread));
    push(correct + delta);
    push(correct - delta);
  }
  // Son çare: yukarı doğru doldur
  let filler = correct + 1;
  while (candidates.size < 3) {
    push(filler++);
  }

  const wrongs = shuffle([...candidates]).slice(0, 3);
  const all = shuffle([correct, ...wrongs]);
  return { options: all.map(String), correctIndex: all.indexOf(correct) };
}

function optionsFromStrings(correct: string, wrongs: string[]): { options: string[]; correctIndex: number } {
  const uniqueWrongs = [...new Set(wrongs.filter((w) => w !== correct))].slice(0, 3);
  const all = shuffle([correct, ...uniqueWrongs]);
  return { options: all, correctIndex: all.indexOf(correct) };
}

const TL = (n: number) => `${n} TL`;

/* ================================================================
 * 1) RİTMİK SAYMA — TIRMANIŞ (ileri / geri, 1 ve 2 basamaklı)
 * ============================================================== */

/**
 * Öğrenciye sunulacak 4 başlangıç seçeneği.
 *  - İleri sayma: başlangıç, seçilen ritmik sayıya EŞİT OLAMAZ.
 *  - Geriye sayma: tüm 20 sorunun sonucu 0'ın altına düşmez ve
 *    son sonuç 10'un üzerine çıkmaz  →  start = adım × soru sayısı + (0..9)
 */
export function prepareClimbStarts(
  gameKey: string,
  step: number,
  questionCount: number,
): PreparedStart {
  const backwards = gameKey.startsWith("ritmik-geri");
  const twoDigit = gameKey.endsWith("-2");

  if (backwards) {
    const base = step * questionCount;
    const offsets = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
    return { step, startOptions: offsets.map((o) => base + o).sort((a, b) => a - b) };
  }

  if (twoDigit) {
    // 1-99 arası, ritmik sayının katı olmayan ve adımın kendisine eşit olmayan başlangıçlar
    const pool: number[] = [];
    for (let n = 3; n <= 99; n++) {
      if (n === step) continue;
      if (n % step === 0) continue;
      pool.push(n);
    }
    return { step, startOptions: shuffle(pool).slice(0, 4).sort((a, b) => a - b) };
  }

  // 1 basamaklı ileri: 1-9 arası, ritmik sayıya eşit olmayan
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== step);
  return { step, startOptions: shuffle(pool).slice(0, 4).sort((a, b) => a - b) };
}

export function generateClimb(
  gameKey: string,
  step: number,
  start: number,
  questionCount: number,
): GeneratedQuestion[] {
  const backwards = gameKey.startsWith("ritmik-geri");
  const questions: GeneratedQuestion[] = [];
  let current = start;

  for (let i = 0; i < questionCount; i++) {
    const answer = backwards ? current - step : current + step;
    const safeAnswer = Math.max(0, answer);
    // İleri sayarken 0 gibi anlamsız çeldiriciler üretilmesin.
    const { options, correctIndex } = numericOptions(safeAnswer, {
      step,
      min: backwards ? 0 : 1,
    });

    questions.push({
      prompt: backwards
        ? `${step}'er geriye ritmik sayarken ${current}'den önce gelen sayı hangisidir?`
        : `${step}'er ritmik sayarken ${current}'den sonra gelen sayı hangisidir?`,
      options,
      correctIndex,
      opType: backwards ? "sub" : "add",
      payload: {
        current,
        step,
        backwards,
        stepIndex: i,
        answer: undefined, // istemciye asla gitmez (engine ayıklar)
      },
    });
    current = safeAnswer;
  }
  return questions;
}

/* ================================================================
 * 2) ÇARPIM TABLOSU
 * ============================================================== */

export function generateMultiplicationTable(variant: string): GeneratedQuestion[] {
  const range =
    variant === "kucuk" ? [1, 5] : variant === "buyuk" ? [6, 9] : [1, 9];

  // Benzersiz kombinasyonlar: 6×5 sorulduysa 5×6 tekrar sorulmaz.
  const pairs: Array<[number, number]> = [];
  for (let a = range[0]; a <= range[1]; a++) {
    for (let b = a; b <= range[1]; b++) {
      pairs.push([a, b]);
    }
  }

  return shuffle(pairs).map(([a, b]) => {
    const correct = a * b;
    const wrongPool = new Set<number>();
    wrongPool.add(a * (b + 1));
    wrongPool.add(a * Math.max(1, b - 1));
    wrongPool.add((a + 1) * b);
    wrongPool.add(correct + a);
    wrongPool.add(correct - a);
    wrongPool.add(correct + b);
    wrongPool.add(correct + 1);
    const wrongs = shuffle([...wrongPool].filter((w) => w !== correct && w > 0)).slice(0, 3);
    const all = shuffle([correct, ...wrongs]);
    return {
      prompt: `${a} × ${b} = ?`,
      options: all.map(String),
      correctIndex: all.indexOf(correct),
      opType: "mul" as const,
      payload: { a, b, symbol: "×", easy: a === 1 || b === 1 },
    };
  });
}

/* ================================================================
 * 3) HIZLI İŞLEM
 * ============================================================== */

export function generateFastOps(variant: string, count: number): GeneratedQuestion[] {
  const bounds =
    variant === "kolay" ? { max: 20, mul: 5 } : variant === "zor" ? { max: 99, mul: 12 } : { max: 50, mul: 9 };

  const out: GeneratedQuestion[] = [];
  const seen = new Set<string>();
  let guard = 0;

  while (out.length < count && guard++ < count * 30) {
    const kind = pick(["add", "sub", "mul"] as const);
    let a: number, b: number, correct: number, symbol: string;

    if (kind === "add") {
      a = secureInt(2, bounds.max);
      b = secureInt(2, bounds.max);
      correct = a + b;
      symbol = "+";
    } else if (kind === "sub") {
      a = secureInt(5, bounds.max);
      b = secureInt(1, a); // sonuç asla negatif olmaz
      correct = a - b;
      symbol = "−";
    } else {
      a = secureInt(2, bounds.mul);
      b = secureInt(2, bounds.mul);
      correct = a * b;
      symbol = "×";
    }

    const sig = `${a}${symbol}${b}`;
    if (seen.has(sig)) continue;
    seen.add(sig);

    const { options, correctIndex } = numericOptions(correct, { min: 0 });
    out.push({
      prompt: `${a} ${symbol} ${b} = ?`,
      options,
      correctIndex,
      opType: kind,
      payload: { a, b, symbol },
    });
  }
  return out;
}

/* ================================================================
 * 4) EKSİK SAYIYI BUL
 * ============================================================== */

export function generateMissingNumber(variant: string, count: number): GeneratedQuestion[] {
  const out: GeneratedQuestion[] = [];
  const seen = new Set<string>();
  let guard = 0;

  while (out.length < count && guard++ < count * 30) {
    const kind =
      variant === "karisik" || !variant
        ? pick(["add", "sub", "mul"] as const)
        : variant === "toplama"
          ? "add"
          : variant === "cikarma"
            ? "sub"
            : "mul";

    let prompt = "";
    let correct = 0;
    if (kind === "add") {
      const a = secureInt(2, 40);
      const missing = secureInt(2, 40);
      prompt = `${a} + ? = ${a + missing}`;
      correct = missing;
    } else if (kind === "sub") {
      const result = secureInt(1, 40);
      const missing = secureInt(1, 40);
      prompt = `${result + missing} − ? = ${result}`;
      correct = missing;
    } else {
      const a = secureInt(2, 9);
      const missing = secureInt(2, 9);
      prompt = `${a} × ? = ${a * missing}`;
      correct = missing;
    }

    if (seen.has(prompt)) continue;
    seen.add(prompt);

    const { options, correctIndex } = numericOptions(correct, { min: 1, spread: 6 });
    out.push({ prompt, options, correctIndex, opType: kind, payload: { kind } });
  }
  return out;
}

/* ================================================================
 * 5) SAYI DİZİSİ
 * ============================================================== */

export function generateSequence(variant: string, count: number): GeneratedQuestion[] {
  const out: GeneratedQuestion[] = [];
  let guard = 0;

  while (out.length < count && guard++ < count * 30) {
    const ascending =
      variant === "artan" ? true : variant === "azalan" ? false : secureInt(0, 1) === 1;
    const step = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 25]);
    const terms = 4;

    let start: number;
    if (ascending) {
      start = secureInt(1, 30);
    } else {
      start = step * (terms + 1) + secureInt(0, 20);
    }

    const seq: number[] = [];
    for (let i = 0; i < terms; i++) {
      seq.push(ascending ? start + i * step : start - i * step);
    }
    const correct = ascending ? start + terms * step : start - terms * step;
    if (correct < 0) continue;

    const { options, correctIndex } = numericOptions(correct, { step, min: 0 });
    out.push({
      prompt: `${seq.join("  →  ")}  →  ?`,
      options,
      correctIndex,
      opType: ascending ? "add" : "sub",
      payload: { sequence: seq, ascending, step },
    });
  }
  return out;
}

/* ================================================================
 * 6) İŞLEM EŞLEŞTİRME
 * ============================================================== */

/** 4'lü gruplar hâlinde eşleştirme tahtası. Her soru, grubun bir işlemidir. */
export function generateMatching(variant: string, groups: number): GeneratedQuestion[] {
  const hard = variant === "zor";
  const out: GeneratedQuestion[] = [];

  for (let g = 0; g < groups; g++) {
    const items: Array<{ expr: string; value: number; opType: "add" | "sub" | "mul" }> = [];
    const usedValues = new Set<number>();
    let guard = 0;

    while (items.length < 4 && guard++ < 200) {
      const kind = pick(["add", "sub", "mul"] as const);
      let expr = "";
      let value = 0;
      if (kind === "add") {
        const a = secureInt(2, hard ? 60 : 20);
        const b = secureInt(2, hard ? 60 : 20);
        expr = `${a} + ${b}`;
        value = a + b;
      } else if (kind === "sub") {
        const a = secureInt(6, hard ? 90 : 30);
        const b = secureInt(1, a - 1);
        expr = `${a} − ${b}`;
        value = a - b;
      } else {
        const a = secureInt(2, hard ? 12 : 9);
        const b = secureInt(2, hard ? 12 : 9);
        expr = `${a} × ${b}`;
        value = a * b;
      }
      if (usedValues.has(value)) continue;
      usedValues.add(value);
      items.push({ expr, value, opType: kind });
    }

    const results = shuffle(items.map((i) => i.value)).map(String);
    const order = shuffle(items);

    order.forEach((item, idx) => {
      out.push({
        prompt: item.expr,
        options: results,
        correctIndex: results.indexOf(String(item.value)),
        opType: item.opType,
        payload: {
          group: g,
          indexInGroup: idx,
          groupSize: order.length,
          board: order.map((o) => o.expr),
        },
      });
    });
  }
  return out;
}

/* ================================================================
 * 7) HEDEFİ VUR
 * ============================================================== */

export function generateTarget(variant: string, count: number): GeneratedQuestion[] {
  const hard = variant === "zor";
  const out: GeneratedQuestion[] = [];
  let guard = 0;

  while (out.length < count && guard++ < count * 30) {
    const makeExpr = (): { expr: string; value: number; opType: "add" | "sub" | "mul" } => {
      const kind = pick(["add", "sub", "mul"] as const);
      if (kind === "add") {
        const a = secureInt(2, hard ? 60 : 25);
        const b = secureInt(2, hard ? 60 : 25);
        return { expr: `${a} + ${b}`, value: a + b, opType: "add" };
      }
      if (kind === "sub") {
        const a = secureInt(6, hard ? 90 : 40);
        const b = secureInt(1, a - 1);
        return { expr: `${a} − ${b}`, value: a - b, opType: "sub" };
      }
      const a = secureInt(2, hard ? 12 : 9);
      const b = secureInt(2, hard ? 12 : 9);
      return { expr: `${a} × ${b}`, value: a * b, opType: "mul" };
    };

    const correctExpr = makeExpr();
    const wrongs: string[] = [];
    const usedValues = new Set([correctExpr.value]);
    let g2 = 0;
    while (wrongs.length < 3 && g2++ < 60) {
      const w = makeExpr();
      if (usedValues.has(w.value)) continue;
      usedValues.add(w.value);
      wrongs.push(w.expr);
    }
    if (wrongs.length < 3) continue;

    const { options, correctIndex } = optionsFromStrings(correctExpr.expr, wrongs);
    out.push({
      prompt: `Hedef: ${correctExpr.value}`,
      options,
      correctIndex,
      opType: correctExpr.opType,
      payload: { target: correctExpr.value },
    });
  }
  return out;
}

/* ================================================================
 * 8) MATEMATİK PARKURU
 * ============================================================== */

export function generateTrack(variant: string, count: number): GeneratedQuestion[] {
  const base = generateFastOps("orta", count);
  return base.map((q, i) => ({
    ...q,
    payload: { ...q.payload, lane: i % 3, scene: variant, obstacle: i % 5 === 4 },
  }));
}

/* ================================================================
 * 9) MATEMATİK MARKETİ
 * ============================================================== */

const MARKET_ITEMS: Array<{ name: string; icon: string; min: number; max: number }> = [
  { name: "Ekmek", icon: "bread", min: 5, max: 15 },
  { name: "Süt", icon: "milk", min: 15, max: 35 },
  { name: "Peynir", icon: "cheese", min: 40, max: 90 },
  { name: "Elma", icon: "apple", min: 10, max: 30 },
  { name: "Muz", icon: "banana", min: 15, max: 40 },
  { name: "Yumurta", icon: "egg", min: 30, max: 70 },
  { name: "Çikolata", icon: "chocolate", min: 8, max: 25 },
  { name: "Defter", icon: "notebook", min: 12, max: 35 },
  { name: "Kalem", icon: "pencil", min: 5, max: 20 },
  { name: "Kitap", icon: "book", min: 45, max: 120 },
];

export function generateMarket(variant: string, count: number): GeneratedQuestion[] {
  const out: GeneratedQuestion[] = [];
  let guard = 0;

  while (out.length < count && guard++ < count * 20) {
    const kind =
      variant === "karisik" || !variant ? pick(["toplam", "paraustu"] as const) : (variant as "toplam" | "paraustu");

    const picked = shuffle(MARKET_ITEMS).slice(0, secureInt(2, 3));
    const prices = picked.map((p) => secureInt(p.min, p.max));
    const total = prices.reduce((a, b) => a + b, 0);

    if (kind === "toplam") {
      const { options, correctIndex } = numericOptions(total, { min: 0, spread: 12 });
      out.push({
        prompt: `${picked.map((p, i) => `${p.name} ${TL(prices[i])}`).join(", ")} alındı. Toplam ne kadar öder?`,
        options: options.map((o) => TL(Number(o))),
        correctIndex,
        opType: "add",
        payload: { items: picked.map((p, i) => ({ name: p.name, icon: p.icon, price: prices[i] })), kind },
      });
    } else {
      const paid = Math.ceil((total + secureInt(5, 60)) / 10) * 10;
      const change = paid - total;
      const { options, correctIndex } = numericOptions(change, { min: 0, spread: 12 });
      out.push({
        prompt: `${picked.map((p, i) => `${p.name} ${TL(prices[i])}`).join(", ")} alındı ve kasaya ${TL(paid)} verildi. Para üstü ne kadar?`,
        options: options.map((o) => TL(Number(o))),
        correctIndex,
        opType: "sub",
        payload: {
          items: picked.map((p, i) => ({ name: p.name, icon: p.icon, price: prices[i] })),
          paid,
          kind,
        },
      });
    }
  }
  return out;
}

/* ================================================================
 * 10) MATEMATİK BANKASI
 * ============================================================== */

export function generateBank(variant: string, count: number): GeneratedQuestion[] {
  const out: GeneratedQuestion[] = [];
  let guard = 0;

  while (out.length < count && guard++ < count * 20) {
    const kind =
      variant === "karisik" || !variant ? pick(["birikim", "butce"] as const) : (variant as "birikim" | "butce");

    if (kind === "birikim") {
      const weekly = secureInt(5, 40);
      const weeks = secureInt(3, 12);
      const correct = weekly * weeks;
      const { options, correctIndex } = numericOptions(correct, { min: 0, spread: 20, step: weekly });
      out.push({
        prompt: `Her hafta ${TL(weekly)} biriktiren bir öğrenci ${weeks} hafta sonra kaç TL biriktirmiş olur?`,
        options: options.map((o) => TL(Number(o))),
        correctIndex,
        opType: "mul",
        payload: { weekly, weeks, kind },
      });
    } else {
      const budget = secureInt(60, 300);
      const spent = secureInt(10, budget - 5);
      const correct = budget - spent;
      const { options, correctIndex } = numericOptions(correct, { min: 0, spread: 15 });
      out.push({
        prompt: `Hesabında ${TL(budget)} olan bir öğrenci ${TL(spent)} harcadı. Geriye kaç TL kalır?`,
        options: options.map((o) => TL(Number(o))),
        correctIndex,
        opType: "sub",
        payload: { budget, spent, kind },
      });
    }
  }
  return out;
}

/* ================================================================
 * 11) BOSS SAVAŞI
 * ============================================================== */

export function generateBoss(variant: string, count: number): GeneratedQuestion[] {
  const base =
    variant === "ejderha" ? generateFastOps("zor", count) : generateFastOps("orta", count);
  const hp = count;
  return base.map((q, i) => ({
    ...q,
    payload: { ...q.payload, boss: variant, maxHp: hp, phase: i < count / 3 ? 1 : i < (2 * count) / 3 ? 2 : 3 },
  }));
}

/* ================================================================
 * DÜELLO SORULARI (karışık, iki oyuncuya da aynı sırayla)
 * ============================================================== */

export function generateDuelQuestions(count: number): GeneratedQuestion[] {
  const pools = [
    ...generateFastOps("orta", Math.ceil(count / 2)),
    ...generateMultiplicationTable("tam").slice(0, Math.ceil(count / 2)),
    ...generateMissingNumber("karisik", Math.ceil(count / 2)),
  ];
  return shuffle(pools).slice(0, count);
}
