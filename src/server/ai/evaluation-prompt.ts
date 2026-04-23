import type { AttemptContext, LLMEvaluation } from "../core/types.js";
import type { CompletionLLM } from "./llm-adapter.js";
import { evaluateAttemptStub, toStructuredEvaluation } from "./evaluation-service.js";

function formatProtocolOverview(input: AttemptContext): string {
  const steps = input.protocolSteps
    .map((step, index) => `${index + 1}. ${step.label} — ${step.instruction}`)
    .join("\n");
  return `Protocol steps:\n${steps}`;
}

function formatWorkSnapshot(input: AttemptContext): string {
  const entries = input.protocolSteps
    .map((step) => {
      const content = input.stepDrafts[step.id]?.content?.trim() ?? "";
      if (!content) return null;
      return `${step.label} (${step.id}) — ${step.instruction}\n${content}`;
    })
    .filter((entry): entry is string => entry !== null);
  return entries.length > 0 ? entries.join("\n\n") : "(no work submitted)";
}

function formatTestResults(input: AttemptContext): string {
  if (!input.testResults) return "No executor — no test results.";
  return `Passed: ${input.testResults.passed}, Failed: ${input.testResults.failed}, Errors: ${input.testResults.errors.length > 0 ? input.testResults.errors.join("; ") : "none"}`;
}

function formatMessages(input: AttemptContext): string {
  if (input.coachingTranscript.length === 0) return "(no coaching interactions)";
  return input.coachingTranscript
    .map((message, index) => {
      if (message.role === "user") {
        return `User (turn ${index + 1}): ${message.content}`;
      }
      const metadataParts: string[] = [];
      if (message.metadata) {
        metadataParts.push(`help_level ${message.metadata.help_level}`);
        if (message.metadata.information_revealed.length > 0) {
          metadataParts.push(`revealed: ${message.metadata.information_revealed.join(", ")}`);
        }
        metadataParts.push(`understanding: ${message.metadata.user_understanding}`);
        if (message.metadata.gave_full_solution) {
          metadataParts.push("full_solution: true");
        }
      }
      const suffix = metadataParts.length > 0 ? `, ${metadataParts.join(", ")}` : "";
      return `Coach (turn ${index + 1}${suffix}): ${message.content}`;
    })
    .join("\n");
}

function formatEvaluationStrictness(input: AttemptContext): string {
  switch (input.evaluationStrictness) {
    case "learning":
      return "Evaluation mode: learning. Reward useful progress and partial understanding. Reserve failures for absent or seriously broken work.";
    case "interview_honest":
      return "Evaluation mode: interview_honest. Grade as if this were a real interview. Missing core steps, weak communication, or incomplete execution should be treated strictly.";
    case "exam_honest":
      return "Evaluation mode: exam_honest. Grade strictly for completeness and correctness. Missing required steps should count heavily against the outcome.";
    case "communication_focused":
      return "Evaluation mode: communication_focused. Pay special attention to how clearly the user explained understanding, approach, and tradeoffs.";
    case "balanced":
    default:
      return "Evaluation mode: balanced. Be fair but not generous; distinguish partial progress from interview-ready execution.";
  }
}

function formatEvaluationSchema(input: AttemptContext): string {
  const stepIds = input.protocolSteps.map((step) => step.id).join(", ");
  return [
    "Return a JSON object with exactly these top-level fields:",
    "- outcome",
    "- diagnosis",
    "- severity",
    "- approach_correct",
    "- per_step_quality",
    "- mistakes",
    "- strengths",
    "- coaching_summary",
    `per_step_quality must contain every protocol step id exactly once: ${stepIds}.`,
    'Each per_step_quality value must be one of: "missing", "partial", "solid", "strong".',
  ].join("\n");
}

export function assembleEvaluationPrompt(input: AttemptContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const reference = input.referenceSolution ?? "(no reference solution)";
  const skillNames = [
    input.primarySkill.name,
    ...input.secondarySkills.map((skill) => skill.name),
  ];
  const template = input.evaluationPromptTemplate;

  const filled = template
    .replace(/\{item_title\}/g, input.itemTitle)
    .replace(/\{skill_names\}/g, skillNames.join(", "))
    .replace(/\{work_snapshot\}/g, formatWorkSnapshot(input))
    .replace(/\{test_results\}/g, formatTestResults(input))
    .replace(/\{messages\}/g, formatMessages(input))
    .replace(/\{reference\}/g, reference);

  const systemPrompt = [
    "You are evaluating a practice attempt. Return ONLY a valid JSON object matching the required schema.",
    "Do not include any text before or after the JSON.",
    formatProtocolOverview(input),
    formatEvaluationStrictness(input),
    formatEvaluationSchema(input),
  ].join("\n");

  return { systemPrompt, userPrompt: filled };
}

