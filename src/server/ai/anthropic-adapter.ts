import Anthropic from "@anthropic-ai/sdk";
import {
  AdapterError,
  parseMetadataFromResponse,
  type LLMAdapter,
  type CoachingTurnResult,
  type SystemPrompt,
} from "./llm-adapter.js";

export interface AnthropicAdapterOptions {
  apiKey: string;
  model?: string;
}

type AnthropicSystemParam = Parameters<
  Anthropic["messages"]["create"]
>[0]["system"];

function toAnthropicSystem(prompt: SystemPrompt): AnthropicSystemParam {
  if (typeof prompt === "string") return prompt;
  return prompt.map((block) => ({
    type: "text" as const,
    text: block.text,
    ...(block.cacheable ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));
}

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

export function createAnthropicDirectAdapter(options: AnthropicAdapterOptions): LLMAdapter {
  const client = new Anthropic({ apiKey: options.apiKey });
  const model = options.model ?? DEFAULT_ANTHROPIC_MODEL;

  return {
    async coachingTurn(input): Promise<CoachingTurnResult> {
      const response = await client.messages.create({
        model,
        max_tokens: 2048,
        system: toAnthropicSystem(input.systemPrompt),
        messages: [
          ...input.priorHistory,
          { role: "user", content: input.userMessage },
        ],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      return parseMetadataFromResponse(text);
    },

    async complete(systemPrompt, userPrompt, _options): Promise<string> {
      // Messages API has no native JSON mode; we rely on the caller's
      // prompt to ask for JSON. `_options.jsonMode` is accepted for
      // interface symmetry but has no direct wire effect here.
      let response: Anthropic.Message;
      try {
        response = await client.messages.create({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
      } catch (error) {
        const status = error instanceof Anthropic.APIError ? error.status : undefined;
        throw new AdapterError(
          "anthropic",
          status !== undefined ? "http" : "transport",
          error instanceof Error ? error.message : "Anthropic request failed",
          status,
        );
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
      if (!text) {
        throw new AdapterError("anthropic", "shape", "response contained no text blocks");
      }
      return text;
    },

    async releaseSession(): Promise<void> {
      // Adapter is stateless; the caller owns conversation history.
    },
  };
}
