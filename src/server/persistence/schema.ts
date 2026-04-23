import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  EvidenceRecordV2,
  PlannerAuditEvent,
  TrackProgramV2,
  TrackRuntimeStateV2,
  TrackSource,
  TrackSpecV2,
  TrackStatus,
  TrackTransitionEvent,
} from "../tracks/types.js";
import type { TrackPolicy, PolicyOutcome, PolicyExplanation } from "../tracks/policy/types.js";

export type LearnspaceSource = "built-in" | "user-generated" | "user-edited";

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  preferences: text("preferences", { mode: "json" }).$type<Record<string, unknown>>(),
  activeLearnspaceId: text("active_learnspace_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// learnspaces
// ---------------------------------------------------------------------------
export const learnspaces = sqliteTable("learnspaces", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  source: text("source").$type<LearnspaceSource>().notNull().default("built-in"),
  activeTag: text("active_tag"),
  activeTrackId: text("active_track_id"),
  interviewDate: text("interview_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// tracks
// ---------------------------------------------------------------------------
export const tracks = sqliteTable("tracks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  learnspaceId: text("learnspace_id").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  source: text("source").$type<TrackSource>().default("system_template"),
  status: text("status").$type<TrackStatus>().default("active"),
  spec: text("spec", { mode: "json" }).$type<TrackSpecV2>(),
  program: text("program", { mode: "json" }).$type<TrackProgramV2>(),
  policy: text("policy", { mode: "json" }).$type<TrackPolicy>(),
  policyOutcome: text("policy_outcome").$type<PolicyOutcome>(),
  policyExplanation: text("policy_explanation", { mode: "json" }).$type<PolicyExplanation>(),
  policyCompilerVersion: text("policy_compiler_version"),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// track_runtime_state
// ---------------------------------------------------------------------------
export const trackRuntimeState = sqliteTable("track_runtime_state", {
  trackId: text("track_id").primaryKey(),
  learnspaceId: text("learnspace_id").notNull(),
  userId: text("user_id").notNull(),
  state: text("state", { mode: "json" }).$type<TrackRuntimeStateV2>().notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// track_transition_events
// ---------------------------------------------------------------------------
export const trackTransitionEvents = sqliteTable("track_transition_events", {
  id: text("id").primaryKey(),
  trackId: text("track_id").notNull(),
  learnspaceId: text("learnspace_id").notNull(),
  userId: text("user_id").notNull(),
  event: text("event", { mode: "json" }).$type<TrackTransitionEvent>().notNull(),
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// planner_decision_events
// ---------------------------------------------------------------------------
export const plannerDecisionEvents = sqliteTable("planner_decision_events", {
  id: text("id").primaryKey(),
  trackId: text("track_id").notNull(),
  learnspaceId: text("learnspace_id").notNull(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id"),
  event: text("event", { mode: "json" }).$type<PlannerAuditEvent>().notNull(),
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// evidence_records
// ---------------------------------------------------------------------------
export const evidenceRecords = sqliteTable("evidence_records", {
  id: text("id").primaryKey(),
  trackId: text("track_id"),
  learnspaceId: text("learnspace_id").notNull(),
  userId: text("user_id").notNull(),
  artifactId: text("artifact_id"),
  sessionId: text("session_id"),
  attemptId: text("attempt_id"),
  evidence: text("evidence", { mode: "json" }).$type<EvidenceRecordV2>().notNull(),
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// categories — higher-level groupings that skills belong to. Seeded per
// learnspace. Populates the "includeCategories" surface in the policy
// prompt, validator, and queue scope expansion.
// ---------------------------------------------------------------------------
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  learnspaceId: text("learnspace_id").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// skills
// ---------------------------------------------------------------------------
export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  learnspaceId: text("learnspace_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),          // denormalized label, kept for display
  categoryId: text("category_id"),                // FK → categories.id; nullable for uncategorized/legacy
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// items
// ---------------------------------------------------------------------------
export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  learnspaceId: text("learnspace_id").notNull(),
  slug: text("slug"),
  title: text("title").notNull(),
  content: text("content", { mode: "json" }).$type<Record<string, unknown>>(),
  skillIds: text("skill_ids", { mode: "json" }).$type<string[]>(),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  difficulty: text("difficulty").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull().default("active"),
  parentItemId: text("parent_item_id"),
  createdAt: text("created_at").notNull(),
  retiredAt: text("retired_at"),
});

// ---------------------------------------------------------------------------
// artifact_lineage
// ---------------------------------------------------------------------------
export const artifactLineage = sqliteTable("artifact_lineage", {
  artifactId: text("artifact_id").primaryKey(),
  parentArtifactId: text("parent_artifact_id"),
  source: text("source").notNull().default("generated"),
  generationMode: text("generation_mode").notNull(),
  generatedForSkillId: text("generated_for_skill_id"),
  generatedForTrackId: text("generated_for_track_id"),
  generatorVersion: text("generator_version").notNull(),
  promptVersion: text("prompt_version"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  // Snapshot of the parent item at generation time so lineage survives
  // parent deletion (phase 4 of the CRUD snapshot plan).
  parentItemSnapshot: text("parent_item_snapshot", { mode: "json" }).$type<{
    id: string;
    title: string;
    difficulty: string;
    source: string;
    content: Record<string, unknown> | null;
    skillIds: string[];
    snapshottedAt: string;
  } | null>(),
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  learnspaceId: text("learnspace_id").notNull(),
  userId: text("user_id").notNull(),
  itemId: text("item_id").notNull(),
  blueprintId: text("blueprint_id"),
  blueprintVersion: integer("blueprint_version"),
  blueprintSnapshot: text("blueprint_snapshot", { mode: "json" }).$type<Record<string, unknown>>(),
  status: text("status").notNull(),
  currentStep: text("current_step"),
  stepInteractions: text("step_interactions", { mode: "json" }).$type<Record<string, unknown>>(),
  messages: text("messages", { mode: "json" }).$type<unknown[]>(),
  selectionContext: text("selection_context", { mode: "json" }).$type<Record<string, unknown>>(),
  // Snapshot of the track that drove this session, captured at creation
  // time. History renders from this; the live `tracks` catalog is only
  // checked when the UI needs a "still active?" link. Enables hard
  // delete of tracks without orphaning past sessions.
  trackSnapshot: text("track_snapshot", { mode: "json" }).$type<{
    id: string;
    name: string;
    goal: string;
    slug: string;
    isSystem: boolean;
    spec: Record<string, unknown> | null;
    program: Record<string, unknown> | null;
    policy: Record<string, unknown> | null;
    snapshottedAt: string;
  }>(),
  coachRuntimeState: text("coach_runtime_state", { mode: "json" }).$type<{
    backend: string;
    runtimeSessionId: string;
    startedAt: string;
    lastUsedAt: string;
  }>(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});

// ---------------------------------------------------------------------------
// attempts
// ---------------------------------------------------------------------------
export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(),
  learnspaceId: text("learnspace_id").notNull(),
  userId: text("user_id").notNull(),
  itemId: text("item_id").notNull(),
  sessionId: text("session_id"),
  modelOutcome: text("model_outcome"),
  blueprintId: text("blueprint_id"),
  blueprintVersion: integer("blueprint_version"),
  blueprintSnapshot: text("blueprint_snapshot", { mode: "json" }).$type<Record<string, unknown>>(),
  outcome: text("outcome"),
  appliedOverrides: text("applied_overrides", { mode: "json" }).$type<Record<string, unknown>[]>(),
  selectionContext: text("selection_context", { mode: "json" }).$type<Record<string, unknown>>(),
  workSnapshot: text("work_snapshot", { mode: "json" }).$type<Record<string, unknown>>(),
  testResults: text("test_results", { mode: "json" }).$type<Record<string, unknown>>(),
  structuredEvaluation: text("structured_evaluation", { mode: "json" }).$type<Record<string, unknown>>(),
  evaluationSource: text("evaluation_source"),
  retryRecovered: integer("retry_recovered", { mode: "boolean" }),
  stubReason: text("stub_reason"),
  coachingMetadata: text("coaching_metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  attemptFeatures: text("attempt_features", { mode: "json" }).$type<Record<string, unknown>>(),
  disputed: integer("disputed", { mode: "boolean" }).notNull().default(false),
  // Snapshot of the item at attempt start. Lets items be hard-deleted
  // from the catalog without orphaning attempt history. Read paths
  // prefer this over the live `items` row.
  itemSnapshot: text("item_snapshot", { mode: "json" }).$type<{
    id: string;
    title: string;
    difficulty: string;
    source: string;
    status: string;
    content: Record<string, unknown> | null;
    skillIds: string[];
    tags: string[];
    snapshottedAt: string;
  }>(),
  // Snapshots of the skills attached to the item at attempt start.
  // Same rationale — skills can be renamed, recategorized, or deleted
  // without breaking past attempts.
  skillSnapshots: text("skill_snapshots", { mode: "json" }).$type<Array<{
    id: string;
    name: string;
    category: string;
    categoryId: string | null;
  }>>(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});

// ---------------------------------------------------------------------------
// selection_events
// ---------------------------------------------------------------------------
export const selectionEvents = sqliteTable("selection_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id"),
  attemptId: text("attempt_id"),
  learnspaceId: text("learnspace_id").notNull(),
  userId: text("user_id").notNull(),
  trackId: text("track_id"),
  artifactId: text("artifact_id").notNull(),
  schedulerIds: text("scheduler_ids", { mode: "json" }).$type<string[]>(),
  candidateSnapshot: text("candidate_snapshot", { mode: "json" }).$type<Record<string, unknown>>(),
  selectedReason: text("selected_reason", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// queue
// ---------------------------------------------------------------------------
export const queue = sqliteTable("queue", {
  id: text("id").primaryKey(),
  learnspaceId: text("learnspace_id").notNull(),
  userId: text("user_id").notNull(),
  skillId: text("skill_id").notNull(),
  intervalDays: real("interval_days").notNull(),
  easeFactor: real("ease_factor").notNull(),
  // dueDate is the *display* due date — may be rewritten by overdue-queue
  // smoothing to spread a backlog across upcoming days. Tier selection reads
  // this (post-smoothing value).
  dueDate: text("due_date"),
  // scheduledDate is the *immutable* scheduled date set by the scheduler on
  // completion. Smoothing never touches it. Schedulers that compute lateness
  // (FSRS, deadline-anchored) read this, not dueDate. Nullable: rows with no
  // scheduled review (round 0, freshly seeded) remain null.
  scheduledDate: text("scheduled_date"),
  round: integer("round").notNull().default(0),
  lastOutcome: text("last_outcome"),
  skipCount: integer("skip_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// item_queue (problem-level SRS scheduling)
// ---------------------------------------------------------------------------
export const itemQueue = sqliteTable("item_queue", {
  id: text("id").primaryKey(),
  learnspaceId: text("learnspace_id").notNull(),
  userId: text("user_id").notNull(),
  itemId: text("item_id").notNull(),
  skillId: text("skill_id").notNull(),
  intervalDays: real("interval_days").notNull().default(1),
  easeFactor: real("ease_factor").notNull().default(2.5),
  round: integer("round").notNull().default(0),
  // dueDate is the *display* due date — may be rewritten by overdue-queue
  // smoothing to spread a backlog across upcoming days.
  dueDate: text("due_date"),
  // scheduledDate is the *immutable* scheduled date set by the scheduler on
  // completion. Smoothing never touches it. Preserves the
  // `completedAt − scheduledDate` signal for schedulers that need it
  // (FSRS memory-stability, deadline-anchored cramming).
  scheduledDate: text("scheduled_date"),
  lastOutcome: text("last_outcome"),
  skipCount: integer("skip_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// skill_confidence
// ---------------------------------------------------------------------------
export const skillConfidence = sqliteTable("skill_confidence", {
  learnspaceId: text("learnspace_id").notNull(),
  userId: text("user_id").notNull(),
  skillId: text("skill_id").notNull(),
  score: real("score").notNull().default(0.0),
  totalAttempts: integer("total_attempts").notNull().default(0),
  cleanSolves: integer("clean_solves").notNull().default(0),
  assistedSolves: integer("assisted_solves").notNull().default(0),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lastPracticedAt: text("last_practiced_at"),
  trend: text("trend"),
}, (table) => [
  primaryKey({ columns: [table.learnspaceId, table.userId, table.skillId] }),
]);

// ---------------------------------------------------------------------------
// Inferred types for downstream consumers
// ---------------------------------------------------------------------------
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Learnspace = InferSelectModel<typeof learnspaces>;
export type NewLearnspace = InferInsertModel<typeof learnspaces>;

export type Track = InferSelectModel<typeof tracks>;
export type NewTrack = InferInsertModel<typeof tracks>;

export type TrackRuntimeStateRow = InferSelectModel<typeof trackRuntimeState>;
export type NewTrackRuntimeStateRow = InferInsertModel<typeof trackRuntimeState>;

export type TrackTransitionEventRow = InferSelectModel<typeof trackTransitionEvents>;
export type NewTrackTransitionEventRow = InferInsertModel<typeof trackTransitionEvents>;

export type PlannerDecisionEventRow = InferSelectModel<typeof plannerDecisionEvents>;
export type NewPlannerDecisionEventRow = InferInsertModel<typeof plannerDecisionEvents>;

export type EvidenceRecordRow = InferSelectModel<typeof evidenceRecords>;
export type NewEvidenceRecordRow = InferInsertModel<typeof evidenceRecords>;

export type Skill = InferSelectModel<typeof skills>;
export type NewSkill = InferInsertModel<typeof skills>;

export type Item = InferSelectModel<typeof items>;
export type NewItem = InferInsertModel<typeof items>;

export type ArtifactLineage = InferSelectModel<typeof artifactLineage>;
export type NewArtifactLineage = InferInsertModel<typeof artifactLineage>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export type Attempt = InferSelectModel<typeof attempts>;
export type NewAttempt = InferInsertModel<typeof attempts>;

export type SelectionEvent = InferSelectModel<typeof selectionEvents>;
export type NewSelectionEvent = InferInsertModel<typeof selectionEvents>;

export type QueueRow = InferSelectModel<typeof queue>;
export type NewQueueRow = InferInsertModel<typeof queue>;

export type ItemQueueRow = InferSelectModel<typeof itemQueue>;
export type NewItemQueueRow = InferInsertModel<typeof itemQueue>;

export type SkillConfidence = InferSelectModel<typeof skillConfidence>;
export type NewSkillConfidence = InferInsertModel<typeof skillConfidence>;

// Canonical table list for validation
export const CANONICAL_TABLES = [
  "users",
  "learnspaces",
  "tracks",
  "track_runtime_state",
  "track_transition_events",
  "planner_decision_events",
  "evidence_records",
  "categories",
  "skills",
  "items",
  "artifact_lineage",
  "sessions",
  "attempts",
  "selection_events",
  "queue",
  "item_queue",
  "skill_confidence",
] as const;
