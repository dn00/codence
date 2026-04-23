import { describe, expect, test } from "vitest";
import type { Item, Skill } from "../persistence/schema.js";
import type {
  DifficultyTarget,
  ResolvedTrackContext,
  TrackSpecV2,
} from "../tracks/types.js";
import {
  buildSeedPoolAvailabilityMap,
  isGenerationAllowedForSkill,
  resolveAllowedDifficulties,
  resolveEffectiveDifficultyTarget,
  resolveSkillScope,
  resolveTargetDifficulty,
} from "./selection-pipeline.js";

function makeSkill(id: string, category: string, categoryId?: string | null): Skill {
  return {
    id,
    learnspaceId: "ls",
    name: id,
    category,
    categoryId: categoryId ?? null,
    createdAt: "2026-04-15T00:00:00.000Z",
  };
}

function makeItem(id: string, skillIds: string[], source: Item["source"] = "seed"): Item {
  return {
    id,
    learnspaceId: "ls",
    title: id,
    content: {},
    skillIds,
    tags: [],
    difficulty: "medium",
    source,
    status: "active",
    parentItemId: null,
    slug: null,
    retiredAt: null,
    createdAt: "2026-04-15T00:00:00.000Z",
  };
}

function makeSpec(overrides: Partial<TrackSpecV2> = {}): TrackSpecV2 {
  return {
    version: "2",
    id: "track-test",
    learnspaceId: "ls",
    userId: "user-1",
    name: "Test",
    archetype: "topic_sprint",
    goal: "goal",
    explanation: "explanation",
    timeframe: null,
    successCriteria: [],
    constraints: [],
    preferences: [],
    scopePolicy: { mode: "learnspace", refs: [] },
    difficultyPolicy: { defaultTarget: { mode: "adaptive" } },
    blendPolicy: { entries: [{ kind: "due_review", weight: 1 }] },
    pacingPolicy: {},
    generationPolicy: { allowGeneration: false },
    evaluationPolicy: { mode: "learning" },
    coveragePolicy: {},
    interventionPolicy: { enabled: false, allowedKinds: [] },
    schedulePolicy: {},
    phases: [],
    ...overrides,
  };
}

function makeTrackContext(spec: TrackSpecV2): ResolvedTrackContext {
  return {
    track: {
      id: spec.id,
      learnspaceId: spec.learnspaceId,
      slug: "test",
      name: spec.name,
      goal: spec.goal,
      isSystem: false,
      source: "llm_drafted",
      status: "active",
      spec,
      program: null,
    },
  } as ResolvedTrackContext;
}

describe("resolveSkillScope", () => {
  const skillRows = [
    makeSkill("arr-1", "arrays"),
    makeSkill("arr-2", "arrays"),
    makeSkill("gr-1", "graphs"),
    makeSkill("dp-1", "dp", "dp-category-id"),
  ];

  test("unconstrained when no narrowing refs", () => {
    const spec = makeSpec();
    const scope = resolveSkillScope(makeTrackContext(spec), skillRows);
    expect(scope.inScope("arr-1")).toBe(true);
    expect(scope.inScope("gr-1")).toBe(true);
    expect(scope.weightFor("arr-1")).toBe(1);
  });

  test("expands category refs to constituent skills", () => {
    const spec = makeSpec({
      scopePolicy: {
        mode: "subset",
        refs: [{ dimension: "category", value: "arrays" }],
      },
    });
    const scope = resolveSkillScope(makeTrackContext(spec), skillRows);
    expect(scope.inScope("arr-1")).toBe(true);
    expect(scope.inScope("arr-2")).toBe(true);
    expect(scope.inScope("gr-1")).toBe(false);
    expect(scope.inScope("dp-1")).toBe(false);
  });

  test("honors categoryId when set alongside legacy category", () => {
    const spec = makeSpec({
      scopePolicy: {
        mode: "subset",
        refs: [{ dimension: "category", value: "dp-category-id" }],
      },
    });
    const scope = resolveSkillScope(makeTrackContext(spec), skillRows);
    expect(scope.inScope("dp-1")).toBe(true);
    expect(scope.inScope("arr-1")).toBe(false);
  });

  test("weighted_subset weights propagate per skill (via category key)", () => {
    const spec = makeSpec({
      scopePolicy: {
        mode: "weighted_subset",
        refs: [
          { dimension: "category", value: "arrays" },
          { dimension: "category", value: "graphs" },
        ],
        weights: { arrays: 0.7, graphs: 0.3 },
      },
    });
    const scope = resolveSkillScope(makeTrackContext(spec), skillRows);
    expect(scope.weightFor("arr-1")).toBe(0.7);
    expect(scope.weightFor("arr-2")).toBe(0.7);
    expect(scope.weightFor("gr-1")).toBe(0.3);
  });

  test("mixed skill + category refs both admitted", () => {
    const spec = makeSpec({
      scopePolicy: {
        mode: "subset",
        refs: [
          { dimension: "skill", value: "gr-1" },
          { dimension: "category", value: "arrays" },
        ],
      },
    });
    const scope = resolveSkillScope(makeTrackContext(spec), skillRows);
    expect(scope.inScope("gr-1")).toBe(true);
    expect(scope.inScope("arr-1")).toBe(true);
    expect(scope.inScope("dp-1")).toBe(false);
  });

  test("exclude_scope constraints override included refs", () => {
    const spec = makeSpec({
      scopePolicy: {
        mode: "subset",
        refs: [
          { dimension: "category", value: "arrays" },
          { dimension: "skill", value: "gr-1" },
        ],
      },
      constraints: [{
        kind: "exclude_scope",
        params: {
          scopeRefs: [
            { dimension: "skill", value: "arr-2" },
            { dimension: "category", value: "graphs" },
          ],
        },
      }],
    });
    const scope = resolveSkillScope(makeTrackContext(spec), skillRows);
    expect(scope.inScope("arr-1")).toBe(true);
    expect(scope.inScope("arr-2")).toBe(false);
    expect(scope.inScope("gr-1")).toBe(false);
  });
});

