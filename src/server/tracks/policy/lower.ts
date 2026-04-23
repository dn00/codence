import type { SessionTypeId } from "../../families/types.js";
import type {
  BlendPolicy,
  DifficultyPolicy,
  DifficultyTarget,
  EvaluationStrictness,
  GenerationPolicy,
  PacingPolicy as PacingPolicyV2,
  RecurringRule,
  ScopePolicy as ScopePolicyV2,
  ScopeRef,
  SchedulePolicy,
  SuccessCriterion,
  TrackArchetype,
  TrackConstraint,
  TrackNode,
  TrackPhaseSpec,
  TrackPreference,
  TrackProgramV2,
  TrackQueueStrategy,
  TrackSpecV2,
  TrackTimeframe,
  WorkUnitKind,
} from "../types.js";
import type {
  CadenceRule,
  PolicyExplanation,
  PolicyRepairNote,
  TrackPolicy,
} from "./types.js";

export interface PolicyLowerInput {
  policy: TrackPolicy;
  trackId: string;
  userId: string;
  learnspaceId: string;
  name: string;
  goal: string;
  now: () => Date;
}

export interface PolicyLowerOk {
  ok: true;
  spec: TrackSpecV2;
  program: TrackProgramV2;
  explanation: PolicyExplanation;
}

export interface PolicyLowerReject {
  ok: false;
  unsupportedFields: string[];
  reason: string;
}

export type PolicyLowerResult = PolicyLowerOk | PolicyLowerReject;

// ---------------------------------------------------------------------------
// Reject probe — returns the hard-blockers for a given policy. Separated from
// the main lowerer so the compiler can dry-run this before it commits to a
// compiled/repaired outcome.
// ---------------------------------------------------------------------------
export function probeUnsupported(policy: TrackPolicy): string[] {
  const unsupported: string[] = [];
  if (policy.progression.mode === "spiral") {
    unsupported.push("progression.mode=spiral");
  }
  // Staged difficulty requires multi-node program lowering (phase
  // nodes + session_count_reached transitions). Today lowerPolicy
  // always emits a single `steady_state` node, so staged would
  // silently flatten to the default target. Reject until the
  // multi-node lowering ships.
  if (policy.difficulty.mode === "staged") {
    unsupported.push("difficulty.mode=staged");
  }
  for (const rule of policy.cadence) {
    if (rule.kind === "before_deadline") {
      unsupported.push("cadence.kind=before_deadline");
    }
  }
  return unsupported;
}

// ---------------------------------------------------------------------------
// Archetype inference
// ---------------------------------------------------------------------------
function inferArchetype(policy: TrackPolicy): TrackArchetype {
  if (policy.scope.fundamentalsOnly) return "foundations_rebuild";
  if (policy.scope.weakAreasOnly) return "weakness_rehab";
  if (typeof policy.pacing.deadlineWeeks === "number" && policy.pacing.deadlineWeeks > 0) {
    return "deadline_sprint";
  }
  if (policy.progression.mode === "mastery_gated") return "curriculum_progression";
  if (policy.progression.mode === "breadth_first") return "breadth_then_depth";
  if (policy.cadence.some((rule) => rule.bucket === "mock")) return "mock_interview";
  return "maintenance";
}

function inferQueueStrategy(policy: TrackPolicy, archetype: TrackArchetype): TrackQueueStrategy {
  if (policy.scope.fundamentalsOnly) return "foundations";
  if (policy.scope.weakAreasOnly) return "weakest_first";
  if (policy.difficulty.targetBand === "hard" && policy.difficulty.mode === "fixed") return "hardest_first";
  if (archetype === "curriculum_progression") return "new_only";
  return "scheduler";
}

