import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";

/**
 * Tek bir SQLite bağlantısı üzerinden çalışan gerçek veritabanı katmanı.
 * - WAL modu: eşzamanlı okuma + tek yazar (30-100 kullanıcı için fazlasıyla yeterli)
 * - busy_timeout: kısa süreli kilit çakışmalarında otomatik bekleme
 * - foreign_keys: referans bütünlüğü zorunlu
 * - Migration'lar uygulama açılışında otomatik uygulanır (kurulum adımı yok).
 */

function resolveDbFile(): string {
  const raw = process.env.DATABASE_URL ?? "file:./data/matematik.db";
  const filePath = raw.replace(/^file:/, "");
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  return abs;
}

function createDb() {
  const file = resolveDbFile();
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");

  const db = drizzle(sqlite, { schema });

  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (fs.existsSync(migrationsFolder)) {
    migrate(db, { migrationsFolder });
  }

  return { db, sqlite };
}

type DbBundle = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { __mm_db?: DbBundle };

const bundle = globalForDb.__mm_db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__mm_db = bundle;

export const db = bundle.db;
export const sqlite = bundle.sqlite;
export { schema };
