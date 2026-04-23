import type {
  DifficultyBandId,
  EvaluatorKindId,
  EvidenceDimensionId,
  LearnspaceCapabilityProfile,
  ScopeDimensionId,
  SessionTypeId,
  StyleDimensionId,
} from "../families/types.js";
import type { SchedulerId } from "../core/schedulers/types.js";

export const TRACK_PRESETS = [
  "recommended",
  "explore",
  "weakest_pattern",
  "foundations",
] as const;

export type TrackPresetId = (typeof TRACK_PRESETS)[number];

export interface LearnspaceTrackSummary {
  id: string;
  learnspaceId: string;
  slug: string;
  name: string;
  goal: string;
  isSystem: boolean;
  source?: TrackSource;
  status?: TrackStatus;
  spec?: TrackSpecV2 | null;
  program?: TrackProgramV2 | null;
  policy?: unknown | null;
  policyOutcome?: string | null;
  policyExplanation?: unknown | null;
  policyCompilerVersion?: string | null;
}

export interface ResolvedTrackContext {
  track: LearnspaceTrackSummary;
  source: "active_track" | "session_mode_override" | "explicit_track" | "default_track";
}

// ---------------------------------------------------------------------------
// Track V2 types
// ---------------------------------------------------------------------------
export type TrackSource = "system_template" | "user_authored" | "llm_drafted";
export type TrackStatus = "draft" | "active" | "paused" | "completed" | "archived";

export type TrackArchetype =
  | "maintenance"
  | "deadline_sprint"
  | "weakness_rehab"
  | "foundations_rebuild"
  | "curriculum_progression"
  | "mock_interview"
  | "topic_sprint"
  | "breadth_then_depth"
  | "assessment_first"
  | "recovery_mode";

export interface TrackTimeframe {
  startAt?: string | null;
  endAt?: string | null;
  targetCadence?: string | null;
}

export interface TrackIntentV2 {
  version: "2";
  goal: string;
  timeframe?: TrackTimeframe | null;
  requestedFocus?: string[];
  requestedAvoid?: string[];
  stylePreferences?: string[];
  pacingPreferences?: string[];
  difficultyPreferences?: string[];
  successDefinition?: string | null;
  notes?: string | null;
}

export interface TrackConstraint {
  kind: string;
  params?: Record<string, unknown>;
}

export interface TrackPreference {
  kind: string;
  weight?: number | null;
  params?: Record<string, unknown>;
}

export interface SuccessCriterion {
  kind: string;
  scopeRefs?: ScopeRef[];
  params?: Record<string, unknown>;
}

export interface ScopeRef {
  dimension: ScopeDimensionId | string;
  value: string;
}

export interface ScopePolicy {
  mode: "learnspace" | "subset" | "weighted_subset" | "prerequisite_gated";
  refs: ScopeRef[];
  weights?: Record<string, number>;
}

export interface DifficultyTarget {
  mode: "fixed" | "range" | "adaptive";
  targetBand?: DifficultyBandId | string | null;
  minBand?: DifficultyBandId | string | null;
  maxBand?: DifficultyBandId | string | null;
}

export interface DifficultyPolicy {
  defaultTarget: DifficultyTarget;
  perScopeTargets?: Array<{
    scopeRefs: ScopeRef[];
    target: DifficultyTarget;
  }>;
  regressionAllowed?: boolean;
}

export interface SessionBlendEntry {
  kind: WorkUnitKind | string;
  weight: number;
}

export interface BlendPolicy {
  entries: SessionBlendEntry[];
}

export interface PacingPolicy {
  defaultTimeBudgetMinutes?: number | null;
  weekdayTimeBudgetMinutes?: number | null;
  weekendTimeBudgetMinutes?: number | null;
  cadence?: string | null;
}

export interface StyleTarget {
  dimensions: Array<{
    id: StyleDimensionId | string;
    value: string;
    weight?: number | null;
  }>;
}