// ---------------------------------------------------------------------------
// Scope lowering
// ---------------------------------------------------------------------------
function lowerScope(policy: TrackPolicy, learnspaceId: string): {
  scope: ScopePolicyV2;
  excludeConstraints: TrackConstraint[];
} {
  const { scope, allocation, progression } = policy;

  const refs: ScopeRef[] = [
    ...scope.includeSkillIds.map((value) => ({ dimension: "skill" as const, value })),
    ...scope.includeCategories.map((value) => ({ dimension: "category" as const, value })),
  ];

  const hasSkillWeights = allocation.skillWeights && Object.keys(allocation.skillWeights).length > 0;
  const hasCategoryWeights = allocation.categoryWeights && Object.keys(allocation.categoryWeights).length > 0;
  const weights: Record<string, number> = {};
  if (hasSkillWeights) Object.assign(weights, allocation.skillWeights);
  if (hasCategoryWeights) Object.assign(weights, allocation.categoryWeights);

  const excludeRefs: ScopeRef[] = [
    ...scope.excludeSkillIds.map((value) => ({ dimension: "skill" as const, value })),
    ...scope.excludeCategories.map((value) => ({ dimension: "category" as const, value })),
  ];
  const excludeConstraints: TrackConstraint[] = excludeRefs.length > 0
    ? [{ kind: "exclude_scope", params: { scopeRefs: excludeRefs } }]
    : [];

  const mode: ScopePolicyV2["mode"] = progression.prerequisitesFirst
    ? "prerequisite_gated"
    : Object.keys(weights).length > 0
      ? "weighted_subset"
      : refs.length > 0
        ? "subset"
        : "learnspace";

  const scopePolicy: ScopePolicyV2 = {
    mode,
    refs: refs.length > 0 ? refs : [{ dimension: "learnspace", value: learnspaceId }],
  };
  if (Object.keys(weights).length > 0) {
    scopePolicy.weights = weights;
  }

  return { scope: scopePolicy, excludeConstraints };
}

// ---------------------------------------------------------------------------
// Difficulty lowering
// ---------------------------------------------------------------------------
function lowerDifficulty(policy: TrackPolicy): DifficultyPolicy {
  const d = policy.difficulty;
  const defaultTarget: DifficultyTarget = d.mode === "fixed"
    ? {
        mode: "fixed",
        targetBand: d.targetBand ?? "medium",
      }
    : d.mode === "adaptive"
      ? {
          mode: "adaptive",
          targetBand: d.targetBand ?? "medium",
          minBand: d.minBand ?? null,
          maxBand: d.maxBand ?? null,
        }
      : {
          mode: "range",
          minBand: d.minBand ?? d.stages?.[0]?.minBand ?? "easy",
          maxBand: d.maxBand ?? d.stages?.[d.stages.length - 1]?.maxBand ?? "hard",
          targetBand: d.targetBand ?? null,
        };
  return {
    defaultTarget,
    regressionAllowed: d.backoffOnStruggle === true,
  };
}

// ---------------------------------------------------------------------------
// Blend lowering
// ---------------------------------------------------------------------------
function lowerBlend(policy: TrackPolicy): BlendPolicy {
  const composition = policy.sessionComposition;
  const entries: Array<{ kind: WorkUnitKind; weight: number }> = [];
  const mapping: Array<[keyof typeof composition, WorkUnitKind]> = [
    ["reviewShare", "due_review"],
    ["newShare", "new_material"],
    ["drillShare", "drill"],
    ["mockShare", "mock"],
    ["recallShare", "recall"],
  ];
  for (const [shareKey, kind] of mapping) {
    const value = composition[shareKey];
    if (typeof value === "number" && value > 0) {
      entries.push({ kind, weight: value });
    }
  }
  if (entries.length === 0) {
    return {
      entries: [
        { kind: "due_review", weight: 0.7 },
        { kind: "new_material", weight: 0.3 },
      ],
    };
  }
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (Math.abs(total - 1) > 0.001) {
    for (const entry of entries) entry.weight = entry.weight / total;
  }
  return { entries };
}

// ---------------------------------------------------------------------------
// Pacing + timeframe lowering
// ---------------------------------------------------------------------------
function lowerPacing(policy: TrackPolicy): PacingPolicyV2 {
  const p = policy.pacing;
  const pacing: PacingPolicyV2 = {};
  if (typeof p.maxDailyMinutes === "number") pacing.defaultTimeBudgetMinutes = p.maxDailyMinutes;
  if (typeof p.weekdayMinutes === "number") pacing.weekdayTimeBudgetMinutes = p.weekdayMinutes;
  if (typeof p.weekendMinutes === "number") pacing.weekendTimeBudgetMinutes = p.weekendMinutes;
  if (typeof p.sessionsPerWeek === "number" && p.sessionsPerWeek > 0) {
    pacing.cadence = `${p.sessionsPerWeek}x_per_week`;
  }
  return pacing;
}

