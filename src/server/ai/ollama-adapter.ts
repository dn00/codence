/**
 * Native Ollama adapter for Codence LLM services.
 *
 * Talks to Ollama's native /api/chat endpoint (not the OpenAI-compat shim).
 * The native API exposes model discovery, structured outputs, and richer
 * options than the compat mode — later phases will lean on those.
 *
 * Env:
 *   CODENCE_OLLAMA_URL       base URL (e.g. http://localhost:11434)
 *   CODENCE_OLLAMA_MODEL     model name (e.g. llama3.2, qwen2.5-coder)
 *   CODENCE_OLLAMA_API_KEY   optional bearer for proxied instances
 */

import {
  AdapterError,
  flattenSystemPrompt,
  parseMetadataFromResponse,
  type CoachingTurnResult,
  type CompleteOptions,
  type LLMAdapter,
} from "./llm-adapter.js";

export interface OllamaAdapterOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
}

interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

interface OllamaChatContext {
  baseUrl: string;
  model: string;
  apiKey: string | undefined;
  timeoutMs: number;
}

async function ollamaChat(
  ctx: OllamaChatContext,
  messages: OllamaChatMessage[],
  options: CompleteOptions = {},
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ctx.apiKey) {
    headers["Authorization"] = `Bearer ${ctx.apiKey}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ctx.timeoutMs);

  const body: Record<string, unknown> = {
    model: ctx.model,
    messages,
    stream: false,
  };
  if (options.jsonMode) {
    body.format = "json";
  }

  let response: Response;
  try {
    response = await fetch(`${ctx.baseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new AdapterError(
      "ollama",
      "transport",
      error instanceof Error ? error.message : "fetch failed",
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new AdapterError(
      "ollama",
      "http",
      `Ollama request failed: ${errorText}`,
      response.status,
    );
  }

  const data = (await response.json()) as OllamaChatResponse;
  const content = data.message?.content;
  if (typeof content !== "string") {
    throw new AdapterError("ollama", "shape", "response missing message.content");
  }
  return content;
}

export function createOllamaAdapter(options: OllamaAdapterOptions): LLMAdapter {
  const ctx: OllamaChatContext = {
    baseUrl: options.baseUrl.replace(/\/+$/, ""),
    model: options.model,
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs ?? 180_000,
  };

  return {
    async coachingTurn(input): Promise<CoachingTurnResult> {
      const messages: OllamaChatMessage[] = [
        { role: "system", content: flattenSystemPrompt(input.systemPrompt) },
        ...input.priorHistory,
        { role: "user", content: input.userMessage },
      ];

      const text = await ollamaChat(ctx, messages);
      return parseMetadataFromResponse(text);
    },

    async complete(systemPrompt, userPrompt, options): Promise<string> {
      return ollamaChat(ctx, [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ], options);
    },

    async releaseSession(): Promise<void> {
      // Adapter is stateless; caller owns conversation history.
    },
  };
}
