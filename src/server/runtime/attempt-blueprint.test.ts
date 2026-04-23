import { createTestDatabase } from "../persistence/db.js";
import { attempts, items, learnspaces, sessions, users, type NewItem } from "../persistence/schema.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import {
  fromPinnedBlueprint,
  loadAttemptBlueprintForSession,
  parsePinnedBlueprint,
  resolveAttemptBlueprint,
  toPinnedBlueprint,
} from "./attempt-blueprint.js";

const TIMESTAMP = "2026-04-14T00:00:00.000Z";

function makeTestConfig(overrides: Partial<LearnspaceConfig> = {}): LearnspaceConfig {
  return {
    id: "test-ls",
    name: "Test Learnspace",
    description: "Synthetic config for blueprint tests",
    familyId: "dsa",
    schedulerId: "sm5",
    builtInVersion: 1,
    protocol_steps: [
      {
        id: "step-1",
        label: "Step 1",
        instruction: "Do the thing",
        agent_prompt: "coach the thing",
        editor: "text",
        layout: "inline",
      },
    ],
    coaching_persona: "test coach",
    evaluation_prompt: "evaluate: {work_snapshot}",
    variant_prompt: "generate variant",
    executor: null,
    item_schema: {},
    test_harness_template: "",
    skills: [{ id: "sk-1", name: "Skill One", category: "category-a" }],
    tags: [],
    tag_weights: {},
    confidence_gated_protocol_threshold: 0.5,
    interleaving_confidence_threshold: 0.5,
    ...overrides,
  };
}

function makeTestItem(overrides: Partial<NewItem> = {}): NewItem {
  return {
    id: "item-1",
    learnspaceId: "test-ls",
    slug: "item-1",
    title: "Test Item",
    content: { prompt: "solve it", function_name: "solve", test_cases: [], reference_solution: "" },
    skillIds: ["sk-1"],
    tags: [],
    difficulty: "easy",
    source: "seed",
    status: "active",
    parentItemId: null,
    createdAt: TIMESTAMP,
    retiredAt: null,
    ...overrides,
  };
}

function seedLearnspaceAndItem(db: ReturnType<typeof createTestDatabase>, config: LearnspaceConfig): NewItem {
  db.insert(users)
    .values({
      id: "user-1",
      displayName: "Test User",
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    })
    .run();
  db.insert(learnspaces)
    .values({
      id: "test-ls",
      userId: "user-1",
      name: "Test Learnspace",
      config: config as unknown as Record<string, unknown>,
      source: "built-in",
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    })
    .run();
  const item = makeTestItem();
  db.insert(items).values(item).run();
  return item;
}

describe("resolveAttemptBlueprint", () => {
  test("returns a protocol_solve blueprint for a valid DSA config", () => {
    const config = makeTestConfig();
    const item = makeTestItem();
    const blueprint = resolveAttemptBlueprint({
      learnspaceId: "test-ls",
      learnspaceConfig: config,
      item: item as Parameters<typeof resolveAttemptBlueprint>[0]["item"],
    });

    expect(blueprint.archetype).toBe("protocol_solve");
    expect(blueprint.blueprintId).toBe("protocol_solve:code_problem");
    expect(blueprint.blueprintVersion).toBe(1);
    expect(blueprint.familyId).toBe("dsa");
    expect(blueprint.schedulerId).toBe("sm5");
    expect(blueprint.learnspaceConfigVersion).toBe(1);
    expect(blueprint.learnspaceId).toBe("test-ls");
    expect(blueprint.item.id).toBe("item-1");
    expect(blueprint.item.skillIds).toEqual(["sk-1"]);
    expect(blueprint.config).toBe(config);
  });

  test("throws when learnspace config lacks familyId", () => {
    const config = makeTestConfig({ familyId: undefined });
    expect(() =>
      resolveAttemptBlueprint({
        learnspaceId: "test-ls",
        learnspaceConfig: config,
        item: makeTestItem() as Parameters<typeof resolveAttemptBlueprint>[0]["item"],
      }),
    ).toThrow(/runtime metadata/);
  });

  test("throws when learnspace config lacks schedulerId", () => {
    const config = makeTestConfig({ schedulerId: undefined });
    expect(() =>
      resolveAttemptBlueprint({
        learnspaceId: "test-ls",
        learnspaceConfig: config,
        item: makeTestItem() as Parameters<typeof resolveAttemptBlueprint>[0]["item"],
      }),
    ).toThrow(/runtime metadata/);
  });

  test("throws when scheduler is not allowed by the declared family", () => {
    const config = makeTestConfig({ schedulerId: "unknown-scheduler" as never });
    expect(() =>
      resolveAttemptBlueprint({
        learnspaceId: "test-ls",
        learnspaceConfig: config,
        item: makeTestItem() as Parameters<typeof resolveAttemptBlueprint>[0]["item"],
      }),
    ).toThrow(/not allowed by family/);
  });
});

