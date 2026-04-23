import { createAnthropicDirectAdapter } from "../anthropic-adapter.js";
import { createClaudeCodeRuntime } from "../claude-code-runtime.js";
import { createOllamaAdapter } from "../ollama-adapter.js";
import { createOpenAICompatAdapter } from "../openai-compat-adapter.js";
import { createSessionPoolAdapter } from "../session-pool-adapter.js";
import type {
  EnvVarHint,
  LLMProvider,
  ProviderCapabilities,
  ProviderHandle,
  ProviderId,
  ProviderKind,
} from "./types.js";
import { capabilitiesFor } from "./types.js";

const claudeCodeCliProvider: LLMProvider = {
  id: "claude-code",
  label: "Claude Code CLI",
  kind: "coach-runtime",
  envVars: [
    { name: "CODENCE_CLAUDE_CLI_CMD", required: true, purpose: "claude CLI path" },
  ],
  isConfigured(env) {
    return Boolean(env.CODENCE_CLAUDE_CLI_CMD);
  },
  build(env): ProviderHandle {
    return {
      kind: "coach-runtime",
      id: "claude-code",
      label: "Claude Code CLI",
      coachRuntime: createClaudeCodeRuntime({
        cliCommand: env.CODENCE_CLAUDE_CLI_CMD,
      }),
    };
  },
};

const openAICompatProvider: LLMProvider = {
  id: "openai-compat",
  label: "OpenAI-compatible endpoint",
  kind: "llm-adapter",
  envVars: [
    { name: "CODENCE_OPENAI_COMPAT_URL", required: true, purpose: "base URL" },
    { name: "CODENCE_OPENAI_API_KEY", required: false, purpose: "bearer token" },
    { name: "CODENCE_OPENAI_MODEL", required: false, purpose: "model override" },
  ],
  isConfigured(env) {
    return Boolean(env.CODENCE_OPENAI_COMPAT_URL);
  },
  build(env): ProviderHandle {
    const baseUrl = env.CODENCE_OPENAI_COMPAT_URL;
    if (!baseUrl) {
      throw new Error("openai-compat provider built without CODENCE_OPENAI_COMPAT_URL");
    }
    return {
      kind: "llm-adapter",
      id: "openai-compat",
      label: "OpenAI-compatible endpoint",
      coachBackendLabel: "openai-compat",
      adapter: createOpenAICompatAdapter({
        baseUrl,
        apiKey: env.CODENCE_OPENAI_API_KEY,
        model: env.CODENCE_OPENAI_MODEL,
      }),
    };
  },
};

const ollamaProvider: LLMProvider = {
  id: "ollama",
  label: "Ollama (local)",
  kind: "llm-adapter",
  envVars: [
    { name: "CODENCE_OLLAMA_URL", required: true, purpose: "base URL (e.g. http://localhost:11434)" },
    { name: "CODENCE_OLLAMA_MODEL", required: true, purpose: "model name (e.g. llama3.2)" },
    { name: "CODENCE_OLLAMA_API_KEY", required: false, purpose: "bearer token for proxied instances" },
  ],
  isConfigured(env) {
    return Boolean(env.CODENCE_OLLAMA_URL && env.CODENCE_OLLAMA_MODEL);
  },
  build(env): ProviderHandle {
    const baseUrl = env.CODENCE_OLLAMA_URL;
    const model = env.CODENCE_OLLAMA_MODEL;
    if (!baseUrl || !model) {
      throw new Error(
        "ollama provider built without CODENCE_OLLAMA_URL / CODENCE_OLLAMA_MODEL",
      );
    }
    return {
      kind: "llm-adapter",
      id: "ollama",
      label: "Ollama (local)",
      coachBackendLabel: "ollama",
      adapter: createOllamaAdapter({
        baseUrl,
        model,
        apiKey: env.CODENCE_OLLAMA_API_KEY,
      }),
    };
  },
};

const anthropicProvider: LLMProvider = {
  id: "anthropic",
  label: "Anthropic API",
  kind: "llm-adapter",
  envVars: [
    { name: "ANTHROPIC_API_KEY", required: true, purpose: "API key" },
    { name: "ANTHROPIC_MODEL", required: false, purpose: "model override (default: Sonnet 4.6)" },
  ],
  isConfigured(env) {
    return Boolean(env.ANTHROPIC_API_KEY);
  },
  build(env): ProviderHandle {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("anthropic provider built without ANTHROPIC_API_KEY");
    }
    return {
      kind: "llm-adapter",
      id: "anthropic",
      label: "Anthropic API",
      coachBackendLabel: "anthropic",
      adapter: createAnthropicDirectAdapter({
        apiKey,
        model: env.ANTHROPIC_MODEL,
      }),
    };
  },
};

const sessionPoolProvider: LLMProvider = {
  id: "session-pool",
  label: "Session pool (Python)",
  kind: "llm-adapter",
  envVars: [
    { name: "CODENCE_LLM_POOL_SCRIPT", required: true, purpose: "python pool script" },
  ],
  isConfigured(env) {
    return Boolean(env.CODENCE_LLM_POOL_SCRIPT);
  },
  build(env): ProviderHandle {
    const poolScript = env.CODENCE_LLM_POOL_SCRIPT;
    if (!poolScript) {
      throw new Error("session-pool provider built without CODENCE_LLM_POOL_SCRIPT");
    }
    return {
      kind: "llm-adapter",
      id: "session-pool",
      label: "Session pool (Python)",
      coachBackendLabel: "session-pool",
      adapter: createSessionPoolAdapter({ poolScript }),
    };
  },
};

// Order is priority: first match wins.
// Explicit CLI > explicit compat URL > explicit local Ollama > cloud Anthropic
// > legacy Python pool. Local-first wins over cloud when both are configured.
export const LLM_PROVIDERS: readonly LLMProvider[] = Object.freeze([
  claudeCodeCliProvider,
  openAICompatProvider,
  ollamaProvider,
  anthropicProvider,
  sessionPoolProvider,
]);

export interface ResolvedBackends {
  coach: ProviderHandle | null;
  completion: Extract<ProviderHandle, { kind: "llm-adapter" }> | null;
}

export function resolveBackends(
  env: NodeJS.ProcessEnv = process.env,
  providers: readonly LLMProvider[] = LLM_PROVIDERS,
): ResolvedBackends {
  const coachProvider = providers.find((p) => p.isConfigured(env));
  const completionProvider = providers.find(
    (p) => p.kind === "llm-adapter" && p.isConfigured(env),
  );

  const coachHandle = coachProvider ? coachProvider.build(env) : null;
  const completionRaw = completionProvider ? completionProvider.build(env) : null;
  const completionHandle =
    completionRaw && completionRaw.kind === "llm-adapter" ? completionRaw : null;

  return {
    coach: coachHandle,
    completion: completionHandle,
  };
}

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  kind: ProviderKind;
  configured: boolean;
  supports: ProviderCapabilities;
  envVars: readonly EnvVarHint[];
}

export function listProviderStatus(
  env: NodeJS.ProcessEnv = process.env,
  providers: readonly LLMProvider[] = LLM_PROVIDERS,
): ProviderStatus[] {
  return providers.map((provider) => ({
    id: provider.id,
    label: provider.label,
    kind: provider.kind,
    configured: provider.isConfigured(env),
    supports: capabilitiesFor(provider.kind),
    envVars: provider.envVars,
  }));
}
