import { describe, expect, test } from "vitest";
import { createTestDatabase } from "../persistence/db.js";
import { bootstrapDefaultLearnspace } from "./bootstrap.js";
import { exportDatabase, EXPORT_FORMAT_VERSION } from "./export.js";
import { importDatabase, ImportError } from "./import.js";
import { learnspaces, users } from "../persistence/schema.js";

const now = () => new Date("2026-04-18T00:00:00.000Z");

describe("exportDatabase", () => {
  test("envelope has format + version + tables", () => {
    const db = createTestDatabase();
    bootstrapDefaultLearnspace({ db, now });
    const envelope = exportDatabase(db, "0.1.0");

    expect(envelope.format).toBe(EXPORT_FORMAT_VERSION);
    expect(envelope.appVersion).toBe("0.1.0");
    expect(typeof envelope.exportedAt).toBe("string");
    expect(Array.isArray(envelope.tables.users)).toBe(true);
    expect(Array.isArray(envelope.tables.learnspaces)).toBe(true);
    expect(envelope.tables.users.length).toBeGreaterThan(0);
  });

  test("export → import round-trip preserves row counts", () => {
    const src = createTestDatabase();
    bootstrapDefaultLearnspace({ db: src, now });
    const envelope = exportDatabase(src, "0.1.0");

    const dst = createTestDatabase();
    importDatabase(dst, envelope);

    const srcUsers = src.select().from(users).all();
    const dstUsers = dst.select().from(users).all();
    const srcLs = src.select().from(learnspaces).all();
    const dstLs = dst.select().from(learnspaces).all();

    expect(dstUsers.length).toBe(srcUsers.length);
    expect(dstLs.length).toBe(srcLs.length);
    expect(dstUsers[0].id).toBe(srcUsers[0].id);
    expect(dstLs[0].id).toBe(srcLs[0].id);
  });

  test("import is destructive — existing rows truncated", () => {
    const dst = createTestDatabase();
    bootstrapDefaultLearnspace({ db: dst, now });
    const beforeCount = dst.select().from(learnspaces).all().length;
    expect(beforeCount).toBeGreaterThan(0);

    // Empty envelope — zero tables.
    importDatabase(dst, {
      format: EXPORT_FORMAT_VERSION,
      exportedAt: "2026-04-18T00:00:00.000Z",
      appVersion: "0.1.0",
      tables: {},
    });

    expect(dst.select().from(learnspaces).all().length).toBe(0);
    expect(dst.select().from(users).all().length).toBe(0);
  });

  test("import refuses unknown format version", () => {
    const db = createTestDatabase();
    expect(() => importDatabase(db, {
      format: "codence-export/999" as never,
      exportedAt: "2026-04-18T00:00:00.000Z",
      appVersion: "0.1.0",
      tables: {},
    })).toThrow(ImportError);
  });
});
