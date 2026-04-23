import { describe, expect, test } from "vitest";
import { buildSessionPlanForTrack } from "./planner.js";
import type { LearnspaceTrackSummary, TrackRuntimeStateV2 } from "./types.js";

function makeTrack(overrides: Partial<LearnspaceTrackSummary> = {}): LearnspaceTrackSummary {
  return {
    id: "track-ls1-foundations",
    learnspaceId: "ls1",
    slug: "foundations",
    name: "Foundations",
    goal: "Ease back in with familiar patterns and easier problems.",
    isSystem: true,
    source: "system_template",
    status: "active",
    spec: {
      version: "2",
      id: "track-ls1-foundations",
      learnspaceId: "ls1",
      userId: "user-1",
      name: "Foundations",
      archetype: "foundations_rebuild",
      goal: "Ease back in with familiar patterns and easier problems.",
      explanation: "Ease back in with familiar patterns and easier problems.",
      timeframe: null,
      successCriteria: [],
      constraints: [],
      preferences: [],
      scopePolicy: {
        mode: "learnspace",
        refs: [{ dimension: "learnspace", value: "ls1" }],
      },
      difficultyPolicy: {
        defaultTarget: { mode: "fixed", targetBand: "easy" },
        regressionAllowed: true,
      },
      blendPolicy: {
        entries: [{ kind: "due_review", weight: 1 }],
      },
      pacingPolicy: {},
      generationPolicy: {
        allowGeneration: false,
        allowedArtifactKinds: [],
        styleTarget: null,
      },
      evaluationPolicy: {
        mode: "learning",
      },
      coveragePolicy: {},
      interventionPolicy: {
        enabled: true,
        allowedKinds: ["confidence_rebuild"],
      },
      schedulePolicy: {},
      phases: [{
        id: "foundations-warmup",
        label: "Warmup",
        objective: "Rebuild rhythm with easier work before ramping up.",
      }],
    },
    program: {
      version: "2",
      entryNodeId: "track-ls1-foundations:warmup",
      nodes: [
        {
          id: "track-ls1-foundations:warmup",
          label: "Warmup",
          type: "phase",
          objective: "Ease back in with familiar patterns and easier problems.",
          phaseId: "foundations-warmup",
          plannerConfig: {
            sessionType: "untimed_solve",
            queueStrategy: "foundations",
            difficultyTarget: { mode: "fixed", targetBand: "easy" },
            generationAllowed: false,
            evaluationStrictness: "learning",
          },
        },
      ],
      transitions: [],
      globalPolicies: [],
      safetyGuards: [],
    },
    ...overrides,
  };
}

