export const TRACK_V4_POLICY_FAMILIES = [
  "scope",
  "allocation",
  "pacing",
  "session_composition",
  "difficulty",
  "progression",
  "review",
  "adaptation",
  "cadence",
  "content_source",
] as const;

export type TrackV4PolicyFamily = (typeof TRACK_V4_POLICY_FAMILIES)[number];

export type TrackV4DomainId =
  | "coding-interview-patterns"
  | "writing-workshop"
  | "language-lab";

export type TrackV4BenchmarkClass =
  | "supported"
  | "ambiguous"
  | "repairable"
  | "unsupported";

export type TrackV4HandlingOutcome =
  | "compiled"
  | "repaired"
  | "clarify"
  | "reject";

export interface ScopePolicyV4 {
  includeSkillIds: string[];
  excludeSkillIds: string[];
  includeCategories: string[];
  excludeCategories: string[];
  weakAreasOnly?: boolean;
  fundamentalsOnly?: boolean;
}

export interface AllocationPolicyV4 {
  skillWeights?: Record<string, number>;
  categoryWeights?: Record<string, number>;
  breadthVsDepth?: "balanced" | "breadth_first" | "depth_first";
  weakAreaBias?: "none" | "moderate" | "strong";
}

export interface PacingPolicyV4 {
  weekdayMinutes?: number | null;
  weekendMinutes?: number | null;
  sessionsPerWeek?: number | null;
  maxDailyMinutes?: number | null;
  intensity?: "light" | "steady" | "intense";
  deadlineWeeks?: number | null;
}

export interface SessionCompositionPolicyV4 {
  reviewShare?: number | null;
  newShare?: number | null;
  drillShare?: number | null;
  mockShare?: number | null;
  recallShare?: number | null;
  warmup?: boolean;
  mixedSessions?: boolean;
  maxNewItemsPerSession?: number | null;
}

export interface DifficultyPolicyV4 {
  mode: "fixed" | "staged" | "adaptive";
  targetBand?: "easy" | "medium" | "hard" | null;
  minBand?: "easy" | "medium" | "hard" | null;
  maxBand?: "easy" | "medium" | "hard" | null;
  backoffOnStruggle?: boolean;
  pushOnSuccess?: boolean;
  stages?: Array<{
    afterSessions: number;
    targetBand?: "easy" | "medium" | "hard" | null;
    minBand?: "easy" | "medium" | "hard" | null;
    maxBand?: "easy" | "medium" | "hard" | null;
  }>;
}

export interface ProgressionPolicyV4 {
  mode: "linear" | "mastery_gated" | "breadth_first" | "depth_first" | "spiral";
  prerequisitesFirst?: boolean;
}

export interface ReviewPolicyV4 {
  scheduler: "sm5";
  aggressiveness?: "light" | "balanced" | "aggressive";
  dueReviewCap?: number | null;
  includeOverdueEverySession?: boolean;
  interleaveOldAndNew?: boolean;
}

export interface AdaptationPolicyV4 {
  onRepeatedFailures?: "reduce_difficulty" | "increase_review" | "rehab_focus" | null;
  onCleanStreak?: "advance_difficulty" | "unlock_next" | null;
  onOverdueLoad?: "reduce_new_material" | "review_focus" | null;
  onSeedPoolLow?: "allow_generation" | null;
}

export interface CadenceRuleV4 {
  kind: "every_n_sessions" | "weekday" | "weekend" | "before_deadline";
  bucket: "mock" | "drill" | "review" | "recap";
  everyNSessions?: number;
  weekday?: number;
  weeksBeforeDeadline?: number;
}

export interface ContentSourcePolicyV4 {
  seedOnly?: boolean;
  generatedAllowed?: boolean;
  generatedOnlyAsFallback?: boolean;
  generatedForDrillsOnly?: boolean;
  realItemsFirst?: boolean;
  noGeneratedForAssessment?: boolean;
}

export interface TrackPolicyV4 {
  scope: ScopePolicyV4;
  allocation: AllocationPolicyV4;
  pacing: PacingPolicyV4;
  sessionComposition: SessionCompositionPolicyV4;
  difficulty: DifficultyPolicyV4;
  progression: ProgressionPolicyV4;
  review: ReviewPolicyV4;
  adaptation: AdaptationPolicyV4;
  cadence: CadenceRuleV4[];
  contentSource: ContentSourcePolicyV4;
}

export interface RuntimeTraceStepV4 {
  sessionIndex: number;
  completed: boolean;
  outcomes: Array<{
    skillId: string;
    difficultyBand: "easy" | "medium" | "hard";
    result: "success" | "struggle" | "fail";
    score: number;
  }>;
  overdueCount?: number;
  seedPoolLow?: boolean;
}

export interface RuntimeScenarioV4 {
  id: string;
  description: string;
  trace: RuntimeTraceStepV4[];
  invariants: Array<
    | { kind: "excluded_skills_never_appear"; skillIds: string[] }
    | { kind: "difficulty_reduces_after_failure_streak"; bySession: number }
    | { kind: "difficulty_increases_after_clean_streak"; bySession: number }
    | { kind: "review_share_increases_after_overdue_load"; bySession: number; minimumReviewShare?: number }
    | { kind: "weekend_minutes_exceed_weekday_minutes"; weekendSession: number; weekdaySession: number }
    | { kind: "generation_only_when_allowed" }
    | { kind: "time_budget_respected" }
  >;
}

export interface TrackBenchmarkCaseV4 {
  intentId: string;
  domainId: TrackV4DomainId;
  benchmarkClass: TrackV4BenchmarkClass;
  policyFamilies: TrackV4PolicyFamily[];
  naturalLanguageRequests: string[];
  goldPolicy?: TrackPolicyV4;
  acceptableEquivalentPolicies?: TrackPolicyV4[];
  clarificationExpected: boolean;
  repairAllowed: boolean;
  expectedOutcome: TrackV4HandlingOutcome;
  runtimeScenarios?: RuntimeScenarioV4[];
  unsupportedReason?: string;
}

export interface TrackBenchmarkSummaryV4 {
  total: number;
  byClass: Record<TrackV4BenchmarkClass, number>;
  byDomain: Record<TrackV4DomainId, number>;
}

export interface TrackV4AcceptanceThresholds {
  minCases: number;
  taxonomyExpressivityRate: number;
  handledCorrectlyRate: number;
  inDomainHandledCorrectlyRate: number;
  perDomainHandledCorrectlyRate: number;
  perClassHandledCorrectlyRate: Partial<Record<Exclude<TrackV4BenchmarkClass, "unsupported">, number>>;
}

export const TRACK_V4_ACCEPTANCE_THRESHOLDS: TrackV4AcceptanceThresholds = {
  minCases: 100,
  taxonomyExpressivityRate: 95,
  handledCorrectlyRate: 98,
  inDomainHandledCorrectlyRate: 98,
  perDomainHandledCorrectlyRate: 95,
  perClassHandledCorrectlyRate: {
    supported: 98,
    ambiguous: 98,
    repairable: 98,
  },
};
