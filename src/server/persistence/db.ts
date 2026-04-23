import { readFileSync, readdirSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_DIR = join(__dirname, "../../../drizzle");

export type AppDatabase = BetterSQLite3Database<typeof schema>;

function splitMigrationStatements(migration: string): string[] {
  return migration
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function isIdempotentMigrationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  // "duplicate column name" — ALTER TABLE ADD COLUMN on a column already present
  // "already exists" — CREATE TABLE on a table already present
  // "no such column" — ALTER TABLE RENAME COLUMN on a column already renamed
  //   (the previous migration run already applied the rename, so the old
  //    source name no longer exists on re-run; the destination name does)
  return (
    message.includes("duplicate column name") ||
    message.includes("already exists") ||
    message.includes("no such column")
  );
}

export function createDatabase(dbPath: string): AppDatabase {
  try {
    if (dbPath !== ":memory:") {
      mkdirSync(dirname(dbPath), { recursive: true });
    }

    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    const migrationFiles = readdirSync(MIGRATION_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of migrationFiles) {
      const migration = readFileSync(join(MIGRATION_DIR, file), "utf8");
      for (const statement of splitMigrationStatements(migration)) {
        try {
          sqlite.exec(statement);
        } catch (err) {
          // Tolerate idempotent statements on already/partially migrated databases,
          // but keep applying the rest of the migration file.
          if (isIdempotentMigrationError(err)) {
            continue;
          }
          throw err;
        }
      }
    }

    return drizzle(sqlite, { schema });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to initialize Codence database: ${message}`);
  }
}

export function createTestDatabase(): AppDatabase {
  return createDatabase(":memory:");
}
