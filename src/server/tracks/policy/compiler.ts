import { createHash } from "node:crypto";
import { AdapterError, type CompletionLLM } from "../../ai/llm-adapter.js";
import type {
  PolicyDomainId,
  PolicyExplanation,
  PolicyRepairNote,
  TrackPolicy,
} from "./types.js";
import { buildSystemPrompt, buildUserPrompt, type PolicyPromptTurn } from "./prompt.js";
import { validatePolicy } from "./validator.js";
import { lowerPolicy, probeUnsupported } from "./lower.js";
import type { TrackProgramV2, TrackSpecV2 } from "../types.js";
import { POLICY_COMPILER_VERSION } from "./compiler-version.js";
import type { TrackBenchmarkDomainFixtureV4 } from "../v4/benchmark-fixtures.js";

export interface PolicyCompileInput {
  goal: string;
  name?: string;
  skillIds?: string[];
  domainId: PolicyDomainId;
  /**
   * When set, overrides the benchmark-fixture catalog for the prompt,
   * validator, and lowering. Pass the runtime-derived catalog built
   * from the live DB so the LLM sees the taxonomy that actually
   * resolves at queue-filter time.
   */
  domainCatalog?: TrackBenchmarkDomainFixtureV4;
  priorTurns?: PolicyPromptTurn[];
  trackId: string;
  userId: string;
  learnspaceId: string;
  now: () => Date;
}

export interface PolicyCompiledPreview {
  spec: TrackSpecV2;
  program: TrackProgramV2;
}

export type PolicyCompileResult =
  | {
      outcome: "compiled";
      policy: TrackPolicy;
      preview: PolicyCompiledPreview;
      explanation: PolicyExplanation;
      displayName?: string;
      compilerVersion: string;
    }
  | {
      outcome: "repaired";
      policy: TrackPolicy;
      preview: PolicyCompiledPreview;
      explanation: PolicyExplanation;
      displayName?: string;
      compilerVersion: string;
    }
  | {
      outcome: "clarify";
      question: string;
      compilerVersion: string;
    }
  | {
      outcome: "reject";
      reason: string;
      unsupportedFields?: string[];
      compilerVersion: string;
    };

export class PolicyCompilerError extends Error {
  readonly stage: "llm" | "json" | "shape";
  readonly rawResponse?: string;
  constructor(stage: "llm" | "json" | "shape", message: string, rawResponse?: string) {
    super(message);
    this.stage = stage;
    this.rawResponse = rawResponse;
    this.name = "PolicyCompilerError";
  }
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------
function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function sanitizeDisplayName(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^["']|["']$/g, "").trim();
  if (!trimmed) return null;
  return trimmed.length > 80 ? trimmed.slice(0, 80).trim() : trimmed;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.every((entry) => typeof entry === "string") ? value as string[] : null;
}

function asPolicy(value: unknown): TrackPolicy | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as TrackPolicy;
}

function asRepairNotes(value: unknown): PolicyRepairNote[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const notes: PolicyRepairNote[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const field = asString(record.field);
    const change = asString(record.change);
    const reason = asString(record.reason);
    if (field && change && reason) notes.push({ field, change, reason });
  }
  return notes.length > 0 ? notes : undefined;
}

// ---------------------------------------------------------------------------
// Idempotency cache
// ---------------------------------------------------------------------------
export interface PolicyCompilerCache {
  get(key: string): PolicyCompileResult | undefined;
  set(key: string, value: PolicyCompileResult): void;
}

interface CacheEntry {
  value: PolicyCompileResult;
  expiresAt: number;
}

export function createLruPolicyCache(maxEntries = 32, ttlMs = 10 * 60 * 1000): PolicyCompilerCache {
  const entries = new Map<string, CacheEntry>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt < Date.now()) {
        entries.delete(key);
        return undefined;
      }
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      if (entries.has(key)) entries.delete(key);
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      while (entries.size > maxEntries) {
        const oldestKey = entries.keys().next().value;
        if (!oldestKey) break;
        entries.delete(oldestKey);
      }
    },
  };
}

function cacheKey(input: PolicyCompileInput): string {
  const hash = createHash("sha256");
  hash.update(input.domainId);
  hash.update("\u241E");
  hash.update(input.goal);
  hash.update("\u241E");
  for (const skillId of [...(input.skillIds ?? [])].sort()) {
    hash.update(skillId);
    hash.update("\u241F");
  }
  hash.update("\u241E");
  for (const turn of input.priorTurns ?? []) {
    hash.update(turn.role);
    hash.update(":");
    hash.update(turn.content);
    hash.update("\u241F");
  }
  return hash.digest("hex");
}

// ---------------------------------------------------------------------------
// Compiler
// ---------------------------------------------------------------------------
export interface CreatePolicyCompilerOptions {
  completionLLM: CompletionLLM;
  cache?: PolicyCompilerCache;
  maxJsonRetries?: number;
}

export interface PolicyCompiler {
  compile(input: PolicyCompileInput): Promise<PolicyCompileResult>;
}

