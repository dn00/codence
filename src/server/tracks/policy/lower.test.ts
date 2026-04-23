import { describe, expect, test } from "vitest";
import { lowerPolicy, probeUnsupported, type PolicyLowerInput } from "./lower.js";
import type { TrackPolicy } from "./types.js";

function basePolicy(overrides: Partial<TrackPolicy> = {}): TrackPolicy {
  return {
    scope: {
      includeSkillIds: [],
      excludeSkillIds: [],
      includeCategories: [],
      excludeCategories: [],
    },
    allocation: {},
    pacing: {},
    sessionComposition: {},
    difficulty: { mode: "adaptive" },
    progression: { mode: "linear" },
    review: { scheduler: "sm5" },
    adaptation: {},
    cadence: [],
    contentSource: {},
    ...overrides,
  };
}

function baseInput(policy: TrackPolicy): PolicyLowerInput {
  return {
    policy,
    trackId: "track-ls-custom-1",
    userId: "user-1",
    learnspaceId: "ls",
    name: "Test Track",
    goal: "Practice stuff",
    now: () => new Date("2026-04-17T12:00:00.000Z"),
  };
}

describe("probeUnsupported", () => {
  test("rejects spiral progression", () => {
    expect(probeUnsupported(basePolicy({ progression: { mode: "spiral" } }))).toEqual(["progression.mode=spiral"]);
  });

  test("rejects before_deadline cadence", () => {
    const policy = basePolicy({
      cadence: [{ kind: "before_deadline", bucket: "mock", weeksBeforeDeadline: 1 }],
    });
    expect(probeUnsupported(policy)).toEqual(["cadence.kind=before_deadline"]);
  });

  test("accepts fully supported policies", () => {
    expect(probeUnsupported(basePolicy())).toEqual([]);
  });
});

describe("lowerPolicy — reject path", () => {
  test("returns reject for spiral progression", () => {
    const result = lowerPolicy(baseInput(basePolicy({ progression: { mode: "spiral" } })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.unsupportedFields).toContain("progression.mode=spiral");
    }
  });

  test("returns reject for before_deadline cadence", () => {
    const result = lowerPolicy(
      baseInput(
        basePolicy({
          cadence: [{ kind: "before_deadline", bucket: "mock", weeksBeforeDeadline: 2 }],
        }),
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.unsupportedFields).toContain("cadence.kind=before_deadline");
    }
  });
});

