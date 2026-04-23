/**
 * Coach action policy contracts and deterministic turn assessment.
 *
 * Defines the generic, learnspace-agnostic coaching decision types,
 * validation helpers, and app-side policy for choosing the intervention
 * type before generating the final coach reply.
 */

import type { CoachMemorySnapshot } from "./coach-memory.js";
import type { CoachSessionSummary } from "./coaching-prompt.js";
import type { SessionStepDrafts } from "../core/sessions.js";

export const COACH_ACTIONS = [
  "probe_understanding",
  "give_hint",
  "correct_mistake",
  "ask_for_specificity",
  "encourage_artifact_work",
  "redirect_focus",
  "reflect_back",
  "answer_direct_question",
] as const;

export type CoachAction = (typeof COACH_ACTIONS)[number];

export interface CoachDecision {
  action: CoachAction;
  rationale: string;
  targetStepId: string | null;
}

export interface AssessTurnInput {
  userMessage: string;
  currentStepId: string;
  currentStep: {
    id: string;
    label: string;
    instruction: string;
    agent_prompt: string;
    editor: "text" | "code" | "readonly";
    layout: "inline" | "full";
  };
  stepDrafts: SessionStepDrafts;
  coachMemory: CoachMemorySnapshot;
  sessionSummary: CoachSessionSummary | null;
}

const coachActionSet = new Set<string>(COACH_ACTIONS);

export function isValidCoachAction(value: unknown): value is CoachAction {
  return typeof value === "string" && coachActionSet.has(value);
}

export function assertValidCoachAction(value: unknown): asserts value is CoachAction {
  if (!isValidCoachAction(value)) {
    throw new Error(`Unsupported coach action: ${String(value)}`);
  }
}

// ---------------------------------------------------------------------------
// Heuristic helpers
// ---------------------------------------------------------------------------

const QUESTION_PATTERN = /\?\s*$/;
const QUESTION_STARTERS = /^(what|how|why|when|where|is|are|can|could|do|does|should|would|will|did)\b/i;

function looksLikeDirectQuestion(msg: string): boolean {
  const trimmed = msg.trim();
  if (QUESTION_PATTERN.test(trimmed)) return true;
  if (QUESTION_STARTERS.test(trimmed)) return true;
  return false;
}

function isVagueOrShort(msg: string): boolean {
  const trimmed = msg.trim();
  return trimmed.length < 15;
}

function hasRecurringMistakes(memory: CoachMemorySnapshot): boolean {
  return memory.coachingPatterns.recurringNotableMistakes.length > 0;
}

function looksStuck(memory: CoachMemorySnapshot, summary: CoachSessionSummary | null): boolean {
  if (memory.coachingPatterns.stuckRate > 0.5) return true;
  if (memory.coachingPatterns.latestUnderstanding === "confused") return true;
  if (summary && summary.openWeakpoints.length > 0 && summary.turnCount >= 3) return true;
  return false;
}

function stepExpectsArtifact(step: AssessTurnInput["currentStep"]): boolean {
  return step.editor === "code";
}

function hasDraftForStep(stepId: string, drafts: SessionStepDrafts): boolean {
  const draft = drafts[stepId];
  return draft != null && draft.content.trim().length > 0;
}

// ---------------------------------------------------------------------------
// assessTurn — deterministic app-side policy
// ---------------------------------------------------------------------------

export function assessTurn(input: AssessTurnInput): CoachDecision {
  const { userMessage, currentStepId, currentStep, stepDrafts, coachMemory, sessionSummary } = input;

  if (!currentStepId || currentStepId.trim().length === 0) {
    throw new Error(`Invalid coaching step: ${JSON.stringify(currentStepId)}`);
  }

  // 1. Direct question → answer it
  if (looksLikeDirectQuestion(userMessage)) {
    return {
      action: "answer_direct_question",
      rationale: "user asked a direct question",
      targetStepId: currentStepId,
    };
  }

  // 2. Very short / vague → ask for specificity
  if (isVagueOrShort(userMessage)) {
    return {
      action: "ask_for_specificity",
      rationale: "user response is too brief to assess understanding",
      targetStepId: currentStepId,
    };
  }

  // 3. Repeated notable mistakes → correct them
  if (hasRecurringMistakes(coachMemory)) {
    return {
      action: "correct_mistake",
      rationale: "recurring mistakes detected in coaching history",
      targetStepId: currentStepId,
    };
  }

  // 4. Stuck / confused → give a hint
  if (looksStuck(coachMemory, sessionSummary)) {
    return {
      action: "give_hint",
      rationale: "user appears stuck based on coaching history and session signals",
      targetStepId: currentStepId,
    };
  }

  // 5. Artifact step with no draft yet → encourage artifact work
  if (stepExpectsArtifact(currentStep) && !hasDraftForStep(currentStepId, stepDrafts)) {
    return {
      action: "encourage_artifact_work",
      rationale: "current step expects a code artifact but none has been drafted",
      targetStepId: currentStepId,
    };
  }

  // 6. Default fallback → probe understanding
  return {
    action: "probe_understanding",
    rationale: "no strong signal detected; probing to gauge understanding",
    targetStepId: currentStepId,
  };
}
