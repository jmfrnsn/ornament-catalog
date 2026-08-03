import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrations";
import * as schema from "./schema";

type OrnamentDb = ReturnType<typeof drizzle<typeof schema>>;

let sqlite: Database.Database | undefined;
let db: OrnamentDb | undefined;

function getDatabasePath() {
  return (
    process.env.ORNAMENT_DB_PATH ??
    path.join(process.cwd(), "data", "ornament-research.sqlite")
  );
}

export function getSqlite() {
  if (!sqlite) {
    const databasePath = getDatabasePath();

    if (databasePath !== ":memory:") {
      fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    }

    sqlite = new Database(databasePath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    runMigrations(sqlite);
  }

  return sqlite;
}

export function getDb() {
  if (!db) {
    db = drizzle(getSqlite(), { schema });
  }

  return db;
}

export function resetDbForTests() {
  sqlite?.close();
  sqlite = undefined;
  db = undefined;
}
