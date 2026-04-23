import type { CoachRuntime, CoachRuntimeBackend } from "../coach-runtime.js";
import type { LLMAdapter } from "../llm-adapter.js";

export type ProviderId =
  | "claude-code"
  | "openai-compat"
  | "ollama"
  | "anthropic"
  | "session-pool";

export type ProviderKind = "llm-adapter" | "coach-runtime";

export interface EnvVarHint {
  name: string;
  required: boolean;
  purpose?: string;
}

export interface ProviderCapabilities {
  coach: boolean;
  completion: boolean;
}

export type ProviderHandle =
  | {
      kind: "llm-adapter";
      id: ProviderId;
      label: string;
      adapter: LLMAdapter;
      coachBackendLabel: CoachRuntimeBackend;
    }
  | {
      kind: "coach-runtime";
      id: ProviderId;
      label: string;
      coachRuntime: CoachRuntime;
    };

export interface LLMProvider {
  id: ProviderId;
  label: string;
  kind: ProviderKind;
  envVars: readonly EnvVarHint[];
  isConfigured(env: NodeJS.ProcessEnv): boolean;
  build(env: NodeJS.ProcessEnv): ProviderHandle;
}

export function capabilitiesFor(kind: ProviderKind): ProviderCapabilities {
  return {
    coach: true,
    completion: kind === "llm-adapter",
  };
}
