import type { EvaluationStrictness } from "../tracks/types.js";

export type PracticeOutcome = "clean" | "assisted" | "failed" | "abandoned";
export type SessionStatus = "created" | "in_progress" | "completed" | "abandoned";
export type StepQuality = "missing" | "partial" | "solid" | "strong";
export type EvaluationSeverity = "minor" | "moderate" | "critical";
export type MessageRole = "user" | "assistant" | "system";
export type UserUnderstanding = "confused" | "partial" | "solid" | "strong";
export type SkillTrend = "improving" | "stable" | "declining";

export interface SM2State {
  intervalDays: number;
  easeFactor: number;
  round: number;
}

export interface StructuredEvaluation {
  outcome: Exclude<PracticeOutcome, "abandoned">;
  diagnosis: string;
  severity: EvaluationSeverity;
  approach_correct: boolean;
  per_step_quality: Record<string, StepQuality>;
  mistakes: Array<{
    type: string;
    description: string;
    step: string;
  }>;
  strengths: string[];
  coaching_summary: string;
  evaluation_source: "llm" | "stub";
  retry_recovered: boolean;
  stub_reason?: string;
}

export interface LLMEvaluation {
  outcome: Exclude<PracticeOutcome, "abandoned">;
  diagnosis: string;
  severity: EvaluationSeverity;
  approach_correct: boolean;
  per_step_quality: Record<string, StepQuality>;
  mistakes: Array<{
    type: string;
    description: string;
    step: string;
  }>;
  strengths: string[];
  coaching_summary: string;
}

export interface SessionMessage {
  role: MessageRole;
  content: string;
  createdAt: string;
  coachAction?: string;
}

export interface CoachingMetadata {
  help_level: number;
  information_revealed: string[];
  user_appears_stuck: boolean;
  user_understanding: UserUnderstanding;
  notable_mistake: string | null;
  gave_full_solution: boolean;
}

export interface AttemptCoachingSummary {
  coach_turns: number;
  avg_help_level: number;
  max_help_level: number;
  stuck_turns: number;
  full_solution_turns: number;
  latest_understanding: UserUnderstanding | null;
  recurring_notable_mistakes: string[];
  information_revealed: string[];
}

export interface PracticeClock {
  now: () => Date;
}

export interface AttemptFeatures {
  solution_revealed: boolean;
  total_help_level: number;
  coach_turns: number;
  tests_passed: boolean | null;
  execution_required: boolean;
  execution_present: boolean;
  step_completion_rate: number;
}

export interface AttemptContext {
  attemptId: string;
  sessionId: string;
  learnspaceId: string;
  itemId: string;
  evaluationPromptTemplate: string;
  itemTitle: string;
  itemContent: Record<string, unknown>;
  referenceSolution: string | null;
  protocolSteps: Array<{
    id: string;
    label: string;
    instruction: string;
    agentPrompt: string;
    editor: "text" | "code" | "readonly";
  }>;
  primarySkill: { id: string; name: string };
  secondarySkills: Array<{ id: string; name: string }>;
  stepDrafts: Record<string, { content: string; updatedAt: string }>;
  testResults: {
    passed: number;
    failed: number;
    errors: string[];
  } | null;
  coachingTranscript: Array<{
    role: "user" | "assistant";
    content: string;
    metadata?: CoachingMetadata | null;
  }>;
  coachingSummary: AttemptCoachingSummary;
  attemptFeatures: AttemptFeatures;
  executionRequired: boolean;
  evaluationStrictness: EvaluationStrictness;
}
