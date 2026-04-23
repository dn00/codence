import { describe, expect, test } from "vitest";
import { reduceTrackRuntimeState } from "./reducer.js";
import type {
  LearnspaceTrackSummary,
  SessionPlanV2,
  TrackRuntimeStateV2,
} from "./types.js";

function makeTrack(): LearnspaceTrackSummary {
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
        },
        {
          id: "track-ls1-foundations:steady",
          label: "Steady Foundations",
          type: "steady_state",
          objective: "Continue in a gentle refresher mode.",
        },
      ],
      transitions: [{
        id: "track-ls1-foundations:warmup-to-steady",
        fromNodeId: "track-ls1-foundations:warmup",
        toNodeId: "track-ls1-foundations:steady",
        when: [{ kind: "clean_solve_count_reached", params: { count: 1 } }],
        priority: 1,
      }],
      globalPolicies: [],
      safetyGuards: [],
    },
  };
}

function makeRuntimeState(): TrackRuntimeStateV2 {
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
  };
}

function makeSessionPlan(): SessionPlanV2 {
  return {
    version: "2",
    trackId: "track-ls1-foundations",
    nodeId: "track-ls1-foundations:warmup",
    sessionType: "untimed_solve",
    objective: "Ease back in with familiar patterns and easier problems.",
    explanation: "Warmup foundations session.",
    recipe: {
      workUnits: [],
    },
    evaluationStrictness: "learning",
    timeBudget: null,
    fallbackRules: [],
  };
}

describe("reduceTrackRuntimeState", () => {
  test("advances to the next node when a transition condition is satisfied", () => {
    const reduced = reduceTrackRuntimeState(makeTrack(), {
      trackId: "track-ls1-foundations",
      priorState: makeRuntimeState(),
      sessionPlan: makeSessionPlan(),
      completion: {
        sessionId: "session-1",
        outcome: "clean",
        completedAt: "2026-04-15T12:00:00.000Z",
      },
      evidence: [],
      manualOverride: null,
    });

    expect(reduced.nextState.activeNodeId).toBe("track-ls1-foundations:steady");
    expect(reduced.nextState.nodeProgress["track-ls1-foundations:warmup"]?.cleanSolves).toBe(1);
    expect(reduced.transitionEvents).toHaveLength(1);
    expect(reduced.transitionEvents[0]?.triggeredBy).toBe("clean_solve_count_reached");
  });

  test("records session history and stays on the current node when no transition matches", () => {
    const reduced = reduceTrackRuntimeState(makeTrack(), {
      trackId: "track-ls1-foundations",
      priorState: makeRuntimeState(),
      sessionPlan: makeSessionPlan(),
      completion: {
        sessionId: "session-2",
        outcome: "failed",
        completedAt: "2026-04-15T12:00:00.000Z",
      },
      evidence: [],
      manualOverride: null,
    });

    expect(reduced.nextState.activeNodeId).toBe("track-ls1-foundations:warmup");
    expect(reduced.nextState.nodeProgress["track-ls1-foundations:warmup"]?.failureCount).toBe(1);
    expect(reduced.nextState.recentSessionHistory[0]).toMatchObject({
      sessionId: "session-2",
      outcome: "failed",
    });
    expect(reduced.transitionEvents).toHaveLength(0);
  });
});
