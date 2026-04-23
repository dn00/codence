import type { CoachingMetadata } from "../core/types.js";

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CoachingTurnResult {
  text: string;
  metadata: CoachingMetadata | null;
}

/**
 * Conversation turn as the adapter sees it. Caller-supplied on every
 * coachingTurn call — adapters must not maintain their own history state.
 */
export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Prefix-cache-aware system prompt segment. Adapters that support
 * server-side prompt caching (Anthropic) insert a cache breakpoint at
 * the end of each block with `cacheable: true`. Adapters that don't
 * care flatten the blocks into a single string and ignore the flag.
 */
export interface SystemBlock {
  text: string;
  cacheable?: boolean;
}

export type SystemPrompt = string | readonly SystemBlock[];

export function flattenSystemPrompt(prompt: SystemPrompt): string {
  if (typeof prompt === "string") return prompt;
  return prompt.map((block) => block.text).join("\n\n");
}

export interface CompleteOptions {
  /**
   * Ask the backend for a JSON-object response. Adapters that support a
   * native JSON mode (Ollama `format:"json"`, OpenAI `response_format`)
   * set it; adapters without native support (Anthropic messages API,
   * session-pool) ignore the flag and rely on the prompt.
   */
  jsonMode?: boolean;
}

export interface CompletionLLM {
  complete(systemPrompt: string, userPrompt: string, options?: CompleteOptions): Promise<string>;
}

/**
 * Uniform error surface for LLM transport failures. Lets callers
 * distinguish "LLM never responded / HTTP failed" from "response parsed
 * but was the wrong shape" without string-sniffing adapter-specific
 * error messages.
 */
export class AdapterError extends Error {
  readonly backend: string;
  readonly stage: "transport" | "http" | "shape";
  readonly status: number | undefined;
  constructor(
    backend: string,
    stage: "transport" | "http" | "shape",
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = "AdapterError";
    this.backend = backend;
    this.stage = stage;
    this.status = status;
  }
}

export interface LLMAdapter extends CompletionLLM {
  /**
   * Conversational coaching turn. Adapters are stateless with respect to
   * conversation history — the caller supplies `priorHistory` (drawn from
   * durable storage) on every turn. Adapters that resume on the backend
   * side (session-pool, claude-code-cli) may ignore priorHistory and rely
   * on `sessionKey` / runtime-specific resume mechanisms.
   */
  coachingTurn(input: {
    sessionKey: string;
    systemPrompt: SystemPrompt;
    userMessage: string;
    isFirstTurn: boolean;
    priorHistory: readonly HistoryMessage[];
  }): Promise<CoachingTurnResult>;

  /**
   * Single-turn completion (no conversation state). Used for evaluation
   * and variant generation. Pass `{ jsonMode: true }` when the caller
   * needs the response to be a JSON object — adapters with native
   * support will constrain decoding; others fall back to prompt-only.
   */
  complete(systemPrompt: string, userPrompt: string, options?: CompleteOptions): Promise<string>;

  /**
   * Release resources tied to a session (e.g., return a pool lease).
   */
  releaseSession(sessionKey: string): Promise<void>;
}

const METADATA_DELIMITER = "---METADATA---";
const DEFAULT_STUB_COMPLETION = JSON.stringify({
  outcome: "assisted",
  diagnosis: "stub evaluation",
  severity: "moderate",
  approach_correct: true,
  per_step_quality: {},
  mistakes: [],
  strengths: ["Stub adapter response"],
  coaching_summary: "Stub evaluation — no LLM configured.",
});

export function parseMetadataFromResponse(raw: string): CoachingTurnResult {
  const delimIndex = raw.lastIndexOf(METADATA_DELIMITER);
  if (delimIndex === -1) {
    return { text: raw.trim(), metadata: null };
  }

  const text = raw.slice(0, delimIndex).trim();
  const jsonStr = raw.slice(delimIndex + METADATA_DELIMITER.length).trim();

  try {
    const parsed = JSON.parse(jsonStr) as CoachingMetadata;
    return { text, metadata: parsed };
  } catch {
    // Strip the metadata block even on parse failure so it never leaks to the user
    return { text, metadata: null };
  }
}

export function createStubCompletionLLM(
  responses: string[] = [],
): CompletionLLM {
  let callIndex = 0;

  return {
    async complete(_systemPrompt, _userPrompt, _options) {
      const response = callIndex < responses.length
        ? responses[callIndex]
        : DEFAULT_STUB_COMPLETION;
      callIndex += 1;
      return response as string;
    },
  };
}

export function createUnconfiguredCompletionLLM(): CompletionLLM {
  return {
    async complete() {
      throw new AdapterError("unconfigured", "transport", "LLM provider is not configured");
    },
  };
}

export function createStubLLMAdapter(
  responses: CoachingTurnResult[] = [],
): LLMAdapter {
  let callIndex = 0;
  const completionLLM = createStubCompletionLLM();
  const defaultResponse: CoachingTurnResult = {
    text: "I'm a coaching stub. Try working through the problem step by step.",
    metadata: {
      help_level: 0.1,
      information_revealed: [],
      user_appears_stuck: false,
      user_understanding: "partial",
      notable_mistake: null,
      gave_full_solution: false,
    },
  };

  return {
    async coachingTurn() {
      const response = callIndex < responses.length
        ? responses[callIndex]
        : defaultResponse;
      callIndex += 1;
      return response;
    },
    complete: completionLLM.complete,
    async releaseSession() {},
  };
}

export function createUnconfiguredLLMAdapter(): LLMAdapter {
  const completionLLM = createUnconfiguredCompletionLLM();
  return {
    async coachingTurn() {
      throw new Error("LLM provider is not configured");
    },
    complete: completionLLM.complete,
    async releaseSession() {},
  };
}