describe("lowerPolicy — scope lowering", () => {
  test("skill includes and excludes map to subset + exclude constraint", () => {
    const policy = basePolicy({
      scope: {
        includeSkillIds: ["binary_search", "graphs_bfs"],
        excludeSkillIds: ["dynamic_programming"],
        includeCategories: [],
        excludeCategories: [],
      },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.scopePolicy.mode).toBe("subset");
    expect(result.spec.scopePolicy.refs).toEqual([
      { dimension: "skill", value: "binary_search" },
      { dimension: "skill", value: "graphs_bfs" },
    ]);
    expect(result.spec.constraints).toContainEqual({
      kind: "exclude_scope",
      params: { scopeRefs: [{ dimension: "skill", value: "dynamic_programming" }] },
    });
  });

  test("empty scope falls back to learnspace", () => {
    const result = lowerPolicy(baseInput(basePolicy()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.scopePolicy.mode).toBe("learnspace");
    expect(result.spec.scopePolicy.refs).toEqual([{ dimension: "learnspace", value: "ls" }]);
  });

  test("prerequisitesFirst forces prerequisite_gated mode", () => {
    const policy = basePolicy({
      scope: {
        includeSkillIds: ["binary_search"],
        excludeSkillIds: [],
        includeCategories: [],
        excludeCategories: [],
      },
      progression: { mode: "linear", prerequisitesFirst: true },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.scopePolicy.mode).toBe("prerequisite_gated");
  });

  test("skill weights populate weighted_subset", () => {
    const policy = basePolicy({
      scope: {
        includeSkillIds: ["binary_search", "graphs_bfs"],
        excludeSkillIds: [],
        includeCategories: [],
        excludeCategories: [],
      },
      allocation: { skillWeights: { binary_search: 0.7, graphs_bfs: 0.3 } },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.scopePolicy.mode).toBe("weighted_subset");
    expect(result.spec.scopePolicy.weights).toEqual({ binary_search: 0.7, graphs_bfs: 0.3 });
  });
});

describe("lowerPolicy — difficulty lowering", () => {
  test("fixed mode with targetBand", () => {
    const policy = basePolicy({ difficulty: { mode: "fixed", targetBand: "hard" } });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.difficultyPolicy.defaultTarget).toEqual({ mode: "fixed", targetBand: "hard" });
  });

  test("adaptive mode with bands", () => {
    const policy = basePolicy({
      difficulty: { mode: "adaptive", targetBand: "medium", minBand: "easy", maxBand: "hard", backoffOnStruggle: true },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.difficultyPolicy.defaultTarget.mode).toBe("adaptive");
    expect(result.spec.difficultyPolicy.regressionAllowed).toBe(true);
  });

  test("staged mode is rejected until multi-node lowering ships", () => {
    // `buildPhases` still produces the phase array (and probes that
    // serialize correctly) but `probeUnsupported` flags staged as
    // unsupported because `buildProgram` only emits a single
    // `steady_state` node — staged would silently flatten.
    const policy = basePolicy({
      difficulty: {
        mode: "staged",
        stages: [
          { afterSessions: 0, targetBand: "easy" },
          { afterSessions: 4, targetBand: "medium" },
          { afterSessions: 8, targetBand: "hard" },
        ],
      },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.unsupportedFields).toContain("difficulty.mode=staged");
  });
});

describe("lowerPolicy — session composition", () => {
  test("shares map to blend entries and normalize to 1", () => {
    const policy = basePolicy({
      sessionComposition: { reviewShare: 0.6, newShare: 0.4 },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.blendPolicy.entries).toEqual([
      { kind: "due_review", weight: 0.6 },
      { kind: "new_material", weight: 0.4 },
    ]);
  });

  test("recall, mock, and drill all map through", () => {
    const policy = basePolicy({
      sessionComposition: { reviewShare: 0.4, recallShare: 0.3, mockShare: 0.2, drillShare: 0.1 },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const kinds = result.spec.blendPolicy.entries.map((entry) => entry.kind);
    expect(kinds).toEqual(["due_review", "drill", "mock", "recall"]);
  });

  test("maxNewItemsPerSession becomes a constraint", () => {
    const policy = basePolicy({ sessionComposition: { maxNewItemsPerSession: 3 } });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.constraints).toContainEqual({
      kind: "max_new_items_per_session",
      params: { n: 3 },
    });
  });
});

describe("lowerPolicy — pacing + timeframe", () => {
  test("weekday/weekend/daily minutes populate pacingPolicy", () => {
    const policy = basePolicy({
      pacing: { weekdayMinutes: 30, weekendMinutes: 60, maxDailyMinutes: 90, sessionsPerWeek: 5 },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.pacingPolicy).toEqual({
      defaultTimeBudgetMinutes: 90,
      weekdayTimeBudgetMinutes: 30,
      weekendTimeBudgetMinutes: 60,
      cadence: "5x_per_week",
    });
  });

  test("deadlineWeeks produces timeframe + success criterion", () => {
    const policy = basePolicy({ pacing: { deadlineWeeks: 3 } });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.timeframe?.startAt).toBe("2026-04-17T12:00:00.000Z");
    expect(result.spec.timeframe?.endAt).toBe("2026-05-08T12:00:00.000Z");
    expect(result.spec.archetype).toBe("deadline_sprint");
    expect(result.spec.successCriteria).toContainEqual({
      kind: "deadline_reached",
      params: { endAt: "2026-05-08T12:00:00.000Z" },
    });
  });
});

describe("lowerPolicy — content source + generation", () => {
  test("seedOnly disables generation", () => {
    const policy = basePolicy({ contentSource: { seedOnly: true } });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.generationPolicy.allowGeneration).toBe(false);
  });

  test("generatedOnlyAsFallback enables fallback mode", () => {
    const policy = basePolicy({
      contentSource: { generatedAllowed: true, generatedOnlyAsFallback: true },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.generationPolicy.allowGeneration).toBe(true);
    expect(result.spec.generationPolicy.onlyWhenSeedPoolExhausted).toBe(true);
  });

  test("adaptation.onSeedPoolLow=allow_generation enables fallback", () => {
    const policy = basePolicy({
      contentSource: { generatedAllowed: true },
      adaptation: { onSeedPoolLow: "allow_generation" },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.generationPolicy.onlyWhenSeedPoolExhausted).toBe(true);
  });
});

describe("lowerPolicy — cadence", () => {
  test("every_n_sessions and weekday map to recurring rules", () => {
    const policy = basePolicy({
      cadence: [
        { kind: "every_n_sessions", bucket: "mock", everyNSessions: 5 },
        { kind: "weekday", bucket: "drill", weekday: 3 },
      ],
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.schedulePolicy.recurringSessionRules).toEqual([
      { cadenceKind: "every_n_sessions", everyNSessions: 5, sessionType: "mock", workUnitKind: "mock" },
      { cadenceKind: "weekday", sessionType: "review_drill", workUnitKind: "drill" },
    ]);
  });

  test("review.includeOverdueEverySession appends a recurring rule", () => {
    const policy = basePolicy({
      review: { scheduler: "sm5", includeOverdueEverySession: true },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.schedulePolicy.recurringSessionRules).toContainEqual({
      cadenceKind: "every_n_sessions",
      everyNSessions: 1,
      sessionType: "review_drill",
      workUnitKind: "due_review",
    });
  });
});

describe("lowerPolicy — archetype + queue strategy inference", () => {
  test("fundamentalsOnly → foundations_rebuild + foundations queue", () => {
    const policy = basePolicy({
      scope: {
        includeSkillIds: [],
        excludeSkillIds: [],
        includeCategories: [],
        excludeCategories: [],
        fundamentalsOnly: true,
      },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.archetype).toBe("foundations_rebuild");
    expect(result.program.nodes[0]?.plannerConfig?.queueStrategy).toBe("foundations");
  });

  test("weakAreasOnly → weakness_rehab + weakest_first queue", () => {
    const policy = basePolicy({
      scope: {
        includeSkillIds: [],
        excludeSkillIds: [],
        includeCategories: [],
        excludeCategories: [],
        weakAreasOnly: true,
      },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.archetype).toBe("weakness_rehab");
    expect(result.program.nodes[0]?.plannerConfig?.queueStrategy).toBe("weakest_first");
  });

  test("mastery_gated progression → curriculum_progression archetype", () => {
    const policy = basePolicy({ progression: { mode: "mastery_gated" } });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.archetype).toBe("curriculum_progression");
  });
});

describe("lowerPolicy — explanation contains approximations", () => {
  test("partial fields are recorded as approximations", () => {
    const policy = basePolicy({
      scope: {
        includeSkillIds: [],
        excludeSkillIds: [],
        includeCategories: [],
        excludeCategories: [],
        weakAreasOnly: true,
      },
      pacing: { intensity: "intense" },
      review: { scheduler: "sm5", aggressiveness: "aggressive" },
    });
    const result = lowerPolicy(baseInput(policy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const approximatedFields = (result.explanation.approximations ?? []).map((entry) => entry.field);
    expect(approximatedFields).toContain("scope.weakAreasOnly");
    expect(approximatedFields).toContain("pacing.intensity");
    expect(approximatedFields).toContain("review.aggressiveness");
  });
});

describe("lowerPolicy — program structure", () => {
  test("produces a single steady_state node with planner config", () => {
    const result = lowerPolicy(baseInput(basePolicy()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.program.version).toBe("2");
    expect(result.program.entryNodeId).toBe("track-ls-custom-1:main");
    expect(result.program.nodes).toHaveLength(1);
    expect(result.program.nodes[0]?.type).toBe("steady_state");
  });
});