function makeRuntimeState(overrides: Partial<TrackRuntimeStateV2> = {}): TrackRuntimeStateV2 {
  return {
    version: "2",
    trackId: "track-ls1-foundations",
    activeNodeId: "track-ls1-foundations:warmup",
    phaseEnteredAt: "2026-04-15T00:00:00.000Z",
    nodeProgress: {},
    activeInterventions: [],
    temporaryOverrides: [],
    recurringState: [],
    coverageState: {},
    recentSessionHistory: [],
    lastPlannerDecision: null,
    manualPins: [],
    status: "active",
    updatedAt: "2026-04-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildSessionPlanForTrack", () => {
  test("uses active V2 node planner config as the source of planning behavior", () => {
    const track = makeTrack();
    const runtimeState = makeRuntimeState();

    const result = buildSessionPlanForTrack({
      track,
      runtimeState,
      now: () => new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.sessionPlan.trackId).toBe(track.id);
    expect(result.sessionPlan.nodeId).toBe(runtimeState.activeNodeId);
    expect(result.sessionPlan.sessionType).toBe("untimed_solve");
    expect(result.sessionPlan.evaluationStrictness).toBe("learning");
    expect(result.sessionPlan.recipe.workUnits).toHaveLength(1);
    expect(result.sessionPlan.recipe.workUnits[0]?.selectionConstraints[0]?.params).toEqual({
      emphasis: "foundations",
    });
    expect(result.sessionPlan.recipe.workUnits[0]?.difficultyTarget).toEqual({
      mode: "fixed",
      targetBand: "easy",
    });
  });

  test("can override the primary work unit into generated material when requested", () => {
    const track = makeTrack({
      spec: {
        ...makeTrack().spec!,
        generationPolicy: {
          allowGeneration: true,
          allowedArtifactKinds: ["problem"],
          styleTarget: null,
        },
      },
      program: {
        ...makeTrack().program!,
        nodes: [{
          ...makeTrack().program!.nodes[0]!,
          plannerConfig: {
            ...makeTrack().program!.nodes[0]!.plannerConfig,
            generationAllowed: true,
          },
        }],
      },
    });

    const result = buildSessionPlanForTrack({
      track,
      runtimeState: makeRuntimeState(),
      forceGenerated: true,
      now: () => new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.sessionPlan.recipe.workUnits[0]?.kind).toBe("generated_material");
    expect(result.sessionPlan.recipe.workUnits[0]?.generationInstruction).toEqual({
      required: true,
      artifactKind: "problem",
      styleTarget: null,
      noveltyTarget: "high",
    });
  });

  test("falls back to V2 spec policy without a node planner override", () => {
    const track = makeTrack({
      program: {
        ...makeTrack().program!,
        nodes: [{
          id: "track-ls1-foundations:warmup",
          label: "Warmup",
          type: "phase",
          objective: "Ease back in with familiar patterns and easier problems.",
          phaseId: "foundations-warmup",
        }],
      },
    });

    const result = buildSessionPlanForTrack({
      track,
      runtimeState: makeRuntimeState(),
      now: () => new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.sessionPlan.sessionType).toBe("untimed_solve");
    expect(result.sessionPlan.evaluationStrictness).toBe("learning");
    expect(result.sessionPlan.recipe.workUnits[0]?.difficultyTarget).toEqual({
      mode: "fixed",
      targetBand: "easy",
    });
    expect(result.sessionPlan.recipe.workUnits[0]?.generationInstruction).toBeNull();
  });

  test("derives timeBudget from pacingPolicy — weekday", () => {
    const track = makeTrack({
      spec: {
        ...makeTrack().spec!,
        pacingPolicy: {
          defaultTimeBudgetMinutes: 45,
          weekdayTimeBudgetMinutes: 30,
          weekendTimeBudgetMinutes: 60,
        },
      },
    });
    // 2026-04-15 is a Wednesday (weekday)
    const result = buildSessionPlanForTrack({
      track,
      runtimeState: makeRuntimeState(),
      now: () => new Date("2026-04-15T12:00:00.000Z"),
    });
    expect(result.sessionPlan.timeBudget).toEqual({ minutes: 30 });
  });

  test("derives timeBudget from pacingPolicy — weekend", () => {
    const track = makeTrack({
      spec: {
        ...makeTrack().spec!,
        pacingPolicy: {
          defaultTimeBudgetMinutes: 45,
          weekdayTimeBudgetMinutes: 30,
          weekendTimeBudgetMinutes: 60,
        },
      },
    });
    // 2026-04-18 is a Saturday
    const result = buildSessionPlanForTrack({
      track,
      runtimeState: makeRuntimeState(),
      now: () => new Date("2026-04-18T12:00:00.000Z"),
    });
    expect(result.sessionPlan.timeBudget).toEqual({ minutes: 60 });
  });

  test("timeBudget falls back to default when weekday/weekend unset", () => {
    const track = makeTrack({
      spec: {
        ...makeTrack().spec!,
        pacingPolicy: { defaultTimeBudgetMinutes: 25 },
      },
    });
    const result = buildSessionPlanForTrack({
      track,
      runtimeState: makeRuntimeState(),
      now: () => new Date("2026-04-15T12:00:00.000Z"),
    });
    expect(result.sessionPlan.timeBudget).toEqual({ minutes: 25 });
  });

  test("timeBudget null when pacing empty", () => {
    const track = makeTrack();
    const result = buildSessionPlanForTrack({
      track,
      runtimeState: makeRuntimeState(),
      now: () => new Date("2026-04-15T12:00:00.000Z"),
    });
    expect(result.sessionPlan.timeBudget).toBeNull();
  });

  test("timeBudget null for ad-hoc (targetItemId / forceGenerated) even when policy set", () => {
    const track = makeTrack({
      spec: {
        ...makeTrack().spec!,
        pacingPolicy: { defaultTimeBudgetMinutes: 30 },
      },
    });
    const forced = buildSessionPlanForTrack({
      track,
      runtimeState: makeRuntimeState(),
      forceGenerated: true,
      now: () => new Date("2026-04-15T12:00:00.000Z"),
    });
    const targeted = buildSessionPlanForTrack({
      track,
      runtimeState: makeRuntimeState(),
      targetItemId: "item-x",
      now: () => new Date("2026-04-15T12:00:00.000Z"),
    });
    expect(forced.sessionPlan.timeBudget).toBeNull();
    expect(targeted.sessionPlan.timeBudget).toBeNull();
  });
});