function lowerTimeframe(policy: TrackPolicy, now: () => Date): TrackTimeframe | null {
  const weeks = policy.pacing.deadlineWeeks;
  if (typeof weeks !== "number" || weeks <= 0) return null;
  const start = now();
  const end = new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  const cadenceSessions = policy.pacing.sessionsPerWeek;
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    targetCadence: typeof cadenceSessions === "number" && cadenceSessions > 0
      ? `${cadenceSessions}x_per_week`
      : null,
  };
}

// ---------------------------------------------------------------------------
// Generation lowering
// ---------------------------------------------------------------------------
function lowerGeneration(policy: TrackPolicy): GenerationPolicy {
  const cs = policy.contentSource;
  const allowGeneration = cs.seedOnly ? false : cs.generatedAllowed === true;
  const generation: GenerationPolicy = {
    allowGeneration,
    allowedArtifactKinds: allowGeneration ? ["problem"] : [],
    styleTarget: null,
  };
  if (allowGeneration && (cs.generatedOnlyAsFallback === true || policy.adaptation.onSeedPoolLow === "allow_generation")) {
    generation.onlyWhenSeedPoolExhausted = true;
  }
  return generation;
}

// ---------------------------------------------------------------------------
// Cadence → recurring-session rules
// ---------------------------------------------------------------------------
function bucketToSessionType(bucket: CadenceRule["bucket"]): SessionTypeId {
  switch (bucket) {
    case "mock": return "mock";
    case "drill": return "review_drill";
    case "review": return "review_drill";
    case "recap": return "recall";
    default: return "timed_solve";
  }
}

function bucketToWorkUnitKind(bucket: CadenceRule["bucket"]): WorkUnitKind {
  switch (bucket) {
    case "mock": return "mock";
    case "drill": return "drill";
    case "review": return "due_review";
    case "recap": return "recall";
    default: return "due_review";
  }
}

function lowerCadence(policy: TrackPolicy): SchedulePolicy {
  const rules: RecurringRule[] = [];
  for (const cadence of policy.cadence) {
    if (cadence.kind === "before_deadline") continue; // rejected upstream
    const base = {
      sessionType: bucketToSessionType(cadence.bucket),
      workUnitKind: bucketToWorkUnitKind(cadence.bucket),
    };
    if (cadence.kind === "every_n_sessions" && typeof cadence.everyNSessions === "number") {
      rules.push({ cadenceKind: "every_n_sessions", everyNSessions: cadence.everyNSessions, ...base });
    } else if (cadence.kind === "weekday") {
      rules.push({ cadenceKind: "weekday", ...base });
    } else if (cadence.kind === "weekend") {
      rules.push({ cadenceKind: "weekend", ...base });
    }
  }
  if (policy.review.includeOverdueEverySession) {
    rules.push({
      cadenceKind: "every_n_sessions",
      everyNSessions: 1,
      sessionType: "review_drill",
      workUnitKind: "due_review",
    });
  }
  return rules.length > 0 ? { recurringSessionRules: rules } : {};
}