describe("parsePinnedBlueprint", () => {
  test("accepts a snapshot produced by toPinnedBlueprint", () => {
    const blueprint = resolveAttemptBlueprint({
      learnspaceId: "test-ls",
      learnspaceConfig: makeTestConfig(),
      item: makeTestItem() as Parameters<typeof resolveAttemptBlueprint>[0]["item"],
    });
    expect(parsePinnedBlueprint(toPinnedBlueprint(blueprint))).not.toBeNull();
  });

  test("rejects non-object and missing-field values", () => {
    expect(parsePinnedBlueprint(null)).toBeNull();
    expect(parsePinnedBlueprint("not-a-blueprint")).toBeNull();
    expect(parsePinnedBlueprint({})).toBeNull();
    expect(parsePinnedBlueprint({ blueprintId: "x", blueprintVersion: 1 })).toBeNull();
  });

  test("rejects snapshots whose blueprintVersion does not match the current code version", () => {
    const blueprint = resolveAttemptBlueprint({
      learnspaceId: "test-ls",
      learnspaceConfig: makeTestConfig(),
      item: makeTestItem() as Parameters<typeof resolveAttemptBlueprint>[0]["item"],
    });
    const pinned = toPinnedBlueprint(blueprint);

    const higherVersion = { ...pinned, blueprintVersion: pinned.blueprintVersion + 1 };
    const lowerVersion = { ...pinned, blueprintVersion: 0 };

    expect(parsePinnedBlueprint(higherVersion)).toBeNull();
    expect(parsePinnedBlueprint(lowerVersion)).toBeNull();
    // Sanity check: the unchanged snapshot still parses.
    expect(parsePinnedBlueprint(pinned)).not.toBeNull();
  });
});

describe("toPinnedBlueprint / fromPinnedBlueprint", () => {
  test("strips non-runtime-contract fields from the snapshot", () => {
    const config = makeTestConfig();
    const blueprint = resolveAttemptBlueprint({
      learnspaceId: "test-ls",
      learnspaceConfig: config,
      item: makeTestItem() as Parameters<typeof resolveAttemptBlueprint>[0]["item"],
    });
    const pinned = toPinnedBlueprint(blueprint);

    expect(pinned.pinnedConfig.protocol_steps).toEqual(config.protocol_steps);
    expect(pinned.pinnedConfig.evaluation_prompt).toBe(config.evaluation_prompt);
    expect(pinned.pinnedConfig.coaching_persona).toBe(config.coaching_persona);
    expect(pinned.pinnedConfig.test_harness_template).toBe(config.test_harness_template);
    expect(pinned.pinnedConfig).not.toHaveProperty("tag_weights");
    expect(pinned.pinnedConfig).not.toHaveProperty("skills");
    expect(pinned.pinnedConfig).not.toHaveProperty("item_schema");
    expect(pinned.pinnedConfig).not.toHaveProperty("variant_prompt");
    expect(pinned.pinnedConfig).not.toHaveProperty("labels");
  });

  test("round-trips the runtime contract via toPinnedBlueprint + fromPinnedBlueprint", () => {
    const config = makeTestConfig();
    const blueprint = resolveAttemptBlueprint({
      learnspaceId: "test-ls",
      learnspaceConfig: config,
      item: makeTestItem() as Parameters<typeof resolveAttemptBlueprint>[0]["item"],
    });
    const pinned = toPinnedBlueprint(blueprint);
    const reassembled = fromPinnedBlueprint(pinned, config);

    expect(reassembled.blueprintId).toBe(blueprint.blueprintId);
    expect(reassembled.config.protocol_steps).toEqual(blueprint.config.protocol_steps);
    expect(reassembled.config.evaluation_prompt).toBe(blueprint.config.evaluation_prompt);
    expect(reassembled.config.coaching_persona).toBe(blueprint.config.coaching_persona);
    expect(reassembled.requiresExecution).toBe(blueprint.requiresExecution);
    expect(reassembled.item).toEqual(blueprint.item);
  });

  test("fromPinnedBlueprint uses pinned contract fields while cosmetic fields still update live", () => {
    const originalConfig = makeTestConfig();
    const blueprint = resolveAttemptBlueprint({
      learnspaceId: "test-ls",
      learnspaceConfig: originalConfig,
      item: makeTestItem() as Parameters<typeof resolveAttemptBlueprint>[0]["item"],
    });
    const pinned = toPinnedBlueprint(blueprint);

    const driftedConfig = makeTestConfig({
      evaluation_prompt: "DRIFTED evaluation prompt",
      coaching_persona: "drifted persona",
      labels: {
        itemSingular: "Challenge",
        itemPlural: "Challenges",
        skillSingular: "Topic",
        skillPlural: "Topics",
        masterySingular: "Understanding",
      },
    });
    const reassembled = fromPinnedBlueprint(pinned, driftedConfig);

    expect(reassembled.config.evaluation_prompt).toBe(originalConfig.evaluation_prompt);
    expect(reassembled.config.coaching_persona).toBe(originalConfig.coaching_persona);
    expect(reassembled.config.labels).toEqual(driftedConfig.labels);
  });
});

