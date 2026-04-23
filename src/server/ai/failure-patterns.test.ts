import { extractFailurePatterns } from "./failure-patterns.js";
import { createTestDatabase } from "../persistence/db.js";
import { attempts, items, learnspaces, users } from "../persistence/schema.js";

function seedDB() {
  const db = createTestDatabase();
  const userId = "user-1";
  const learnspaceId = "test-ls";
  const ts = "2026-04-01T00:00:00Z";

  db.insert(users).values({ id: userId, activeLearnspaceId: learnspaceId, createdAt: ts, updatedAt: ts }).run();
  db.insert(learnspaces).values({ id: learnspaceId, userId, name: "Test", config: {}, createdAt: ts, updatedAt: ts }).run();
  db.insert(items).values({ id: "item-1", learnspaceId, title: "Two Sum", content: {}, skillIds: ["hash_map"], tags: [], difficulty: "easy", source: "seed", createdAt: ts }).run();
  db.insert(items).values({ id: "item-2", learnspaceId, title: "3Sum", content: {}, skillIds: ["hash_map"], tags: [], difficulty: "medium", source: "seed", createdAt: ts }).run();

  return { db, userId, learnspaceId };
}

describe("failure pattern extraction", () => {
  // AC-1: extracts from recent attempts
  test("extracts failure patterns from recent attempts", () => {
    const { db, userId, learnspaceId } = seedDB();

    db.insert(attempts).values({
      id: "att-1", learnspaceId, userId, itemId: "item-1",
      outcome: "assisted", startedAt: "2026-04-05T00:00:00Z", completedAt: "2026-04-05T01:00:00Z",
      structuredEvaluation: { outcome: "assisted", diagnosis: "test", severity: "moderate", approach_correct: true, per_step_quality: {}, strengths: [], mistakes: [{ type: "off_by_one", description: "Wrong boundary", step: "code" }], coaching_summary: "" },
    }).run();
    db.insert(attempts).values({
      id: "att-2", learnspaceId, userId, itemId: "item-2",
      outcome: "failed", startedAt: "2026-04-06T00:00:00Z", completedAt: "2026-04-06T01:00:00Z",
      structuredEvaluation: { outcome: "failed", diagnosis: "test", severity: "critical", approach_correct: false, per_step_quality: {}, strengths: [], mistakes: [{ type: "off_by_one", description: "Again", step: "code" }, { type: "wrong_pattern", description: "Used BFS", step: "approach" }], coaching_summary: "" },
    }).run();

    const patterns = extractFailurePatterns(db, "hash_map", learnspaceId);

    expect(patterns.length).toBe(2);
    expect(patterns[0].type).toBe("off_by_one");
    expect(patterns[0].count).toBe(2);
    expect(patterns[1].type).toBe("wrong_pattern");
    expect(patterns[1].count).toBe(1);
  });

  // AC-2: counts and tracks recency
  test("counts recurring mistakes and tracks recency", () => {
    const { db, userId, learnspaceId } = seedDB();

    db.insert(attempts).values({
      id: "att-1", learnspaceId, userId, itemId: "item-1",
      outcome: "failed", startedAt: "2026-04-03T00:00:00Z", completedAt: "2026-04-03T01:00:00Z",
      structuredEvaluation: { outcome: "failed", diagnosis: "", severity: "minor", approach_correct: true, per_step_quality: {}, strengths: [], mistakes: [{ type: "edge_case", description: "Missed empty", step: "code" }], coaching_summary: "" },
    }).run();
    db.insert(attempts).values({
      id: "att-2", learnspaceId, userId, itemId: "item-2",
      outcome: "assisted", startedAt: "2026-04-07T00:00:00Z", completedAt: "2026-04-07T01:00:00Z",
      structuredEvaluation: { outcome: "assisted", diagnosis: "", severity: "moderate", approach_correct: true, per_step_quality: {}, strengths: [], mistakes: [{ type: "edge_case", description: "Missed null", step: "code" }], coaching_summary: "" },
    }).run();

    const patterns = extractFailurePatterns(db, "hash_map", learnspaceId);

    expect(patterns[0].type).toBe("edge_case");
    expect(patterns[0].count).toBe(2);
    expect(patterns[0].lastSeenAt).toBe("2026-04-07T01:00:00Z");
    expect(patterns[0].lastSeenItemId).toBe("item-2");
  });

  // AC-3: sorted by count descending
  test("sorts patterns by count descending", () => {
    const { db, userId, learnspaceId } = seedDB();

    for (let i = 0; i < 3; i++) {
      db.insert(attempts).values({
        id: `att-${i}`, learnspaceId, userId, itemId: "item-1",
        outcome: "failed", startedAt: `2026-04-0${i + 1}T00:00:00Z`, completedAt: `2026-04-0${i + 1}T01:00:00Z`,
        structuredEvaluation: { outcome: "failed", diagnosis: "", severity: "minor", approach_correct: false, per_step_quality: {}, strengths: [], mistakes: [{ type: "common_error", description: "x", step: "code" }], coaching_summary: "" },
      }).run();
    }
    db.insert(attempts).values({
      id: "att-rare", learnspaceId, userId, itemId: "item-1",
      outcome: "assisted", startedAt: "2026-04-04T00:00:00Z", completedAt: "2026-04-04T01:00:00Z",
      structuredEvaluation: { outcome: "assisted", diagnosis: "", severity: "minor", approach_correct: true, per_step_quality: {}, strengths: [], mistakes: [{ type: "rare_error", description: "y", step: "code" }], coaching_summary: "" },
    }).run();

    const patterns = extractFailurePatterns(db, "hash_map", learnspaceId);

    expect(patterns[0].type).toBe("common_error");
    expect(patterns[0].count).toBe(3);
    expect(patterns[1].type).toBe("rare_error");
    expect(patterns[1].count).toBe(1);
  });

  // EC-1: no attempts
  test("returns empty array for skill with no attempts", () => {
    const { db, learnspaceId } = seedDB();
    const patterns = extractFailurePatterns(db, "hash_map", learnspaceId);
    expect(patterns).toEqual([]);
  });

  // EC-2: attempts with no mistakes
  test("returns empty array when no attempts have mistakes", () => {
    const { db, userId, learnspaceId } = seedDB();

    db.insert(attempts).values({
      id: "att-clean", learnspaceId, userId, itemId: "item-1",
      outcome: "clean", startedAt: "2026-04-05T00:00:00Z", completedAt: "2026-04-05T01:00:00Z",
      structuredEvaluation: { outcome: "clean", diagnosis: "none", severity: "minor", approach_correct: true, per_step_quality: {}, strengths: ["Good"], mistakes: [], coaching_summary: "" },
    }).run();

    const patterns = extractFailurePatterns(db, "hash_map", learnspaceId);
    expect(patterns).toEqual([]);
  });

  // ERR-1: malformed evaluation JSON
  test("skips attempts with malformed evaluation JSON", () => {
    const { db, userId, learnspaceId } = seedDB();

    db.insert(attempts).values({
      id: "att-bad", learnspaceId, userId, itemId: "item-1",
      outcome: "failed", startedAt: "2026-04-05T00:00:00Z", completedAt: "2026-04-05T01:00:00Z",
      structuredEvaluation: "not an object" as unknown as Record<string, unknown>,
    }).run();
    db.insert(attempts).values({
      id: "att-good", learnspaceId, userId, itemId: "item-2",
      outcome: "assisted", startedAt: "2026-04-06T00:00:00Z", completedAt: "2026-04-06T01:00:00Z",
      structuredEvaluation: { outcome: "assisted", diagnosis: "", severity: "minor", approach_correct: true, per_step_quality: {}, strengths: [], mistakes: [{ type: "valid_error", description: "ok", step: "code" }], coaching_summary: "" },
    }).run();

    const patterns = extractFailurePatterns(db, "hash_map", learnspaceId);
    expect(patterns.length).toBe(1);
    expect(patterns[0].type).toBe("valid_error");
  });
});