// ---------------------------------------------------------------------------
// Preferences + constraints (approximate mappings)
// ---------------------------------------------------------------------------
function lowerPreferencesAndConstraints(policy: TrackPolicy): {
  preferences: TrackPreference[];
  constraints: TrackConstraint[];
  approximations: Array<{ field: string; representedAs: string }>;
} {
  const preferences: TrackPreference[] = [];
  const constraints: TrackConstraint[] = [];
  const approximations: Array<{ field: string; representedAs: string }> = [];

  if (policy.scope.weakAreasOnly) {
    preferences.push({ kind: "weak_areas_only" });
    approximations.push({ field: "scope.weakAreasOnly", representedAs: "preference.weak_areas_only" });
  }
  if (policy.scope.fundamentalsOnly) {
    preferences.push({ kind: "fundamentals_only" });
    approximations.push({ field: "scope.fundamentalsOnly", representedAs: "preference.fundamentals_only" });
  }

  if (policy.allocation.breadthVsDepth && policy.allocation.breadthVsDepth !== "balanced") {
    preferences.push({ kind: "breadth_vs_depth", params: { value: policy.allocation.breadthVsDepth } });
    approximations.push({ field: "allocation.breadthVsDepth", representedAs: "preference.breadth_vs_depth" });
  }
  if (policy.allocation.weakAreaBias && policy.allocation.weakAreaBias !== "none") {
    preferences.push({ kind: "weak_area_bias", params: { value: policy.allocation.weakAreaBias } });
    approximations.push({ field: "allocation.weakAreaBias", representedAs: "preference.weak_area_bias" });
  }

  if (policy.pacing.intensity) {
    preferences.push({ kind: "pacing_intensity", params: { value: policy.pacing.intensity } });
    approximations.push({ field: "pacing.intensity", representedAs: "preference.pacing_intensity" });
  }

  if (policy.sessionComposition.warmup === true) {
    preferences.push({ kind: "warmup" });
    approximations.push({ field: "sessionComposition.warmup", representedAs: "preference.warmup" });
  }
  if (policy.sessionComposition.mixedSessions === true) {
    preferences.push({ kind: "mixed_sessions" });
    approximations.push({ field: "sessionComposition.mixedSessions", representedAs: "preference.mixed_sessions" });
  }
  if (typeof policy.sessionComposition.maxNewItemsPerSession === "number") {
    constraints.push({
      kind: "max_new_items_per_session",
      params: { n: policy.sessionComposition.maxNewItemsPerSession },
    });
  }

  if (policy.progression.mode === "breadth_first" || policy.progression.mode === "depth_first") {
    preferences.push({ kind: "progression_mode", params: { value: policy.progression.mode } });
    approximations.push({ field: "progression.mode", representedAs: "preference.progression_mode" });
  }

  if (policy.review.aggressiveness) {
    preferences.push({ kind: "review_aggressiveness", params: { value: policy.review.aggressiveness } });
    approximations.push({ field: "review.aggressiveness", representedAs: "preference.review_aggressiveness" });
  }
  if (typeof policy.review.dueReviewCap === "number") {
    constraints.push({ kind: "due_review_cap", params: { n: policy.review.dueReviewCap } });
  }
  if (policy.review.interleaveOldAndNew === true) {
    preferences.push({ kind: "interleave_old_and_new" });
    approximations.push({ field: "review.interleaveOldAndNew", representedAs: "preference.interleave_old_and_new" });
  }

  if (policy.adaptation.onRepeatedFailures && policy.adaptation.onRepeatedFailures !== "reduce_difficulty") {
    preferences.push({
      kind: "adapt_on_repeated_failures",
      params: { action: policy.adaptation.onRepeatedFailures },
    });
    approximations.push({
      field: "adaptation.onRepeatedFailures",
      representedAs: "preference.adapt_on_repeated_failures",
    });
  }
  if (policy.adaptation.onCleanStreak === "unlock_next") {
    preferences.push({ kind: "adapt_on_clean_streak_unlock_next" });
    approximations.push({
      field: "adaptation.onCleanStreak",
      representedAs: "preference.adapt_on_clean_streak_unlock_next",
    });
  }
  if (policy.adaptation.onOverdueLoad) {
    preferences.push({ kind: "adapt_on_overdue_load", params: { action: policy.adaptation.onOverdueLoad } });
    approximations.push({ field: "adaptation.onOverdueLoad", representedAs: "preference.adapt_on_overdue_load" });
  }

  if (policy.contentSource.realItemsFirst === true) {
    preferences.push({ kind: "real_items_first" });
    approximations.push({ field: "contentSource.realItemsFirst", representedAs: "preference.real_items_first" });
  }
  if (policy.contentSource.generatedForDrillsOnly === true) {
    constraints.push({ kind: "generated_for_drills_only" });
  }
  if (policy.contentSource.noGeneratedForAssessment === true) {
    constraints.push({ kind: "no_generated_for_assessment" });
  }

  return { preferences, constraints, approximations };
}

