import type { QueueDependencies } from "../core/selection-types.js";
import type { SessionTypeId } from "../families/types.js";
import { resolveTrackContext } from "./service.js";
import {
  type DifficultyTarget,
  type GenerationInstruction,
  type LearnspaceTrackSummary,
  type PacingPolicy,
  type PlannerAuditEvent,
  type SessionPlanV2,
  type SessionWorkUnit,
  type StyleTarget,
  type TimeBudget,
  type TrackArchetype,
  type TrackNode,
  type TrackQueueStrategy,
  type TrackRuntimeStateV2,
} from "./types.js";

/**
 * Picks the right time-budget knob from the track's PacingPolicy based on
 * the day of week. Saturday/Sunday → weekend budget (fallback to default),
 * weekdays → weekday budget (fallback to default). Null when the policy
 * supplies nothing — callers keep the session open-ended.
 *
 * Only honored when the session isn't ad-hoc (targetItemId / forceGenerated
 * paths intentionally skip the timer so one-off practice isn't rushed).
 */
function resolveTimeBudget(pacing: PacingPolicy | undefined, now: Date): TimeBudget | null {
  if (!pacing) return null;
  const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;
  const minutes = isWeekend
    ? (pacing.weekendTimeBudgetMinutes ?? pacing.defaultTimeBudgetMinutes ?? null)
    : (pacing.weekdayTimeBudgetMinutes ?? pacing.defaultTimeBudgetMinutes ?? null);
  if (!minutes || minutes <= 0) return null;
  return { minutes };
}

function fallbackSessionType(archetype?: TrackArchetype | null, trackSlug?: string): SessionTypeId {
  switch (archetype ?? trackSlug) {
    case "foundations_rebuild":
    case "foundations":
      return "untimed_solve";
    case "weakness_rehab":
    case "weakest_pattern":
      return "review_drill";
    default:
      return "timed_solve";
  }
}

function fallbackQueueStrategy(archetype?: TrackArchetype | null, trackSlug?: string): TrackQueueStrategy {
  switch (archetype ?? trackSlug) {
    case "curriculum_progression":
    case "topic_sprint":
    case "explore":
      return "new_only";
    case "weakness_rehab":
    case "weakest_pattern":
      return "weakest_first";
    case "foundations_rebuild":
    case "foundations":
      return "foundations";
    default:
      return "scheduler";
  }
}

function fallbackDifficultyTarget(archetype?: TrackArchetype | null, trackSlug?: string): DifficultyTarget {
  switch (archetype ?? trackSlug) {
    case "foundations_rebuild":
    case "foundations":
      return { mode: "fixed", targetBand: "easy" };
    case "weakness_rehab":
    case "curriculum_progression":
    case "weakest_pattern":
    case "explore":
      return { mode: "range", minBand: "easy", maxBand: "medium" };
    default:
      return { mode: "adaptive", targetBand: "medium" };
  }
}

function fallbackEvaluationStrictness(archetype?: TrackArchetype | null, trackSlug?: string) {
  switch (archetype ?? trackSlug) {
    case "foundations_rebuild":
    case "foundations":
    case "curriculum_progression":
    case "explore":
      return "learning";
    default:
      return "balanced";
  }
}

function buildGenerationInstruction(input: {
  allowGeneration: boolean;
  styleTarget: StyleTarget | null;
  forceGenerated: boolean;
}): GenerationInstruction | null {
  if (!input.allowGeneration && !input.forceGenerated) return null;
  return {
    required: input.forceGenerated,
    artifactKind: "problem",
    styleTarget: input.styleTarget,
    noveltyTarget: input.forceGenerated ? "high" : "medium",
  };
}

function buildObjective(trackName: string, targetSkillId?: string): string {
  if (targetSkillId) return `Practice focused on ${targetSkillId} under track "${trackName}"`;
  return `Practice under track "${trackName}"`;
}

function buildPrimaryWorkUnit(input: {
  trackId: string;
  trackName: string;
  queueStrategy: TrackQueueStrategy;
  difficultyTarget: DifficultyTarget;
  targetSkillId?: string;
  forceGenerated: boolean;
  allowGeneration: boolean;
  styleTarget: StyleTarget | null;
  scopeRefs: Array<{ dimension: string; value: string }>;
  blendEntries: Array<{ kind: string; weight: number }>;
}): SessionWorkUnit {
  return {
    id: `${input.trackId}:primary`,
    role: "primary",
    kind: input.forceGenerated ? "generated_material" : "due_review",
    objective: buildObjective(input.trackName, input.targetSkillId),
    candidateScope: {
      refs: input.scopeRefs,
    },
    blend: {
      entries: input.forceGenerated
        ? [{ kind: "generated_material", weight: 1 }]
        : input.blendEntries.length > 0
          ? input.blendEntries
          : [{ kind: "due_review", weight: 1 }],
    },
    difficultyTarget: input.difficultyTarget,
    styleTarget: input.styleTarget,
    generationInstruction: buildGenerationInstruction({
      allowGeneration: input.allowGeneration,
      styleTarget: input.styleTarget,
      forceGenerated: input.forceGenerated,
    }),
    selectionConstraints: [
      {
        kind: "queue_strategy",
        params: {
          emphasis: input.queueStrategy,
        },
      },
      {
        kind: "generated_allowed",
        params: {
          allowed: input.allowGeneration,
        },
      },
      ...(input.targetSkillId
        ? [{
            kind: "target_skill",
            params: { skillId: input.targetSkillId },
          }]
        : []),
    ],
  };
}

