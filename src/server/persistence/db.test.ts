import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { eq, sql } from "drizzle-orm";
import { createDatabase, createTestDatabase } from "./db.js";
import { artifactLineage, CANONICAL_TABLES, items, learnspaces, users } from "./schema.js";

function createTimestamp(): string {
  return "2026-04-08T00:00:00.000Z";
}

describe("database bootstrap", () => {
  test("AC-1 creates the canonical tables when initializing a file-backed database", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "codence-db-"));
    const dbPath = path.join(tempDir, "codence.sqlite");

    try {
      createDatabase(dbPath);

      const sqlite = new Database(dbPath, { readonly: true });

      try {
        const rows = sqlite
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
          )
          .all() as Array<{ name: string }>;

        expect(rows.map((row) => row.name)).toEqual([...CANONICAL_TABLES].sort());
      } finally {
        sqlite.close();
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("AC-2 createTestDatabase returns an isolated in-memory database with migrations applied", () => {
    const first = createTestDatabase();
    const second = createTestDatabase();
    const timestamp = createTimestamp();

    first
      .insert(users)
      .values({
        id: "user-1",
        displayName: "First User",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    second
      .insert(users)
      .values({
        id: "user-1",
        displayName: "Second User",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    const firstUser = first.select().from(users).where(eq(users.id, "user-1")).get();
    const secondUser = second.select().from(users).where(eq(users.id, "user-1")).get();

    expect(firstUser?.displayName).toBe("First User");
    expect(secondUser?.displayName).toBe("Second User");
  });

  test("AC-3 preserves JSON payloads through database writes and reads", () => {
    const db = createTestDatabase();
    const timestamp = createTimestamp();

    db.insert(users)
      .values({
        id: "user-json",
        displayName: "JSON User",
        preferences: {
          editor: "vim",
          layout: "full",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    const insertedUser = db
      .select()
      .from(users)
      .where(eq(users.id, "user-json"))
      .get();

    expect(insertedUser?.preferences).toEqual({
      editor: "vim",
      layout: "full",
    });
  });

  test("EC-1 enables foreign-key enforcement on the migrated schema", () => {
    const db = createTestDatabase();
    const timestamp = createTimestamp();

    expect(() =>
      db
        .insert(learnspaces)
        .values({
          id: "ls-1",
          userId: "missing-user",
          name: "Broken Learnspace",
          config: { id: "broken" },
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  test("ERR-1 wraps filesystem initialization failures with a Codence-specific error", () => {
    expect(() => createDatabase("/dev/null/codence.sqlite")).toThrow(
      /Unable to initialize Codence database:/,
    );
  });

  test("regression exposes all canonical tables through sqlite_master", () => {
    const db = createTestDatabase();
    const rows = db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    );

    expect(rows.map((row) => row.name)).toEqual([...CANONICAL_TABLES].sort());
  });

  test("track schema stores only V2 track definitions after migration", () => {
    const db = createTestDatabase();
    const columns = db.all<{ name: string }>(sql`PRAGMA table_info(tracks)`);
    const columnNames = columns.map((column) => column.name);

    expect(columnNames).toContain("spec");
    expect(columnNames).toContain("program");
    expect(columnNames).not.toContain("intent");
    expect(columnNames).not.toContain("plan");
  });

  test("M2 regression resumes partially applied tracks migration statements", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "codence-db-partial-"));
    const dbPath = path.join(tempDir, "codence.sqlite");

    try {
      createDatabase(dbPath);

      const sqlite = new Database(dbPath);
      try {
        sqlite.exec("DROP TABLE tracks");
      } finally {
        sqlite.close();
      }

      createDatabase(dbPath);

      const migrated = new Database(dbPath, { readonly: true });
      try {
        const tracksTable = migrated
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tracks'")
          .get() as { name: string } | undefined;
        const learnspaceColumns = migrated
          .prepare("PRAGMA table_info(learnspaces)")
          .all() as Array<{ name: string }>;
        const sessionColumns = migrated
          .prepare("PRAGMA table_info(sessions)")
          .all() as Array<{ name: string }>;
        const attemptColumns = migrated
          .prepare("PRAGMA table_info(attempts)")
          .all() as Array<{ name: string }>;

        expect(tracksTable?.name).toBe("tracks");
        expect(learnspaceColumns.map((column) => column.name)).toContain("active_track_id");
        expect(learnspaceColumns.map((column) => column.name)).toContain("source");
        expect(sessionColumns.map((column) => column.name)).toContain("selection_context");
        expect(sessionColumns.map((column) => column.name)).toContain("blueprint_id");
        expect(sessionColumns.map((column) => column.name)).toContain("blueprint_version");
        expect(sessionColumns.map((column) => column.name)).toContain("blueprint_snapshot");
        expect(attemptColumns.map((column) => column.name)).toContain("selection_context");
        expect(attemptColumns.map((column) => column.name)).toContain("blueprint_id");
        expect(attemptColumns.map((column) => column.name)).toContain("blueprint_version");
        expect(attemptColumns.map((column) => column.name)).toContain("blueprint_snapshot");
        expect(attemptColumns.map((column) => column.name)).toContain("model_outcome");
        expect(attemptColumns.map((column) => column.name)).toContain("applied_overrides");
        expect(attemptColumns.map((column) => column.name)).toContain("evaluation_source");
        expect(attemptColumns.map((column) => column.name)).toContain("retry_recovered");
        expect(attemptColumns.map((column) => column.name)).toContain("stub_reason");
      } finally {
        migrated.close();
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("M3 regression backfills generated lineage when a legacy parent pointer is missing", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "codence-db-m3-lineage-"));
    const dbPath = path.join(tempDir, "codence.sqlite");
    const timestamp = createTimestamp();

    try {
      const db = createDatabase(dbPath);
      db.insert(users)
        .values({ id: "user-1", activeLearnspaceId: "ls-1", createdAt: timestamp, updatedAt: timestamp })
        .run();
      db.insert(learnspaces)
        .values({ id: "ls-1", userId: "user-1", name: "Legacy", config: {}, createdAt: timestamp, updatedAt: timestamp })
        .run();
      db.insert(items)
        .values({
          id: "generated-orphan-parent",
          learnspaceId: "ls-1",
          title: "Legacy Generated Problem",
          content: {},
          skillIds: ["arrays"],
          tags: [],
          difficulty: "easy",
          source: "generated",
          status: "active",
          parentItemId: "missing-parent",
          createdAt: timestamp,
          retiredAt: null,
        })
        .run();

      const migrated = createDatabase(dbPath);
      const lineage = migrated
        .select()
        .from(artifactLineage)
        .where(eq(artifactLineage.artifactId, "generated-orphan-parent"))
        .get();

      expect(lineage).toEqual(
        expect.objectContaining({
          artifactId: "generated-orphan-parent",
          parentArtifactId: null,
          source: "generated",
          generationMode: "variant",
          generatedForSkillId: "arrays",
        }),
      );
      expect(lineage?.metadata).toEqual(
        expect.objectContaining({
          backfilled: 1,
          legacyParentItemId: "missing-parent",
        }),
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
