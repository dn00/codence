import type { CompletionLLM } from "../ai/llm-adapter.js";
import type { CoachRuntime } from "../ai/coach-runtime.js";
import type { ExecutionAdapter } from "../execution/executor.js";
import type { AppDatabase } from "../persistence/db.js";
import type { SelectionTier } from "./schedulers/types.js";
import type { LearnspaceTrackSummary, SessionPlanV2 } from "../tracks/types.js";
import type { SchedulerId } from "./schedulers/types.js";

export type QueueTier = SelectionTier;

export interface QueueSelection {
  queueId: string;
  skillId: string;
  skillName: string;
  tier: QueueTier;
  dueDate: string | null;
  confidenceScore: number;
  trackId: string | null;
  selectionReason: SelectionReason;
  item: {
    id: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    skillIds: string[];
    tags: string[];
    source: string;
    status: string;
    content: Record<string, unknown>;
  };
}

export interface QueueEmptyResult {
  type: "empty";
  code: "queue_empty";
  message: string;
}

export interface SelectionReason {
  schedulerIds: SchedulerId[];
  candidateTier: QueueTier;
  trackId: string | null;
  trackSnapshot: LearnspaceTrackSummary | null;
  sessionPlanSummary?: {
    nodeId: string;
    sessionType: string;
    objective: string;
  } | null;
  rerankedByLLM: boolean;
  generated: boolean;
  generatedFromArtifactId?: string | null;
  generationAllowed: boolean;
  selectionSource: "item_queue" | "skill_queue" | "direct_item";
  reasons: string[];
}

export interface QueueDependencies {
  db: AppDatabase;
  now: () => Date;
  completionLLM?: CompletionLLM;
  executionAdapter?: ExecutionAdapter;
  coachRuntime?: CoachRuntime;
}

export interface QueueScopeInput {
  userId: string;
  learnspaceId: string;
  trackId?: string;
  sessionPlan?: SessionPlanV2;
  targetSkillId?: string;
  targetItemId?: string;
  forceGenerated?: boolean;
}