function resolveActiveNode(track: ReturnType<typeof resolveTrackContext>["track"], runtimeState: TrackRuntimeStateV2): TrackNode | null {
  const program = track.program;
  if (!program) return null;
  return program.nodes.find((node) => node.id === runtimeState.activeNodeId)
    ?? program.nodes.find((node) => node.id === program.entryNodeId)
    ?? null;
}

export function buildSessionPlanForTrack(
  input: {
    track: LearnspaceTrackSummary;
    runtimeState: TrackRuntimeStateV2;
    now: () => Date;
    targetSkillId?: string;
    targetItemId?: string;
    forceGenerated?: boolean;
  },
): {
  sessionPlan: SessionPlanV2;
  plannerEvent: PlannerAuditEvent;
} {
  const track = input.track;
  const activeNode = resolveActiveNode(track, input.runtimeState);
  const scopeRefs = track.spec?.scopePolicy.refs?.length
    ? track.spec.scopePolicy.refs.map((ref) => ({ dimension: ref.dimension, value: ref.value }))
    : [{ dimension: "learnspace", value: track.learnspaceId }];
  const queueStrategy = activeNode?.plannerConfig?.queueStrategy
    ?? fallbackQueueStrategy(track.spec?.archetype, track.slug);
  const difficultyTarget = activeNode?.plannerConfig?.difficultyTarget
    ?? track.spec?.difficultyPolicy.defaultTarget
    ?? fallbackDifficultyTarget(track.spec?.archetype, track.slug);
  const sessionType = activeNode?.plannerConfig?.sessionType
    ?? fallbackSessionType(track.spec?.archetype, track.slug);
  const allowGeneration = activeNode?.plannerConfig?.generationAllowed
    ?? track.spec?.generationPolicy.allowGeneration
    ?? false;
  const evaluationStrictness = activeNode?.plannerConfig?.evaluationStrictness
    ?? track.spec?.evaluationPolicy.mode
    ?? fallbackEvaluationStrictness(track.spec?.archetype, track.slug);
  const styleTarget = track.spec?.generationPolicy.styleTarget ?? null;
  const blendEntries = track.spec?.blendPolicy.entries ?? [{ kind: "due_review", weight: 1 }];
  const objective = input.targetItemId
    ? `Practice requested item under track "${track.name}"`
    : activeNode?.objective ?? buildObjective(track.name, input.targetSkillId);

  const sessionPlan: SessionPlanV2 = {
    version: "2",
    trackId: track.id,
    nodeId: input.runtimeState.activeNodeId,
    sessionType: input.targetItemId ? "untimed_solve" : sessionType,
    objective,
    explanation: `Track "${track.name}" is active and the planner is following node "${activeNode?.label ?? input.runtimeState.activeNodeId}".`,
    recipe: {
      workUnits: [
        buildPrimaryWorkUnit({
          trackId: track.id,
          trackName: track.name,
          queueStrategy,
          difficultyTarget,
          targetSkillId: input.targetSkillId,
          forceGenerated: input.forceGenerated === true,
          allowGeneration,
          styleTarget,
          scopeRefs,
          blendEntries,
        }),
      ],
    },
    evaluationStrictness,
    timeBudget: input.targetItemId || input.forceGenerated
      ? null
      : resolveTimeBudget(track.spec?.pacingPolicy, input.now()),
    fallbackRules: [],
  };

  return {
    sessionPlan,
    plannerEvent: {
      trackId: track.id,
      nodeId: input.runtimeState.activeNodeId,
      sessionType: sessionPlan.sessionType,
      explanation: sessionPlan.explanation,
      createdAt: input.now().toISOString(),
    },
  };
}

export function planNextSession(
  deps: QueueDependencies,
  input: {
    userId: string;
    learnspaceId: string;
    trackId: string;
    runtimeState: TrackRuntimeStateV2;
    targetSkillId?: string;
    targetItemId?: string;
    forceGenerated?: boolean;
  },
): {
  sessionPlan: SessionPlanV2;
  plannerEvent: PlannerAuditEvent;
} {
  const trackContext = resolveTrackContext(deps.db, {
    userId: input.userId,
    learnspaceId: input.learnspaceId,
    trackId: input.trackId,
  });

  return buildSessionPlanForTrack({
    track: trackContext.track,
    runtimeState: input.runtimeState,
    now: deps.now,
    targetSkillId: input.targetSkillId,
    targetItemId: input.targetItemId,
    forceGenerated: input.forceGenerated,
  });
}
