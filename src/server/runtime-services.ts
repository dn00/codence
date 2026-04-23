import { createStubEvaluationService } from "./ai/evaluation-service.js";
import { createLLMEvaluationService } from "./ai/evaluation-prompt.js";
import {
  type ExecutionAdapter,
} from "./execution/executor.js";
import { createSubprocessExecutor } from "./execution/subprocess-executor.js";
import {
  createUnconfiguredCompletionLLM,
  type CompletionLLM,
} from "./ai/llm-adapter.js";
import {
  createCoachRuntimeFromLLMAdapter,
  createUnconfiguredCoachRuntime,
  type CoachRuntime,
} from "./ai/coach-runtime.js";
import {
  resolveBackends,
  type ResolvedBackends,
} from "./ai/providers/registry.js";
import type {
  AttemptContext,
  StructuredEvaluation,
} from "./core/types.js";

export interface EvaluationService {
  evaluateAttempt(input: AttemptContext): StructuredEvaluation | Promise<StructuredEvaluation>;
}

export interface AppServices {
  evaluationService: EvaluationService;
  executionAdapter: ExecutionAdapter;
  completionLLM: CompletionLLM;
  coachRuntime: CoachRuntime;
  coachConfigured: boolean;
  completionConfigured: boolean;
  coachBackend: string | null;
  completionBackend: string | null;
}

export function resolveAppServices(overrides: Partial<AppServices> = {}): AppServices {
  const hasEvaluationServiceOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    "evaluationService",
  );
  const hasExecutionAdapterOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    "executionAdapter",
  );
  const hasCompletionLLMOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    "completionLLM",
  );
  const hasCoachRuntimeOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    "coachRuntime",
  );

  const shouldResolveFromEnv = !hasCompletionLLMOverride || !hasCoachRuntimeOverride;
  const resolved: ResolvedBackends = shouldResolveFromEnv
    ? resolveBackends(process.env)
    : { coach: null, completion: null };

  const completionLLM = hasCompletionLLMOverride
    ? overrides.completionLLM!
    : (resolved.completion?.adapter ?? createUnconfiguredCompletionLLM());

  const coachRuntime = hasCoachRuntimeOverride
    ? overrides.coachRuntime!
    : buildCoachRuntimeFromHandle(resolved.coach);

  const completionConfigured = hasCompletionLLMOverride || resolved.completion !== null;
  const coachConfigured = hasCoachRuntimeOverride || resolved.coach !== null;

  const evaluationService = hasEvaluationServiceOverride
    ? overrides.evaluationService
    : resolveEvaluationService(completionLLM, completionConfigured);
  const executionAdapter = hasExecutionAdapterOverride
    ? overrides.executionAdapter
    : createSubprocessExecutor({ timeoutMs: 5000 });

  if (!evaluationService) {
    throw new Error("Codence evaluation service is not configured");
  }

  if (!executionAdapter) {
    throw new Error("Codence execution adapter is not configured");
  }

  return {
    evaluationService,
    executionAdapter,
    completionLLM,
    coachRuntime,
    coachConfigured,
    completionConfigured,
    coachBackend: hasCoachRuntimeOverride
      ? (overrides.coachBackend ?? "override")
      : (resolved.coach?.id ?? null),
    completionBackend: hasCompletionLLMOverride
      ? (overrides.completionBackend ?? "override")
      : (resolved.completion?.id ?? null),
  };
}

function buildCoachRuntimeFromHandle(
  handle: ResolvedBackends["coach"],
): CoachRuntime {
  if (!handle) {
    return createUnconfiguredCoachRuntime();
  }
  if (handle.kind === "coach-runtime") {
    return handle.coachRuntime;
  }
  return createCoachRuntimeFromLLMAdapter(handle.adapter, handle.coachBackendLabel);
}

function resolveEvaluationService(
  completionLLM: CompletionLLM,
  hasConfiguredCompletionBackend: boolean,
): EvaluationService {
  if (hasConfiguredCompletionBackend) {
    return createLLMEvaluationService(completionLLM);
  }
  return createStubEvaluationService();
}
