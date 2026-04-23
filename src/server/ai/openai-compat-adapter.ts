/**
 * OpenAI-compatible HTTP adapter for Codence LLM services.
 *
 * Talks to any server exposing /v1/chat/completions with the standard
 * OpenAI request/response shape — api.openai.com, OpenRouter, Together,
 * Groq, vLLM, llama.cpp server, etc.
 *
 * Env:
 *   CODENCE_OPENAI_COMPAT_URL  base URL (e.g. http://127.0.0.1:8787 or https://api.openai.com)
 *   CODENCE_OPENAI_API_KEY     optional Bearer token for hosted endpoints
 *   CODENCE_OPENAI_MODEL       optional model name (default: "sonnet")
 */

import {
  AdapterError,
  flattenSystemPrompt,
  parseMetadataFromResponse,
  type CompleteOptions,
  type LLMAdapter,
  type CoachingTurnResult,
} from "./llm-adapter.js";

export interface OpenAICompatAdapterOptions {
  baseUrl: string;
  apiKey?: string;
  model?: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { role: string; content: string | null };
    finish_reason: string;
  }>;
}

interface ChatCompletionContext {
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
}

async function chatCompletion(
  ctx: ChatCompletionContext,
  messages: ChatMessage[],
  sessionId?: string,
  options: CompleteOptions = {},
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ctx.apiKey) {
    headers["Authorization"] = `Bearer ${ctx.apiKey}`;
  }
  if (sessionId) {
    headers["X-Session-Id"] = sessionId;
  }

  const body: Record<string, unknown> = { model: ctx.model, messages };
  if (sessionId) {
    // Wrapper extension; real OpenAI endpoints ignore unknown fields.
    body.session_id = sessionId;
  }
  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  let response: Response;
  try {
    response = await fetch(`${ctx.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new AdapterError(
      "openai-compat",
      "transport",
      error instanceof Error ? error.message : "fetch failed",
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new AdapterError(
      "openai-compat",
      "http",
      `OpenAI-compat request failed: ${errorText}`,
      response.status,
    );
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new AdapterError("openai-compat", "shape", "response missing content");
  }
  return text;
}

export function createOpenAICompatAdapter(options: OpenAICompatAdapterOptions): LLMAdapter {
  const ctx: ChatCompletionContext = {
    baseUrl: options.baseUrl.replace(/\/+$/, ""),
    apiKey: options.apiKey,
    // "sonnet" is the Claude CLI alias the wrapper passes through as --model.
    // For hosted OpenAI-compatible endpoints that require an exact model id,
    // override via CODENCE_OPENAI_MODEL.
    model: options.model ?? "sonnet",
  };

  return {
    async coachingTurn(input): Promise<CoachingTurnResult> {
      const messages: ChatMessage[] = [
        { role: "system", content: flattenSystemPrompt(input.systemPrompt) },
        ...input.priorHistory,
        { role: "user", content: input.userMessage },
      ];

      const text = await chatCompletion(ctx, messages, input.sessionKey);
      return parseMetadataFromResponse(text);
    },

    async complete(systemPrompt, userPrompt, options): Promise<string> {
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];
      return chatCompletion(ctx, messages, undefined, options);
    },

    async releaseSession(sessionKey: string): Promise<void> {
      // Best-effort: tell the wrapper to clean up its session pool entry.
      // Real OpenAI endpoints ignore unknown routes/fields.
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (ctx.apiKey) {
        headers["Authorization"] = `Bearer ${ctx.apiKey}`;
      }
      fetch(`${ctx.baseUrl}/v1/session/end`, {
        method: "POST",
        headers,
        body: JSON.stringify({ session_id: sessionKey }),
      }).catch(() => {});
    },
  };
}