describe("loadAttemptBlueprintForSession", () => {
  test("reads the pinned snapshot from the session row", () => {
    const db = createTestDatabase();
    const config = makeTestConfig();
    const item = seedLearnspaceAndItem(db, config);
    const blueprint = resolveAttemptBlueprint({
      learnspaceId: "test-ls",
      learnspaceConfig: config,
      item: item as Parameters<typeof resolveAttemptBlueprint>[0]["item"],
    });

    db.insert(sessions)
      .values({
        id: "session-1",
        learnspaceId: "test-ls",
        userId: "user-1",
        itemId: "item-1",
        blueprintId: blueprint.blueprintId,
        blueprintVersion: blueprint.blueprintVersion,
        blueprintSnapshot: toPinnedBlueprint(blueprint) as unknown as Record<string, unknown>,
        status: "in_progress",
        startedAt: TIMESTAMP,
      })
      .run();

    db.insert(attempts)
      .values({
        id: "attempt-1",
        learnspaceId: "test-ls",
        userId: "user-1",
        itemId: "item-1",
        sessionId: "session-1",
        blueprintId: blueprint.blueprintId,
        blueprintVersion: blueprint.blueprintVersion,
        blueprintSnapshot: toPinnedBlueprint(blueprint) as unknown as Record<string, unknown>,
        startedAt: TIMESTAMP,
      })
      .run();

    const loaded = loadAttemptBlueprintForSession(db, "session-1");
    expect(loaded.blueprintId).toBe("protocol_solve:code_problem");
    expect(loaded.learnspaceId).toBe("test-ls");
    expect(loaded.item.id).toBe("item-1");
    expect(loaded.familyId).toBe("dsa");
    expect(loaded.schedulerId).toBe("sm5");
  });

  test("falls back to live config when no snapshot is pinned (legacy rows)", () => {
    const db = createTestDatabase();
    const config = makeTestConfig();
    seedLearnspaceAndItem(db, config);

    db.insert(sessions)
      .values({
        id: "session-legacy",
        learnspaceId: "test-ls",
        userId: "user-1",
        itemId: "item-1",
        status: "in_progress",
        startedAt: TIMESTAMP,
      })
      .run();

    db.insert(attempts)
      .values({
        id: "attempt-legacy",
        learnspaceId: "test-ls",
        userId: "user-1",
        itemId: "item-1",
        sessionId: "session-legacy",
        startedAt: TIMESTAMP,
      })
      .run();

    const loaded = loadAttemptBlueprintForSession(db, "session-legacy");
    expect(loaded.blueprintId).toBe("protocol_solve:code_problem");
    expect(loaded.archetype).toBe("protocol_solve");
    expect(loaded.learnspaceId).toBe("test-ls");
  });
});
