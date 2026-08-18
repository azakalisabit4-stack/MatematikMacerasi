import "server-only";
import bcrypt from "bcryptjs";

const ROUNDS = 11;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export const PASSWORD_MIN = 6;

export function validatePasswordShape(pw: string): string | null {
  if (typeof pw !== "string" || pw.length < PASSWORD_MIN)
    return `Şifre en az ${PASSWORD_MIN} karakter olmalı.`;
  if (pw.length > 128) return "Şifre çok uzun.";
  return null;
}