// ---------------------------------------------------------------------------
// Phases + program
// ---------------------------------------------------------------------------
function buildPhases(policy: TrackPolicy, trackId: string, name: string, goal: string): TrackPhaseSpec[] {
  if (policy.difficulty.mode === "staged" && policy.difficulty.stages && policy.difficulty.stages.length > 0) {
    return policy.difficulty.stages.map((stage, index) => ({
      id: `${trackId}:phase-${index + 1}`,
      label: `Stage ${index + 1}`,
      objective: goal,
      difficultyPolicy: {
        defaultTarget: {
          mode: stage.targetBand ? "fixed" : "range",
          targetBand: stage.targetBand ?? null,
          minBand: stage.minBand ?? null,
          maxBand: stage.maxBand ?? null,
        },
      },
      advanceWhen: [{
        kind: "session_count_reached",
        params: { count: stage.afterSessions },
      }],
    }));
  }
  return [{
    id: `${trackId}:phase-main`,
    label: name,
    objective: goal,
  }];
}

function evaluationStrictness(): EvaluationStrictness {
  return "balanced";
}

// ---------------------------------------------------------------------------
// Top-level lower
// ---------------------------------------------------------------------------
export function lowerPolicy(input: PolicyLowerInput): PolicyLowerResult {
  const unsupported = probeUnsupported(input.policy);
  if (unsupported.length > 0) {
    return {
      ok: false,
      unsupportedFields: unsupported,
      reason: `Policy uses fields with no V2 runtime representation: ${unsupported.join(", ")}.`,
    };
  }

  const { policy, trackId, userId, learnspaceId, name, goal, now } = input;
  const archetype = inferArchetype(policy);
  const queueStrategy = inferQueueStrategy(policy, archetype);
  const { scope: scopePolicy, excludeConstraints } = lowerScope(policy, learnspaceId);
  const difficultyPolicy = lowerDifficulty(policy);
  const blendPolicy = lowerBlend(policy);
  const pacingPolicy = lowerPacing(policy);
  const timeframe = lowerTimeframe(policy, now);
  const generationPolicy = lowerGeneration(policy);
  const schedulePolicy = lowerCadence(policy);
  const { preferences, constraints, approximations } = lowerPreferencesAndConstraints(policy);
  const phases = buildPhases(policy, trackId, name, goal);

  const successCriteria: SuccessCriterion[] = [];
  if (timeframe?.endAt) {
    successCriteria.push({
      kind: "deadline_reached",
      params: { endAt: timeframe.endAt },
    });
  }

  const interventionKinds: string[] = [];
  if (policy.adaptation.onRepeatedFailures === "rehab_focus") interventionKinds.push("focus_rehab");
  if (policy.adaptation.onRepeatedFailures === "increase_review") interventionKinds.push("repair_drill");
  if (queueStrategy === "weakest_first") interventionKinds.push("repair_drill");
  if (queueStrategy === "foundations") interventionKinds.push("confidence_rebuild");

  const spec: TrackSpecV2 = {
    version: "2",
    id: trackId,
    learnspaceId,
    userId,
    name,
    archetype,
    goal,
    explanation: goal,
    timeframe,
    successCriteria,
    constraints: [...excludeConstraints, ...constraints],
    preferences,
    scopePolicy,
    difficultyPolicy,
    blendPolicy,
    pacingPolicy,
    generationPolicy,
    evaluationPolicy: { mode: evaluationStrictness() },
    coveragePolicy: {},
    interventionPolicy: {
      enabled: interventionKinds.length > 0,
      allowedKinds: [...new Set(interventionKinds)],
    },
    schedulePolicy,
    phases,
  };

  const entryNodeId = `${trackId}:main`;
  const nodes: TrackNode[] = [{
    id: entryNodeId,
    label: name,
    type: "steady_state",
    objective: goal,
    plannerConfig: {
      sessionType: queueStrategy === "foundations"
        ? "untimed_solve"
        : queueStrategy === "weakest_first"
          ? "review_drill"
          : "timed_solve",
      queueStrategy,
      difficultyTarget: difficultyPolicy.defaultTarget,
      generationAllowed: generationPolicy.allowGeneration,
      evaluationStrictness: evaluationStrictness(),
    },
  }];

  const program: TrackProgramV2 = {
    version: "2",
    entryNodeId,
    nodes,
    transitions: [],
    globalPolicies: [],
    safetyGuards: [],
  };

  const repairs: PolicyRepairNote[] = [];

  const explanation: PolicyExplanation = {
    ...(approximations.length > 0 ? { approximations } : {}),
    ...(repairs.length > 0 ? { repairs } : {}),
  };

  return { ok: true, spec, program, explanation };
}
