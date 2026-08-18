import { randomBytes, randomInt } from "node:crypto";

/** Çakışma ihtimali pratikte sıfır olan, sıralanabilir kimlik üretimi. */
export function createId(prefix = ""): string {
  const time = Date.now().toString(36);
  const rand = randomBytes(8).toString("hex");
  return `${prefix}${time}${rand}`;
}

/** Kriptografik olarak güvenli tamsayı [min, max] */
export function secureInt(min: number, max: number): number {
  if (max <= min) return min;
  return randomInt(min, max + 1);
}

/** Kriptografik güvenli karıştırma (Fisher-Yates) */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length)];
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