export interface GenerationPolicy {
  allowGeneration: boolean;
  onlyWhenSeedPoolExhausted?: boolean;
  allowedArtifactKinds?: string[];
  styleTarget?: StyleTarget | null;
  noveltyTarget?: "low" | "medium" | "high" | null;
}

export interface EvaluationPolicy {
  mode: "learning" | "balanced" | "interview_honest" | "exam_honest" | "communication_focused";
  evaluatorKinds?: EvaluatorKindId[];
}

export interface CoveragePolicy {
  minimumExposureByScope?: Array<{
    scopeRefs: ScopeRef[];
    minimumShare: number;
  }>;
  antiStarvationWindowSessions?: number | null;
}

export interface InterventionPolicy {
  enabled: boolean;
  allowedKinds: string[];
}

export interface SchedulePolicy {
  recurringSessionRules?: RecurringRule[];
}

export interface RecurringRule {
  cadenceKind: "every_n_sessions" | "weekday" | "weekend";
  everyNSessions?: number;
  sessionType: SessionTypeId;
  workUnitKind: WorkUnitKind;
}

export interface TrackPhaseSpec {
  id: string;
  label: string;
  objective: string;
  scopePolicy?: ScopePolicy;
  difficultyPolicy?: DifficultyPolicy;
  blendPolicy?: BlendPolicy;
  generationPolicy?: GenerationPolicy;
  evaluationPolicy?: EvaluationPolicy;
  advanceWhen?: TransitionCondition[];
}

export interface TrackSpecV2 {
  version: "2";
  id: string;
  learnspaceId: string;
  userId: string;
  name: string;
  archetype: TrackArchetype;
  goal: string;
  explanation: string;
  timeframe: TrackTimeframe | null;
  successCriteria: SuccessCriterion[];
  constraints: TrackConstraint[];
  preferences: TrackPreference[];
  scopePolicy: ScopePolicy;
  difficultyPolicy: DifficultyPolicy;
  blendPolicy: BlendPolicy;
  pacingPolicy: PacingPolicy;
  generationPolicy: GenerationPolicy;
  evaluationPolicy: EvaluationPolicy;
  coveragePolicy: CoveragePolicy;
  interventionPolicy: InterventionPolicy;
  schedulePolicy: SchedulePolicy;
  phases: TrackPhaseSpec[];
}

export interface TransitionCondition {
  kind:
    | "date_window_reached"
    | "session_count_reached"
    | "clean_solve_count_reached"
    | "evidence_threshold_crossed"
    | "backlog_threshold_crossed"
    | "prerequisite_satisfied"
    | "recurring_cadence_trigger"
    | "manual_override"
    | "repeated_failure_trigger";
  params?: Record<string, unknown>;
}

export type TrackQueueStrategy =
  | "scheduler"
  | "new_only"
  | "weakest_first"
  | "hardest_first"
  | "foundations";

export interface TrackNodePlannerConfig {
  sessionType?: SessionTypeId;
  queueStrategy?: TrackQueueStrategy;
  difficultyTarget?: DifficultyTarget;
  generationAllowed?: boolean;
  evaluationStrictness?: EvaluationStrictness;
}

export interface GlobalPolicy {
  kind: string;
  params?: Record<string, unknown>;
}

export interface SafetyGuard {
  kind: string;
  params?: Record<string, unknown>;
}

export interface TrackNodeBase {
  id: string;
  label: string;
  type: string;
  objective: string;
  plannerConfig?: TrackNodePlannerConfig;
}

export interface SteadyStateNode extends TrackNodeBase {
  type: "steady_state";
}

export interface PhaseNode extends TrackNodeBase {
  type: "phase";
  phaseId: string;
}

export interface BranchNode extends TrackNodeBase {
  type: "branch";
}

export interface DrillInjectionNode extends TrackNodeBase {
  type: "drill_injection";
  interventionKind: string;
}

export interface RecurringSessionNode extends TrackNodeBase {
  type: "recurring_session";
  recurringRule: RecurringRule;
}