describe("resolveAllowedDifficulties", () => {
  test("returns null for adaptive / missing policy", () => {
    expect(resolveAllowedDifficulties(undefined)).toBeNull();
    expect(resolveAllowedDifficulties(makeSpec())).toBeNull();
  });

  test("fixed → single band", () => {
    const spec = makeSpec({
      difficultyPolicy: { defaultTarget: { mode: "fixed", targetBand: "easy" } },
    });
    const allowed = resolveAllowedDifficulties(spec);
    expect(allowed).toEqual(new Set(["easy"]));
  });

  test("range easy→medium", () => {
    const spec = makeSpec({
      difficultyPolicy: {
        defaultTarget: { mode: "range", minBand: "easy", maxBand: "medium" },
      },
    });
    expect(resolveAllowedDifficulties(spec)).toEqual(new Set(["easy", "medium"]));
  });
});

describe("resolveTargetDifficulty", () => {
  const conf = (score: number) => ({
    score,
    totalAttempts: 1,
    cleanSolves: 0,
    assistedSolves: 0,
    failedAttempts: 0,
    lastPracticedAt: null,
    trend: null,
    learnspaceId: "ls",
    userId: "user-1",
    skillId: "s",
  });

  test("adaptive / null → confidence-mapped", () => {
    expect(resolveTargetDifficulty(conf(2), null)).toBe("easy");
    expect(resolveTargetDifficulty(conf(5), null)).toBe("medium");
    expect(resolveTargetDifficulty(conf(9), null)).toBe("hard");
  });

  test("fixed overrides confidence", () => {
    const t: DifficultyTarget = { mode: "fixed", targetBand: "easy" };
    expect(resolveTargetDifficulty(conf(9), t)).toBe("easy");
  });

  test("range clamps confidence band", () => {
    const t: DifficultyTarget = { mode: "range", minBand: "easy", maxBand: "medium" };
    expect(resolveTargetDifficulty(conf(9), t)).toBe("medium");
    expect(resolveTargetDifficulty(conf(2), t)).toBe("easy");
  });
});

describe("resolveEffectiveDifficultyTarget", () => {
  test("prefers the session plan work-unit difficulty over the track default", () => {
    const spec = makeSpec({
      difficultyPolicy: { defaultTarget: { mode: "fixed", targetBand: "hard" } },
    });
    const target = resolveEffectiveDifficultyTarget(makeTrackContext(spec), {
      version: "2",
      trackId: spec.id,
      nodeId: "node-1",
      sessionType: "timed_solve",
      objective: "objective",
      explanation: "explanation",
      recipe: {
        workUnits: [{
          id: "wu-1",
          role: "primary",
          kind: "due_review",
          objective: "objective",
          candidateScope: { refs: [] },
          blend: { entries: [{ kind: "due_review", weight: 1 }] },
          difficultyTarget: { mode: "fixed", targetBand: "easy" },
          styleTarget: null,
          generationInstruction: null,
          selectionConstraints: [],
        }],
      },
      evaluationStrictness: "balanced",
      timeBudget: null,
      fallbackRules: [],
    });

    expect(target).toEqual({ mode: "fixed", targetBand: "easy" });
  });
});

describe("buildSeedPoolAvailabilityMap + isGenerationAllowedForSkill", () => {
  test("seed pool available when unattempted seed item exists", () => {
    const items = [
      makeItem("i-1", ["s-a"], "seed"),
      makeItem("i-2", ["s-b"], "generated"),
    ];
    const attempts = new Map<string, number>();
    const map = buildSeedPoolAvailabilityMap(items, attempts);
    expect(map.get("s-a")).toBe(true);
    expect(map.get("s-b")).toBeUndefined();
  });

  test("seed pool exhausted once attempted", () => {
    const items = [makeItem("i-1", ["s-a"], "seed")];
    const map = buildSeedPoolAvailabilityMap(items, new Map([["i-1", 1]]));
    expect(map.get("s-a")).toBeUndefined();
  });

  test("generation suppressed while seed pool available when onlyWhenSeedPoolExhausted=true", () => {
    const spec = makeSpec({
      generationPolicy: { allowGeneration: true, onlyWhenSeedPoolExhausted: true },
    });
    const ctx = makeTrackContext(spec);
    const avail = new Map([["s-a", true]]);
    expect(isGenerationAllowedForSkill(ctx, "s-a", avail)).toBe(false);
    expect(isGenerationAllowedForSkill(ctx, "s-b", avail)).toBe(true);
  });

  test("generation allowed regardless of pool when onlyWhenSeedPoolExhausted=false", () => {
    const spec = makeSpec({
      generationPolicy: { allowGeneration: true, onlyWhenSeedPoolExhausted: false },
    });
    const ctx = makeTrackContext(spec);
    const avail = new Map([["s-a", true]]);
    expect(isGenerationAllowedForSkill(ctx, "s-a", avail)).toBe(true);
  });

  test("generation always denied when allowGeneration=false", () => {
    const spec = makeSpec({
      generationPolicy: { allowGeneration: false, onlyWhenSeedPoolExhausted: false },
    });
    const ctx = makeTrackContext(spec);
    expect(isGenerationAllowedForSkill(ctx, "s-a", new Map())).toBe(false);
  });
});