const VALID_OUTCOMES = new Set(["clean", "assisted", "failed"]);
const VALID_SEVERITIES = new Set(["minor", "moderate", "critical"]);
const VALID_STEP_QUALITIES = new Set(["missing", "partial", "solid", "strong"]);

function isValidEvaluation(
  obj: unknown,
  protocolStepIds: string[],
): obj is LLMEvaluation {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (!VALID_OUTCOMES.has(o.outcome as string)) return false;
  if (!VALID_SEVERITIES.has(o.severity as string)) return false;
  if (typeof o.diagnosis !== "string") return false;
  if (typeof o.approach_correct !== "boolean") return false;
  if (typeof o.per_step_quality !== "object" || o.per_step_quality === null) return false;
  const perStepQuality = o.per_step_quality as Record<string, unknown>;
  if (Object.keys(perStepQuality).length !== protocolStepIds.length) return false;
  for (const stepId of protocolStepIds) {
    if (!VALID_STEP_QUALITIES.has(perStepQuality[stepId] as string)) return false;
  }
  if (!Array.isArray(o.mistakes)) return false;
  if (!Array.isArray(o.strengths)) return false;
  if (typeof o.coaching_summary !== "string") return false;
  return true;
}

function parseEvaluationJSON(raw: string, protocolStepIds: string[]): LLMEvaluation | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const parsed = tryParseEvaluationJSON(fenced[1].trim(), protocolStepIds);
    if (parsed) return parsed;
  }

  const balanced = extractBalancedJSONObject(raw);
  if (!balanced) return null;
  return tryParseEvaluationJSON(balanced, protocolStepIds);
}

function tryParseEvaluationJSON(jsonStr: string, protocolStepIds: string[]): LLMEvaluation | null {
  try {
    const parsed = JSON.parse(jsonStr);

    if (!isValidEvaluation(parsed, protocolStepIds)) return null;

    return {
      outcome: parsed.outcome,
      diagnosis: parsed.diagnosis,
      severity: parsed.severity,
      approach_correct: parsed.approach_correct,
      per_step_quality: parsed.per_step_quality,
      mistakes: parsed.mistakes,
      strengths: parsed.strengths,
      coaching_summary: parsed.coaching_summary,
    };
  } catch {
    return null;
  }
}

function extractBalancedJSONObject(raw: string): string | null {
  let inString = false;
  let escaped = false;
  let depth = 0;
  let start = -1;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (char === "}") {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return raw.slice(start, index + 1);
      }
    }
  }

  return null;
}

export function createLLMEvaluationService(completionLLM: CompletionLLM) {
  return {
    async evaluateAttempt(input: AttemptContext) {
      const prompt = assembleEvaluationPrompt(input);
      const protocolStepIds = input.protocolSteps.map((step) => step.id);

      try {
        const raw = await completionLLM.complete(prompt.systemPrompt, prompt.userPrompt, {
          jsonMode: true,
        });
        const parsed = parseEvaluationJSON(raw, protocolStepIds);
        if (parsed) {
          return toStructuredEvaluation(parsed, {
            evaluationSource: "llm",
            retryRecovered: false,
          });
        }
      } catch {
        return evaluateAttemptStub(input, {
          retryRecovered: false,
          stubReason: "LLM adapter threw before returning a valid evaluation.",
        });
      }

      try {
        const retryRaw = await completionLLM.complete(
          [
            prompt.systemPrompt,
            "Your previous response was not valid JSON. Return ONLY the JSON object, no prose, no code fences.",
          ].join("\n"),
          prompt.userPrompt,
          { jsonMode: true },
        );
        const retryParsed = parseEvaluationJSON(retryRaw, protocolStepIds);
        if (retryParsed) {
          return toStructuredEvaluation(retryParsed, {
            evaluationSource: "llm",
            retryRecovered: true,
          });
        }
        return evaluateAttemptStub(input, {
          retryRecovered: true,
          stubReason: "LLM returned invalid JSON twice.",
        });
      } catch {
        return evaluateAttemptStub(input, {
          retryRecovered: true,
          stubReason: "LLM retry attempt threw before returning valid JSON.",
        });
      }
    },
  };
}