export interface AssessmentNode extends TrackNodeBase {
  type: "assessment";
}

export interface RecoveryNode extends TrackNodeBase {
  type: "recovery";
}

export interface DeadlineModeNode extends TrackNodeBase {
  type: "deadline_mode";
}

export interface MaintenanceNode extends TrackNodeBase {
  type: "maintenance";
}

export interface CompletionNode extends TrackNodeBase {
  type: "completion";
}

export type TrackNode =
  | SteadyStateNode
  | PhaseNode
  | BranchNode
  | DrillInjectionNode
  | RecurringSessionNode
  | AssessmentNode
  | RecoveryNode
  | DeadlineModeNode
  | MaintenanceNode
  | CompletionNode;

export interface TrackTransition {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  when: TransitionCondition[];
  priority: number;
}

export interface TrackProgramV2 {
  version: "2";
  entryNodeId: string;
  nodes: TrackNode[];
  transitions: TrackTransition[];
  globalPolicies: GlobalPolicy[];
  safetyGuards: SafetyGuard[];
}

export interface NodeProgressState {
  completedSessions?: number;
  cleanSolves?: number;
  failureCount?: number;
  metadata?: Record<string, unknown>;
}

export interface ActiveIntervention {
  kind: string;
  startedAt: string;
  metadata?: Record<string, unknown>;
}

export interface TemporaryOverride {
  kind: string;
  value: Record<string, unknown>;
  expiresAt?: string | null;
}

export interface RecurringState {
  ruleId: string;
  lastTriggeredAt?: string | null;
  sessionsSinceLastTrigger?: number;
}

export interface CoverageState {
  lastServedByScopeKey?: Record<string, string>;
  exposureShareByScopeKey?: Record<string, number>;
}

export interface SessionHistorySummary {
  sessionId: string;
  planNodeId: string;
  completedAt?: string | null;
  outcome?: string | null;
}

export interface PlannerDecisionSummary {
  sessionId?: string | null;
  nodeId: string;
  sessionType: SessionTypeId;
  explanation: string;
  decidedAt: string;
}

export interface ManualPin {
  kind: string;
  value: string;
  expiresAt?: string | null;
}

export interface TrackRuntimeStateV2 {
  version: "2";
  trackId: string;
  activeNodeId: string;
  phaseEnteredAt: string;
  nodeProgress: Record<string, NodeProgressState>;
  activeInterventions: ActiveIntervention[];
  temporaryOverrides: TemporaryOverride[];
  recurringState: RecurringState[];
  coverageState: CoverageState;
  recentSessionHistory: SessionHistorySummary[];
  lastPlannerDecision: PlannerDecisionSummary | null;
  manualPins: ManualPin[];
  status: "active" | "paused" | "completed" | "archived";
  updatedAt: string;
}

export interface EvidenceOutcome {
  result: "clean" | "assisted" | "failed" | "partial" | "unknown";
  severity?: "minor" | "moderate" | "critical" | null;
}

export interface MistakePatternSignal {
  kind: string;
  weight?: number;
  scopeRefs?: ScopeRef[];
}

export interface StrengthSignal {
  kind: string;
  weight?: number;
  scopeRefs?: ScopeRef[];
}

export interface CommunicationSignal {
  kind: string;
  weight?: number;
}

export interface DifficultyMismatchSignal {
  direction: "too_easy" | "too_hard";
  scopeRefs?: ScopeRef[];
}

export interface NoveltyToleranceSignal {
  level: "low" | "medium" | "high";
}

export interface FatigueSignal {
  level: "low" | "medium" | "high";
}

export interface ReadinessSignal {
  kind: string;
  scopeRefs?: ScopeRef[];
}

export interface ConfidenceCalibrationSignal {
  direction: "underconfident" | "overconfident" | "well_calibrated";
}

