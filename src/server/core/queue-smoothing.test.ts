import { describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "../persistence/db.js";
import { attempts, itemQueue, items, learnspaces, queue, skills, users } from "../persistence/schema.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import { resolveDailyCap, smoothOverdueQueue } from "./queue-smoothing.js";

const learnspaceId = "coding-interview-patterns";
const userId = "user-1";
const createdAt = "2026-04-01T00:00:00.000Z";
const TEST_CAP = 10;

function seedFixture(overdueDueDates: string[]) {
  const db = createTestDatabase();

  db.insert(users).values({
    id: userId,
    displayName: "Local User",
    activeLearnspaceId: learnspaceId,
    createdAt,
    updatedAt: createdAt,
  }).run();

  const config: Partial<LearnspaceConfig> = {
    id: learnspaceId,
    name: "fixture",
    familyId: "dsa",
    schedulerId: "sm5",
  };

  db.insert(learnspaces).values({
    id: learnspaceId,
    userId,
    name: "fixture",
    config: config as unknown as Record<string, unknown>,
    activeTag: null,
    interviewDate: null,
    createdAt,
    updatedAt: createdAt,
  }).run();

  db.insert(skills).values({
    id: "hash_map",
    learnspaceId,
    name: "Hash Map",
    category: "arrays",
    createdAt,
  }).run();

  if (overdueDueDates.length === 0) return db;

  db.insert(itemQueue).values(
    overdueDueDates.map((dueDate, index) => ({
      id: `iq-${index}`,
      learnspaceId,
      userId,
      itemId: `item-${index}`,
      skillId: "hash_map",
      intervalDays: 1,
      easeFactor: 2.5,
      round: 1,
      dueDate,
      lastOutcome: null,
      skipCount: 0,
      createdAt,
      updatedAt: createdAt,
    })),
  ).run();

  return db;
}

function seedCompletedAttempts(db: ReturnType<typeof createTestDatabase>, count: number, baseIso: string) {
  const base = new Date(baseIso).getTime();
  db.insert(items).values(
    Array.from({ length: count }, (_, i) => ({
      id: `att-item-${i}`,
      learnspaceId,
      title: `Problem ${i}`,
      content: { prompt: "p", function_name: "f" },
      skillIds: ["hash_map"],
      tags: [],
      difficulty: "easy" as const,
      source: "seed",
      status: "active",
      parentItemId: null,
      createdAt,
    })),
  ).run();
  db.insert(attempts).values(
    Array.from({ length: count }, (_, i) => ({
      id: `att-${i}`,
      learnspaceId,
      userId,
      itemId: `att-item-${i}`,
      sessionId: null,
      outcome: "clean",
      selectionContext: null,
      workSnapshot: {},
      startedAt: new Date(base + i * 60_000).toISOString(),
      completedAt: new Date(base + i * 60_000 + 30_000).toISOString(),
    })),
  ).run();
}

describe("smoothOverdueQueue", () => {
  test("no-op when pile fits within daily cap", () => {
    const overdue = Array.from({ length: TEST_CAP }, (_, i) =>
      new Date(Date.UTC(2026, 2, i + 1)).toISOString(),
    );
    const db = seedFixture(overdue);
    const before = db.select().from(itemQueue).all().map((r) => r.dueDate);

    smoothOverdueQueue(
      db,
      { learnspaceId, userId, now: new Date("2026-04-15T12:00:00.000Z") },
      TEST_CAP,
    );

    const after = db.select().from(itemQueue).all().map((r) => r.dueDate);
    expect(after).toEqual(before);
  });

  test("spreads pile across days when overdue exceeds cap", () => {
    const overdue = Array.from({ length: TEST_CAP * 2 + 3 }, (_, i) =>
      new Date(Date.UTC(2026, 2, i + 1)).toISOString(),
    );
    const db = seedFixture(overdue);

    smoothOverdueQueue(
      db,
      { learnspaceId, userId, now: new Date("2026-04-15T12:00:00.000Z") },
      TEST_CAP,
    );

    const dayStart = new Date(Date.UTC(2026, 3, 15)).getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const counts = new Map<string, number>();
    for (const r of db.select().from(itemQueue).all()) {
      counts.set(r.dueDate!, (counts.get(r.dueDate!) ?? 0) + 1);
    }
    expect(counts.get(new Date(dayStart).toISOString())).toBe(TEST_CAP);
    expect(counts.get(new Date(dayStart + MS_PER_DAY).toISOString())).toBe(TEST_CAP);
    expect(counts.get(new Date(dayStart + 2 * MS_PER_DAY).toISOString())).toBe(3);
  });

  test("preserves scheduledDate when rewriting dueDate", () => {
    const originals = Array.from({ length: TEST_CAP + 5 }, (_, i) =>
      new Date(Date.UTC(2026, 2, i + 1)).toISOString(),
    );
    const db = seedFixture(originals);
    // seedFixture only sets dueDate; mirror into scheduledDate explicitly so
    // we can assert smoothing doesn't touch it.
    for (let i = 0; i < originals.length; i++) {
      db.update(itemQueue)
        .set({ scheduledDate: originals[i] })
        .where(eq(itemQueue.id, `iq-${i}`))
        .run();
    }

    smoothOverdueQueue(
      db,
      { learnspaceId, userId, now: new Date("2026-04-15T12:00:00.000Z") },
      TEST_CAP,
    );

    for (let i = 0; i < originals.length; i++) {
      const row = db.select().from(itemQueue).all().find((r) => r.id === `iq-${i}`);
      expect(row?.scheduledDate).toBe(originals[i]);
      expect(row?.dueDate).not.toBe(originals[i]);
    }
  });

  test("idempotent: second run produces no further changes", () => {
    const overdue = Array.from({ length: TEST_CAP * 3 + 5 }, (_, i) =>
      new Date(Date.UTC(2026, 2, i + 1)).toISOString(),
    );
    const db = seedFixture(overdue);
    const now = new Date("2026-04-15T12:00:00.000Z");

    smoothOverdueQueue(db, { learnspaceId, userId, now }, TEST_CAP);
    const afterFirst = db.select().from(itemQueue).all().map((r) => r.dueDate).sort();

    smoothOverdueQueue(db, { learnspaceId, userId, now }, TEST_CAP);
    const afterSecond = db.select().from(itemQueue).all().map((r) => r.dueDate).sort();

    expect(afterSecond).toEqual(afterFirst);
  });

  test("skips rows scoped to other users/learnspaces", () => {
    const db = seedFixture(
      Array.from({ length: TEST_CAP + 2 }, (_, i) =>
        new Date(Date.UTC(2026, 2, i + 1)).toISOString(),
      ),
    );

    db.insert(itemQueue).values({
      id: "iq-other-user",
      learnspaceId,
      userId: "user-other",
      itemId: "item-other",
      skillId: "hash_map",
      intervalDays: 1,
      easeFactor: 2.5,
      round: 1,
      dueDate: "2026-01-01T09:00:00.000Z",
      lastOutcome: null,
      skipCount: 0,
      createdAt,
      updatedAt: createdAt,
    }).run();

    smoothOverdueQueue(
      db,
      { learnspaceId, userId, now: new Date("2026-04-15T12:00:00.000Z") },
      TEST_CAP,
    );

    const other = db
      .select()
      .from(itemQueue)
      .all()
      .find((r) => r.id === "iq-other-user");
    expect(other?.dueDate).toBe("2026-01-01T09:00:00.000Z");
  });

  test("also spreads skill-level queue rows when overdue exceeds cap", () => {
    const db = createTestDatabase();

    db.insert(users).values({
      id: userId,
      displayName: "Local User",
      activeLearnspaceId: learnspaceId,
      createdAt,
      updatedAt: createdAt,
    }).run();

    db.insert(learnspaces).values({
      id: learnspaceId,
      userId,
      name: "fixture",
      config: { id: learnspaceId, name: "fixture", familyId: "dsa", schedulerId: "sm5" } as unknown as Record<string, unknown>,
      activeTag: null,
      interviewDate: null,
      createdAt,
      updatedAt: createdAt,
    }).run();

    const skillIds = Array.from({ length: TEST_CAP + 3 }, (_, i) => `skill-${i}`);
    db.insert(skills).values(
      skillIds.map((id) => ({
        id,
        learnspaceId,
        name: id,
        category: "arrays",
        createdAt,
      })),
    ).run();

    db.insert(queue).values(
      skillIds.map((skillId, i) => ({
        id: `q-${i}`,
        learnspaceId,
        userId,
        skillId,
        intervalDays: 1,
        easeFactor: 2.5,
        round: 1,
        dueDate: new Date(Date.UTC(2026, 2, i + 1)).toISOString(),
        lastOutcome: null,
        skipCount: 0,
        createdAt,
        updatedAt: createdAt,
      })),
    ).run();

    smoothOverdueQueue(
      db,
      { learnspaceId, userId, now: new Date("2026-04-15T12:00:00.000Z") },
      TEST_CAP,
    );

    const dayStart = new Date(Date.UTC(2026, 3, 15)).getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const counts = new Map<string, number>();
    for (const r of db.select().from(queue).all()) {
      counts.set(r.dueDate!, (counts.get(r.dueDate!) ?? 0) + 1);
    }
    expect(counts.get(new Date(dayStart).toISOString())).toBe(TEST_CAP);
    expect(counts.get(new Date(dayStart + MS_PER_DAY).toISOString())).toBe(3);
  });
});

describe("resolveDailyCap", () => {
  test("cold start: uses learnspace defaultDailyCap when history < 7", () => {
    const db = seedFixture([]);
    seedCompletedAttempts(db, 3, "2026-04-10T00:00:00.000Z");

    const cap = resolveDailyCap(
      db,
      { learnspaceId, userId, now: new Date("2026-04-15T12:00:00.000Z") },
      { defaultDailyCap: 5 },
    );
    expect(cap).toBe(5);
  });

  test("cold start: falls back to 5 when defaultDailyCap omitted", () => {
    const db = seedFixture([]);
    const cap = resolveDailyCap(
      db,
      { learnspaceId, userId, now: new Date("2026-04-15T12:00:00.000Z") },
      null,
    );
    expect(cap).toBe(5);
  });

  test("adaptive: uses rolling 7d throughput × 1.5 once history ≥ 7", () => {
    const db = seedFixture([]);
    // 14 attempts in last 7 days → 2/day → ceil(2 * 1.5) = 3
    seedCompletedAttempts(db, 14, "2026-04-10T00:00:00.000Z");

    const cap = resolveDailyCap(
      db,
      { learnspaceId, userId, now: new Date("2026-04-15T12:00:00.000Z") },
      { defaultDailyCap: 20 },
    );
    expect(cap).toBe(3);
  });

  test("adaptive: clamps to MIN_DAILY_CAP when throughput rounds to zero", () => {
    const db = seedFixture([]);
    // 7 attempts total, but all outside the 7-day window → throughput = 0
    seedCompletedAttempts(db, 7, "2026-02-01T00:00:00.000Z");

    const cap = resolveDailyCap(
      db,
      { learnspaceId, userId, now: new Date("2026-04-15T12:00:00.000Z") },
      { defaultDailyCap: 5 },
    );
    expect(cap).toBe(1);
  });

  test("adaptive: clamps to MAX_DAILY_CAP for high throughput", () => {
    const db = seedFixture([]);
    // 200 attempts in last 7 days → ~28.6/day → ceil(28.6 * 1.5) = 43 → clamp to 30
    seedCompletedAttempts(db, 200, "2026-04-13T00:00:00.000Z");

    const cap = resolveDailyCap(
      db,
      { learnspaceId, userId, now: new Date("2026-04-15T12:00:00.000Z") },
      { defaultDailyCap: 5 },
    );
    expect(cap).toBe(30);
  });
});
