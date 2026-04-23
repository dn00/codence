import type { CoachingMetadata } from "../core/types.js";
import type {
  CoachingTurnResult,
  HistoryMessage,
  LLMAdapter,
  SystemPrompt,
} from "./llm-adapter.js";

export type CoachRuntimeBackend =
  | "claude-code"
  | "openai-compat"
  | "ollama"
  | "anthropic"
  | "session-pool"
  | "stub";

export interface CoachRuntimeTurnInput {
  appSessionId: string;
  systemPrompt: SystemPrompt;
  userMessage: string;
  isFirstTurn: boolean;
  existingRuntimeSessionId: string | null;
  priorHistory: readonly HistoryMessage[];
}

export interface CoachRuntimeTurnResult {
  text: string;
  metadata: CoachingMetadata | null;
  runtimeSessionId: string;
  backend: CoachRuntimeBackend;
}

export interface CoachRuntime {
  sendTurn(input: CoachRuntimeTurnInput): Promise<CoachRuntimeTurnResult>;
  releaseSession(input: {
    appSessionId: string;
    runtimeSessionId: string | null;
  }): Promise<void>;
}

export class CoachRuntimeUnavailableError extends Error {
  constructor(message = "Coach runtime is not configured") {
    super(message);
    this.name = "CoachRuntimeUnavailableError";
  }
}

export function createStubCoachRuntime(
  responses: CoachRuntimeTurnResult[] = [],
): CoachRuntime {
  let callIndex = 0;
  const defaultResponse: CoachRuntimeTurnResult = {
    text: "I'm a coaching stub. Try working through the problem step by step.",
    metadata: {
      help_level: 0.1,
      information_revealed: [],
      user_appears_stuck: false,
      user_understanding: "partial",
      notable_mistake: null,
      gave_full_solution: false,
    },
    runtimeSessionId: "stub-runtime-session",
    backend: "stub",
  };

  return {
    async sendTurn(input) {
      const response = callIndex < responses.length
        ? responses[callIndex]
        : {
          ...defaultResponse,
          runtimeSessionId: input.existingRuntimeSessionId ?? input.appSessionId,
        };
      callIndex += 1;
      return response;
    },
    async releaseSession() {},
  };
}

export function createUnconfiguredCoachRuntime(): CoachRuntime {
  return {
    async sendTurn() {
      throw new CoachRuntimeUnavailableError();
    },
    async releaseSession() {},
  };
}

export function createCoachRuntimeFromLLMAdapter(
  adapter: LLMAdapter,
  backend: CoachRuntimeBackend,
): CoachRuntime {
  return {
    async sendTurn(input): Promise<CoachRuntimeTurnResult> {
      const result: CoachingTurnResult = await adapter.coachingTurn({
        sessionKey: input.appSessionId,
        systemPrompt: input.systemPrompt,
        userMessage: input.userMessage,
        isFirstTurn: input.isFirstTurn,
        priorHistory: input.priorHistory,
      });

      return {
        text: result.text,
        metadata: result.metadata,
        runtimeSessionId: input.existingRuntimeSessionId ?? input.appSessionId,
        backend,
      };
    },
    async releaseSession(input) {
      await adapter.releaseSession(input.appSessionId);
    },
  };
}
