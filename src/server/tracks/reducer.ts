import type {
  LearnspaceTrackSummary,
  TrackRuntimeReducerInput,
  TrackRuntimeReducerOutput,
  TrackTransitionEvent,
} from "./types.js";

function shouldTransitionOnCondition(input: {
  condition: { kind: string; params?: Record<string, unknown> };
  completedSessions: number;
  cleanSolves: number;
  failureCount: number;
  completionOutcome?: string | null;
}): boolean {
  switch (input.condition.kind) {
    case "clean_solve_count_reached":
      return input.cleanSolves >= Number(input.condition.params?.count ?? 1);
    case "session_count_reached":
      return input.completedSessions >= Number(input.condition.params?.count ?? 1);
    case "repeated_failure_trigger":
      return input.completionOutcome === "failed"
        && input.failureCount >= Number(input.condition.params?.count ?? 1);
    default:
      return false;
  }
}

export function reduceTrackRuntimeState(
  track: LearnspaceTrackSummary,
  input: TrackRuntimeReducerInput,
): TrackRuntimeReducerOutput {
  const nextState = structuredClone(input.priorState);
  const transitionEvents: TrackTransitionEvent[] = [];

  const timestamp =
    input.completion?.completedAt
    ?? input.manualOverride?.params?.at as string | undefined
    ?? new Date().toISOString();
  nextState.updatedAt = timestamp;

  if (input.sessionPlan && input.completion) {
    nextState.recentSessionHistory = [
      {
        sessionId: input.completion.sessionId,
        planNodeId: input.sessionPlan.nodeId,
        completedAt: input.completion.completedAt,
        outcome: input.completion.outcome ?? null,
      },
      ...nextState.recentSessionHistory,
    ].slice(0, 20);
  }

  const nodeId = nextState.activeNodeId;
  const progress = nextState.nodeProgress[nodeId] ?? {};
  progress.completedSessions = (progress.completedSessions ?? 0) + (input.completion ? 1 : 0);
  if (input.completion?.outcome === "clean") {
    progress.cleanSolves = (progress.cleanSolves ?? 0) + 1;
  }
  if (input.completion?.outcome === "failed") {
    progress.failureCount = (progress.failureCount ?? 0) + 1;
  }
  nextState.nodeProgress[nodeId] = progress;

  const currentProgramNode = track.program?.nodes.find((node) => node.id === nodeId) ?? null;
  const outgoingTransitions = (track.program?.transitions ?? [])
    .filter((transition) => transition.fromNodeId === nodeId)
    .sort((left, right) => left.priority - right.priority);

  for (const transition of outgoingTransitions) {
    const matched = transition.when.some((condition) =>
      shouldTransitionOnCondition({
        condition,
        completedSessions: progress.completedSessions ?? 0,
        cleanSolves: progress.cleanSolves ?? 0,
        failureCount: progress.failureCount ?? 0,
        completionOutcome: input.completion?.outcome ?? null,
      }));

    if (!matched) continue;

    nextState.activeNodeId = transition.toNodeId;
    nextState.phaseEnteredAt = timestamp;
    transitionEvents.push({
      trackId: input.trackId,
      fromNodeId: transition.fromNodeId,
      toNodeId: transition.toNodeId,
      triggeredBy: transition.when[0]?.kind ?? "manual_override",
      evidenceIds: input.evidence.map((event) => event.id),
      createdAt: timestamp,
    });
    break;
  }

  nextState.lastPlannerDecision = input.sessionPlan
    ? {
        nodeId: input.sessionPlan.nodeId,
        sessionId: input.completion?.sessionId ?? null,
        sessionType: input.sessionPlan.sessionType,
        explanation: input.sessionPlan.explanation,
        decidedAt: timestamp,
      }
    : nextState.lastPlannerDecision;

  return {
    nextState,
    transitionEvents,
    plannerAuditEvents: transitionEvents.length > 0 && currentProgramNode
      ? [{
          trackId: input.trackId,
          nodeId: nextState.activeNodeId,
          sessionId: input.completion?.sessionId ?? null,
          sessionType: input.sessionPlan?.sessionType ?? "timed_solve",
          explanation: `Track runtime advanced from "${currentProgramNode.label}" to "${nextState.activeNodeId}".`,
          createdAt: timestamp,
        }]
      : [],
  };
}