export interface EvidenceRecordV2 {
  version: "2";
  id: string;
  userId: string;
  learnspaceId: string;
  trackId?: string | null;
  artifactId: string | null;
  sessionId: string | null;
  attemptId: string | null;
  observedAt: string;
  source: "deterministic_runtime" | "llm_extraction" | "manual_user_input";
  scopeRefs: ScopeRef[];
  outcome: EvidenceOutcome | null;
  mistakePatterns: MistakePatternSignal[];
  strengthSignals: StrengthSignal[];
  communicationSignals: CommunicationSignal[];
  difficultyMismatch: DifficultyMismatchSignal | null;
  noveltyTolerance: NoveltyToleranceSignal | null;
  fatigueOrAvoidance: FatigueSignal | null;
  readinessSignals: ReadinessSignal[];
  confidenceCalibration: ConfidenceCalibrationSignal | null;
}

export type WorkUnitKind =
  | "due_review"
  | "new_material"
  | "generated_material"
  | "recall"
  | "drill"
  | "mock"
  | "synthesis"
  | "critique"
  | "reflection";

export interface SessionBlend {
  entries: SessionBlendEntry[];
}

export interface GenerationInstruction {
  required: boolean;
  artifactKind?: string | null;
  styleTarget?: StyleTarget | null;
  noveltyTarget?: "low" | "medium" | "high" | null;
}

export type EvaluationStrictness =
  | "learning"
  | "balanced"
  | "interview_honest"
  | "exam_honest"
  | "communication_focused";

export interface TimeBudget {
  minutes: number;
}

export interface SelectionConstraint {
  kind: string;
  params?: Record<string, unknown>;
}

export interface CandidateScope {
  refs: ScopeRef[];
  capabilityProfile?: Pick<LearnspaceCapabilityProfile, "scopeDimensions" | "artifactKinds">;
}

export interface SessionWorkUnit {
  id: string;
  role: "primary" | "adjunct";
  kind: WorkUnitKind;
  objective: string;
  candidateScope: CandidateScope;
  blend: SessionBlend;
  difficultyTarget: DifficultyTarget;
  styleTarget: StyleTarget | null;
  generationInstruction: GenerationInstruction | null;
  selectionConstraints: SelectionConstraint[];
}

export interface SessionRecipe {
  workUnits: SessionWorkUnit[];
}

export interface FallbackRule {
  kind: string;
  params?: Record<string, unknown>;
}

export interface SessionPlanV2 {
  version: "2";
  trackId: string;
  nodeId: string;
  sessionType: SessionTypeId;
  objective: string;
  explanation: string;
  recipe: SessionRecipe;
  evaluationStrictness: EvaluationStrictness;
  timeBudget: TimeBudget | null;
  fallbackRules: FallbackRule[];
}

export interface SessionCompletionSummary {
  sessionId: string;
  outcome?: string | null;
  completedAt: string;
}

export interface ManualOverrideCommand {
  kind: string;
  params?: Record<string, unknown>;
}

export interface TrackTransitionEvent {
  trackId: string;
  fromNodeId: string;
  toNodeId: string;
  triggeredBy: TransitionCondition["kind"];
  evidenceIds?: string[];
  createdAt: string;
}

export interface PlannerAuditEvent {
  trackId: string;
  nodeId: string;
  sessionId?: string | null;
  sessionType: SessionTypeId;
  explanation: string;
  createdAt: string;
}

export interface TrackRuntimeReducerInput {
  trackId: string;
  priorState: TrackRuntimeStateV2;
  sessionPlan: SessionPlanV2 | null;
  completion: SessionCompletionSummary | null;
  evidence: EvidenceRecordV2[];
  manualOverride: ManualOverrideCommand | null;
}

export interface TrackRuntimeReducerOutput {
  nextState: TrackRuntimeStateV2;
  transitionEvents: TrackTransitionEvent[];
  plannerAuditEvents: PlannerAuditEvent[];
}

export interface TrackPlannerContext {
  capabilities: LearnspaceCapabilityProfile;
  schedulerId: SchedulerId;
}
