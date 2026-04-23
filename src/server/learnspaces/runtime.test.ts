import { eq } from "drizzle-orm";
import { createTestDatabase } from "../persistence/db.js";
import { learnspaces, users } from "../persistence/schema.js";
import { resolveLearnspaceRuntime, LearnspaceRuntimeResolutionError } from "./runtime.js";
import { config as codingInterviewConfig } from "./coding-interview-patterns.js";

describe("resolveLearnspaceRuntime", () => {
  test("fails closed for non-built-in learnspaces without explicit runtime metadata", () => {
    const db = createTestDatabase();
    const timestamp = "2026-04-13T12:00:00.000Z";

    db.insert(users)
      .values({
        id: "user-1",
        displayName: "Runtime User",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    db.insert(learnspaces)
      .values({
        id: "custom-runtime",
        userId: "user-1",
        name: "Custom Runtime",
        source: "user-generated",
        config: {
          id: "custom-runtime",
          name: "Custom Runtime",
          description: "No runtime metadata",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    const learnspace = db.select().from(learnspaces).where(eq(learnspaces.id, "custom-runtime")).get()!;

    expect(() => resolveLearnspaceRuntime(learnspace)).toThrow(LearnspaceRuntimeResolutionError);
  });

  test("resolves non-built-in learnspaces when runtime metadata is explicit in config", () => {
    const db = createTestDatabase();
    const timestamp = "2026-04-13T12:00:00.000Z";

    db.insert(users)
      .values({
        id: "user-1",
        displayName: "Runtime User",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    db.insert(learnspaces)
      .values({
        id: "custom-runtime",
        userId: "user-1",
        name: "Custom Runtime",
        source: "user-generated",
        config: {
          ...codingInterviewConfig,
          id: "custom-runtime",
          name: "Custom Runtime",
          familyId: "dsa",
          schedulerId: "sm5",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    const learnspace = db.select().from(learnspaces).where(eq(learnspaces.id, "custom-runtime")).get()!;
    const runtime = resolveLearnspaceRuntime(learnspace);

    expect(runtime.familyId).toBe("dsa");
    expect(runtime.schedulerId).toBe("sm5");
    expect(runtime.capabilities.familyId).toBe("dsa");
    expect(runtime.capabilities.sessionTypes).toContain("timed_solve");
    expect(runtime.capabilities.scopeDimensions).toContain("skill");
    expect(runtime.capabilities.generationCapabilities.supportsDifficultyTargeting).toBe(true);
  });

  test("fails closed for user-edited rows that still carry a built-in id but lack runtime metadata", () => {
    const db = createTestDatabase();
    const timestamp = "2026-04-14T12:00:00.000Z";

    db.insert(users)
      .values({
        id: "user-1",
        displayName: "Runtime User",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    // Build a config that matches a registered built-in id but has had
    // its runtime metadata stripped — simulating a user who edited the
    // learnspace row and removed familyId / schedulerId.
    const editedConfig: Record<string, unknown> = { ...codingInterviewConfig };
    delete editedConfig.familyId;
    delete editedConfig.schedulerId;

    db.insert(learnspaces)
      .values({
        id: codingInterviewConfig.id,
        userId: "user-1",
        name: "Edited Coding Interview",
        source: "user-edited",
        config: editedConfig as Record<string, unknown>,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    const learnspace = db
      .select()
      .from(learnspaces)
      .where(eq(learnspaces.id, codingInterviewConfig.id))
      .get()!;

    // Pre-fix behavior: the fallback looks up getBuiltInLearnspace(id)
    // and silently returns the built-in runtime. Post-fix: fails closed
    // because source === "user-edited" is NOT built-in.
    expect(() => resolveLearnspaceRuntime(learnspace)).toThrow(LearnspaceRuntimeResolutionError);
  });

  test("fails closed for stale built-in rows without explicit runtime metadata", () => {
    const db = createTestDatabase();
    const timestamp = "2026-04-14T12:00:00.000Z";

    db.insert(users)
      .values({
        id: "user-1",
        displayName: "Runtime User",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    const staleConfig: Record<string, unknown> = { ...codingInterviewConfig };
    delete staleConfig.familyId;
    delete staleConfig.schedulerId;

    db.insert(learnspaces)
      .values({
        id: codingInterviewConfig.id,
        userId: "user-1",
        name: "Stale Built-in",
        source: "built-in",
        config: staleConfig as Record<string, unknown>,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    const learnspace = db
      .select()
      .from(learnspaces)
      .where(eq(learnspaces.id, codingInterviewConfig.id))
      .get()!;

    expect(() => resolveLearnspaceRuntime(learnspace)).toThrow(LearnspaceRuntimeResolutionError);
  });
});
