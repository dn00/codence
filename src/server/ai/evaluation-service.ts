import type { EvaluationService } from "../runtime-services.js";
import type { AttemptContext, LLMEvaluation, StructuredEvaluation } from "../core/types.js";

function hasMeaningfulContent(content: string | undefined): boolean {
  return (content ?? "").trim().length > 0;
}

export function derivePerStepQuality(
  context: Pick<AttemptContext, "protocolSteps" | "stepDrafts">,
): StructuredEvaluation["per_step_quality"] {
  const stepIds = context.protocolSteps.map((step) => step.id);
  return Object.fromEntries(
    stepIds.map((stepId) => [
      stepId,
      hasMeaningfulContent(context.stepDrafts[stepId]?.content) ? "solid" : "missing",
    ]),
  ) as StructuredEvaluation["per_step_quality"];
}

export function toStructuredEvaluation(
  evaluation: LLMEvaluation,
  provenance: {
    evaluationSource: "llm" | "stub";
    retryRecovered: boolean;
    stubReason?: string;
  },
): StructuredEvaluation {
  return {
    outcome: evaluation.outcome,
    diagnosis: evaluation.diagnosis,
    severity: evaluation.severity,
    approach_correct: evaluation.approach_correct,
    per_step_quality: evaluation.per_step_quality,
    mistakes: evaluation.mistakes,
    strengths: evaluation.strengths,
    coaching_summary: evaluation.coaching_summary,
    evaluation_source: provenance.evaluationSource,
    retry_recovered: provenance.retryRecovered,
    ...(provenance.stubReason ? { stub_reason: provenance.stubReason } : {}),
  };
}

export function evaluateAttemptStub(
  context: AttemptContext,
  options: {
    retryRecovered?: boolean;
    stubReason?: string;
  } = {},
): StructuredEvaluation {
  const stepIds = context.protocolSteps.map((step) => step.id);
  const completedStepIds = stepIds.filter((stepId) =>
    hasMeaningfulContent(context.stepDrafts[stepId]?.content),
  );
  const completedCount = completedStepIds.length;
  const totalSteps = stepIds.length;

  let outcome: LLMEvaluation["outcome"];
  let severity: LLMEvaluation["severity"];
  let approachCorrect: boolean;
  let diagnosis: string;
  const strictInterviewMode =
    context.evaluationStrictness === "interview_honest"
    || context.evaluationStrictness === "exam_honest";

  if (completedCount === 0) {
    outcome = "failed";
    severity = "critical";
    approachCorrect = false;
    diagnosis = "No meaningful work was submitted.";
  } else if (strictInterviewMode && completedCount < totalSteps) {
    outcome = "failed";
    severity = "critical";
    approachCorrect = false;
    diagnosis = "Interview-honest evaluation requires saved work for every protocol step.";
  } else if (completedCount === totalSteps) {
    outcome = "clean";
    severity = "minor";
    approachCorrect = true;
    diagnosis = "Completed all protocol steps.";
  } else {
    outcome = "assisted";
    severity = "moderate";
    approachCorrect = false;
    diagnosis = "Only part of the solve protocol was completed.";
  }

  const perStepQuality = derivePerStepQuality(context);

  const missingSteps = stepIds.filter((stepId) => perStepQuality[stepId] === "missing");
  const strengths =
    completedStepIds.length > 0
      ? [`Completed ${completedStepIds.length} of ${totalSteps} protocol steps.`]
      : ["Session was created successfully."];
  const mistakes = missingSteps.map((stepId) => ({
    type: "missing-step",
    description: `No saved work for step "${stepId}".`,
    step: stepId,
  }));

  const llmEvaluation: LLMEvaluation = {
    outcome,
    diagnosis,
    severity,
    approach_correct: approachCorrect,
    per_step_quality: perStepQuality,
    mistakes,
    strengths,
    coaching_summary:
      outcome === "clean"
        ? "You completed every protocol step with saved work, so this counts as an independent solve."
        : outcome === "assisted"
          ? "You saved partial work, but some protocol steps are still missing and need follow-through."
          : "No meaningful work was saved before completion, so this attempt is recorded as failed.",
  };

  return toStructuredEvaluation(llmEvaluation, {
    evaluationSource: "stub",
    retryRecovered: options.retryRecovered ?? false,
    stubReason: options.stubReason,
  });
}

export function createStubEvaluationService(): EvaluationService {
  return {
    evaluateAttempt(input) {
      return evaluateAttemptStub(input);
    },
  };
}
