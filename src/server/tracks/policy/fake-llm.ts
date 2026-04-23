import type { CompletionLLM } from "../../ai/llm-adapter.js";

export interface FakeLLMOptions {
  responses: ReadonlyArray<string>;
  onExhausted?: "throw" | "repeatLast";
}

export interface FakeLLM extends CompletionLLM {
  readonly calls: ReadonlyArray<{ systemPrompt: string; userPrompt: string }>;
  reset(): void;
}

export function createFakeLLM(options: FakeLLMOptions): FakeLLM {
  const responses = options.responses;
  const onExhausted = options.onExhausted ?? "throw";
  let index = 0;
  const calls: Array<{ systemPrompt: string; userPrompt: string }> = [];

  return {
    get calls() {
      return calls;
    },
    reset() {
      index = 0;
      calls.length = 0;
    },
    async complete(systemPrompt: string, userPrompt: string): Promise<string> {
      calls.push({ systemPrompt, userPrompt });
      if (index < responses.length) {
        const response = responses[index];
        index += 1;
        return response;
      }
      if (onExhausted === "repeatLast" && responses.length > 0) {
        return responses[responses.length - 1];
      }
      throw new Error("FakeLLM responses exhausted");
    },
  };
}