export function createPolicyCompiler(options: CreatePolicyCompilerOptions): PolicyCompiler {
  const { completionLLM } = options;
  const cache = options.cache;
  const maxJsonRetries = options.maxJsonRetries ?? 1;

  async function callLLM(
    input: PolicyCompileInput,
    lastJsonError: string | null,
  ): Promise<Record<string, unknown>> {
    let raw: string;
    try {
      raw = await completionLLM.complete(
        buildSystemPrompt(),
        buildUserPrompt({ ...input, lastJsonError, domainCatalog: input.domainCatalog }),
        { jsonMode: true },
      );
    } catch (error) {
      const message = error instanceof AdapterError
        ? `${error.backend}/${error.stage}${error.status !== undefined ? ` ${error.status}` : ""}: ${error.message}`
        : error instanceof Error ? error.message : "LLM call failed";
      throw new PolicyCompilerError("llm", message);
    }
    const parsed = extractJsonObject(raw);
    if (!parsed) {
      throw new PolicyCompilerError("json", "Response did not contain a single JSON object.", raw);
    }
    return parsed;
  }

  async function callWithRetry(input: PolicyCompileInput): Promise<Record<string, unknown>> {
    let lastError: string | null = null;
    for (let attempt = 0; attempt <= maxJsonRetries; attempt += 1) {
      try {
        return await callLLM(input, lastError);
      } catch (error) {
        if (error instanceof PolicyCompilerError && error.stage === "json" && attempt < maxJsonRetries) {
          lastError = error.message;
          continue;
        }
        throw error;
      }
    }
    throw new PolicyCompilerError("json", "exhausted JSON retries", undefined);
  }

  async function compile(input: PolicyCompileInput): Promise<PolicyCompileResult> {
    const key = cache ? cacheKey(input) : null;
    if (cache && key) {
      const hit = cache.get(key);
      if (hit) return hit;
    }

    const parsed = await callWithRetry(input);
    const outcome = asString(parsed.outcome);

    let result: PolicyCompileResult;

    if (outcome === "clarify") {
      const question = asString(parsed.question);
      if (!question) {
        throw new PolicyCompilerError("shape", "clarify outcome missing \"question\" field");
      }
      result = { outcome: "clarify", question, compilerVersion: POLICY_COMPILER_VERSION };
    } else if (outcome === "reject") {
      const reason = asString(parsed.reason) ?? "Policy was rejected.";
      const unsupportedFields = asStringArray(parsed.unsupportedFields) ?? undefined;
      result = {
        outcome: "reject",
        reason,
        unsupportedFields,
        compilerVersion: POLICY_COMPILER_VERSION,
      };
    } else if (outcome === "compiled" || outcome === "repaired") {
      const policyCandidate = asPolicy(parsed.policy);
      if (!policyCandidate) {
        throw new PolicyCompilerError(
          "shape",
          `${outcome} outcome missing valid \"policy\" object`,
        );
      }

      const validation = validatePolicy(policyCandidate, input.domainId, input.domainCatalog);
      if (!validation.valid) {
        result = {
          outcome: "reject",
          reason: `Policy failed validation: ${validation.errors.join("; ")}`,
          compilerVersion: POLICY_COMPILER_VERSION,
        };
      } else {
        const unsupported = probeUnsupported(validation.normalized);
        if (unsupported.length > 0) {
          result = {
            outcome: "reject",
            reason: `Policy uses unsupported fields: ${unsupported.join(", ")}.`,
            unsupportedFields: unsupported,
            compilerVersion: POLICY_COMPILER_VERSION,
          };
        } else {
          const llmDisplayName = sanitizeDisplayName(asString(parsed.displayName));
          const resolvedName = input.name ?? llmDisplayName ?? input.goal.slice(0, 80);
          const lowered = lowerPolicy({
            policy: validation.normalized,
            trackId: input.trackId,
            userId: input.userId,
            learnspaceId: input.learnspaceId,
            name: resolvedName,
            goal: input.goal,
            now: input.now,
          });
          if (!lowered.ok) {
            result = {
              outcome: "reject",
              reason: lowered.reason,
              unsupportedFields: lowered.unsupportedFields,
              compilerVersion: POLICY_COMPILER_VERSION,
            };
          } else {
            const explanation: PolicyExplanation = { ...lowered.explanation };
            if (outcome === "repaired") {
              const repairs = asRepairNotes((parsed.explanation as Record<string, unknown> | undefined)?.repairs);
              if (repairs) explanation.repairs = repairs;
            }
            result = {
              outcome,
              policy: validation.normalized,
              preview: { spec: lowered.spec, program: lowered.program },
              explanation,
              ...(llmDisplayName ? { displayName: llmDisplayName } : {}),
              compilerVersion: POLICY_COMPILER_VERSION,
            };
          }
        }
      }
    } else {
      throw new PolicyCompilerError("shape", `unknown outcome: ${outcome ?? "null"}`);
    }

    if (cache && key) cache.set(key, result);
    return result;
  }

  return { compile };
}
