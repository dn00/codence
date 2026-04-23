import type {
  TrackBenchmarkCaseV4,
  TrackPolicyV4,
  TrackV4BenchmarkClass,
  TrackV4DomainId,
  TrackV4HandlingOutcome,
} from "../v4/benchmark-schema.js";
import { TRACK_V4_BENCHMARK_CASES } from "../v4/benchmark-fixtures.js";
import { runEndToEndTrackHandlingHarnessV4 } from "../v4/e2e-track-handling.js";
import { createFakeLLM } from "./fake-llm.js";
import { createPolicyCompiler, PolicyCompilerError, type PolicyCompileResult } from "./compiler.js";
import { probeUnsupported } from "./lower.js";
import type { PolicyDomainId } from "./types.js";
import type { CompletionLLM } from "../../ai/llm-adapter.js";

export interface PolicyCompilerBenchCaseResult {
  intentId: string;
  domainId: TrackV4DomainId;
  benchmarkClass: TrackV4BenchmarkClass;
  expectedOutcome: TrackV4HandlingOutcome;
  compilerExpectedOutcome: TrackV4HandlingOutcome;
  actualOutcome: TrackV4HandlingOutcome | "compiler_error";
  passed: boolean;
  unlowerable: boolean;
  reasons: string[];
}

export interface PolicyCompilerBenchSummary {
  total: number;
  passed: number;
  failed: number;
  handledCorrectlyRate: number;
  byDomain: Record<TrackV4DomainId, { total: number; passed: number; handledCorrectlyRate: number }>;
  byClass: Record<TrackV4BenchmarkClass, { total: number; passed: number; handledCorrectlyRate: number }>;
  results: PolicyCompilerBenchCaseResult[];
}

// ---------------------------------------------------------------------------
// Synthesize the response a competent LLM would produce for each case.
// This is what makes the bench deterministic in CI: we test the compiler
// chain (parse → validate → dry-lower → outcome) on inputs that mirror what
// a real LLM should emit.
// ---------------------------------------------------------------------------
export function synthesizeCompilerResponse(benchmarkCase: TrackBenchmarkCaseV4): string {
  const { expectedOutcome, goldPolicy, unsupportedReason, intentId } = benchmarkCase;

  if (expectedOutcome === "compiled" && goldPolicy) {
    return JSON.stringify({ outcome: "compiled", policy: goldPolicy });
  }
  if (expectedOutcome === "repaired" && goldPolicy) {
    return JSON.stringify({
      outcome: "repaired",
      policy: goldPolicy,
      explanation: {
        repairs: [{
          field: "policy",
          change: "normalized",
          reason: "Benchmark case expected a repaired policy.",
        }],
      },
    });
  }
  if (expectedOutcome === "clarify") {
    return JSON.stringify({
      outcome: "clarify",
      question: `Need more detail to interpret intent ${intentId}.`,
    });
  }
  // reject — may or may not have goldPolicy; rely on expected outcome only
  return JSON.stringify({
    outcome: "reject",
    reason: unsupportedReason ?? `Intent ${intentId} is not expressible in the supported policy surface.`,
  });
}

function rate(passed: number, total: number): number {
  if (total === 0) return 0;
  return Number(((passed / total) * 100).toFixed(2));
}

function outcomeFromResult(
  result: PolicyCompileResult | { outcome: "compiler_error" },
): TrackV4HandlingOutcome | "compiler_error" {
  return result.outcome;
}

function resolveDomainId(domainId: TrackV4DomainId): PolicyDomainId {
  return domainId;
}

// The compiler additionally enforces V2 lowerability. A gold policy that
// the V4 interpreter accepts as "compiled" may still be unlowerable in the
// current V2 runtime (spiral progression, before_deadline cadence). For the
// compiler, "reject" is the correct outcome in that case, even when the
// interpretation-only benchmark expects "compiled".
function compilerExpectedOutcome(benchmarkCase: TrackBenchmarkCaseV4): {
  outcome: TrackV4HandlingOutcome;
  unlowerable: boolean;
} {
  // Only compiled/repaired outcomes pass through lowering. Override those
  // to reject when the gold policy is unlowerable. clarify/reject are
  // synthesized directly by the FakeLLM and bypass the lowering probe.
  if (
    benchmarkCase.goldPolicy
    && (benchmarkCase.expectedOutcome === "compiled" || benchmarkCase.expectedOutcome === "repaired")
  ) {
    const unsupported = probeUnsupported(benchmarkCase.goldPolicy);
    if (unsupported.length > 0) {
      return { outcome: "reject", unlowerable: true };
    }
  }
  return { outcome: benchmarkCase.expectedOutcome, unlowerable: false };
}

// ---------------------------------------------------------------------------
// Run the compiler against a single case via a scripted FakeLLM.
// ---------------------------------------------------------------------------
export async function runCompilerBenchCase(
  benchmarkCase: TrackBenchmarkCaseV4,
): Promise<PolicyCompilerBenchCaseResult> {
  const fakeLLM = createFakeLLM({
    responses: [synthesizeCompilerResponse(benchmarkCase)],
    onExhausted: "repeatLast",
  });
  const compiler = createPolicyCompiler({ completionLLM: fakeLLM });

  const request = benchmarkCase.naturalLanguageRequests[0] ?? benchmarkCase.intentId;
  const reasons: string[] = [];
  let actualOutcome: TrackV4HandlingOutcome | "compiler_error";
  const { outcome: expected, unlowerable } = compilerExpectedOutcome(benchmarkCase);

  try {
    const result = await compiler.compile({
      goal: request,
      name: benchmarkCase.intentId,
      skillIds: [],
      domainId: resolveDomainId(benchmarkCase.domainId),
      trackId: `bench-${benchmarkCase.intentId}`,
      userId: "bench-user",
      learnspaceId: "bench-ls",
      now: () => new Date("2026-04-17T12:00:00.000Z"),
    });
    actualOutcome = outcomeFromResult(result);

    if ((result.outcome === "compiled" || result.outcome === "repaired") && benchmarkCase.goldPolicy) {
      const matches = policyShallowEquals(result.policy, benchmarkCase.goldPolicy);
      if (!matches && !benchmarkCase.acceptableEquivalentPolicies?.some((equiv) => policyShallowEquals(result.policy, equiv))) {
        reasons.push("Compiled policy did not match gold or acceptable equivalent.");
      }
    }
  } catch (error) {
    actualOutcome = "compiler_error";
    reasons.push(error instanceof Error ? error.message : "Compiler threw");
  }

  if (actualOutcome !== expected) {
    reasons.push(`Expected ${expected}${unlowerable ? " (gold is unlowerable)" : ""}, got ${actualOutcome}.`);
  }

  return {
    intentId: benchmarkCase.intentId,
    domainId: benchmarkCase.domainId,
    benchmarkClass: benchmarkCase.benchmarkClass,
    expectedOutcome: benchmarkCase.expectedOutcome,
    compilerExpectedOutcome: expected,
    actualOutcome,
    passed: reasons.length === 0,
    unlowerable,
    reasons,
  };
}

function policyShallowEquals(left: TrackPolicyV4, right: TrackPolicyV4): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

// ---------------------------------------------------------------------------
// Top-level bench runner
// ---------------------------------------------------------------------------
export async function runPolicyCompilerBench(
  cases: TrackBenchmarkCaseV4[] = TRACK_V4_BENCHMARK_CASES,
): Promise<PolicyCompilerBenchSummary> {
  const results: PolicyCompilerBenchCaseResult[] = [];
  for (const benchmarkCase of cases) {
    results.push(await runCompilerBenchCase(benchmarkCase));
  }

  const byDomain: PolicyCompilerBenchSummary["byDomain"] = {
    "coding-interview-patterns": { total: 0, passed: 0, handledCorrectlyRate: 0 },
    "writing-workshop": { total: 0, passed: 0, handledCorrectlyRate: 0 },
    "language-lab": { total: 0, passed: 0, handledCorrectlyRate: 0 },
  };
  const byClass: PolicyCompilerBenchSummary["byClass"] = {
    supported: { total: 0, passed: 0, handledCorrectlyRate: 0 },
    ambiguous: { total: 0, passed: 0, handledCorrectlyRate: 0 },
    repairable: { total: 0, passed: 0, handledCorrectlyRate: 0 },
    unsupported: { total: 0, passed: 0, handledCorrectlyRate: 0 },
  };

  for (const entry of results) {
    const d = byDomain[entry.domainId];
    d.total += 1;
    if (entry.passed) d.passed += 1;
    const c = byClass[entry.benchmarkClass];
    c.total += 1;
    if (entry.passed) c.passed += 1;
  }
  for (const entry of Object.values(byDomain)) entry.handledCorrectlyRate = rate(entry.passed, entry.total);
  for (const entry of Object.values(byClass)) entry.handledCorrectlyRate = rate(entry.passed, entry.total);

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    handledCorrectlyRate: rate(passed, results.length),
    byDomain,
    byClass,
    results,
  };
}

// ---------------------------------------------------------------------------
// Parity check against the heuristic baseline
// ---------------------------------------------------------------------------
export interface ParitySummary {
  llmCompilerRate: number;
  heuristicRate: number;
  parityMet: boolean;
  llmFailed: string[];
  heuristicFailed: string[];
  regressed: string[];
}

export async function runPolicyCompilerParity(): Promise<ParitySummary> {
  const heuristic = runEndToEndTrackHandlingHarnessV4();
  const heuristicFailed = new Set(heuristic.results.filter((r) => !r.passed).map((r) => r.intentId));
  const llmSummary = await runPolicyCompilerBench();
  const llmFailed = new Set(llmSummary.results.filter((r) => !r.passed).map((r) => r.intentId));
  const regressed = [...llmFailed].filter((id) => !heuristicFailed.has(id));

  return {
    llmCompilerRate: llmSummary.handledCorrectlyRate,
    heuristicRate: heuristic.handledCorrectlyRate,
    parityMet: llmSummary.handledCorrectlyRate >= heuristic.handledCorrectlyRate,
    llmFailed: [...llmFailed],
    heuristicFailed: [...heuristicFailed],
    regressed,
  };
}

// ---------------------------------------------------------------------------
// Live LLM bench — real compiler against a real CompletionLLM
// ---------------------------------------------------------------------------
export interface LivePolicyCompilerBenchCaseResult {
  intentId: string;
  domainId: TrackV4DomainId;
  benchmarkClass: TrackV4BenchmarkClass;
  request: string;
  expectedOutcome: TrackV4HandlingOutcome;
  compilerExpectedOutcome: TrackV4HandlingOutcome;
  actualOutcome: TrackV4HandlingOutcome | "compiler_error";
  passed: boolean;
  unlowerable: boolean;
  durationMs: number;
  repairCount?: number;
  approximationCount?: number;
  reasons: string[];
}

export interface LivePolicyCompilerBenchSummary {
  total: number;
  passed: number;
  failed: number;
  handledCorrectlyRate: number;
  totalDurationMs: number;
  results: LivePolicyCompilerBenchCaseResult[];
}

export function pickDiverseSample(
  cases: TrackBenchmarkCaseV4[],
  n: number,
  excludeIds: ReadonlySet<string> = new Set(),
): TrackBenchmarkCaseV4[] {
  // Prefer one case per benchmark class, then fill with supported cases.
  const classes: TrackV4BenchmarkClass[] = ["supported", "ambiguous", "repairable", "unsupported"];
  const picked: TrackBenchmarkCaseV4[] = [];
  const pickedIds = new Set<string>();
  const eligible = (c: TrackBenchmarkCaseV4): boolean =>
    !pickedIds.has(c.intentId) && !excludeIds.has(c.intentId);

  for (const benchmarkClass of classes) {
    if (picked.length >= n) break;
    const hit = cases.find((c) => c.benchmarkClass === benchmarkClass && eligible(c));
    if (hit) {
      picked.push(hit);
      pickedIds.add(hit.intentId);
    }
  }
  for (const c of cases) {
    if (picked.length >= n) break;
    if (eligible(c)) {
      picked.push(c);
      pickedIds.add(c.intentId);
    }
  }
  return picked.slice(0, n);
}

export async function runLivePolicyCompilerBench(
  completionLLM: CompletionLLM,
  options: {
    sampleSize?: number;
    cases?: TrackBenchmarkCaseV4[];
    excludeIds?: ReadonlySet<string>;
  } = {},
): Promise<LivePolicyCompilerBenchSummary> {
  const sampleSize = options.sampleSize ?? 5;
  const source = options.cases ?? TRACK_V4_BENCHMARK_CASES;
  const sample = pickDiverseSample(source, sampleSize, options.excludeIds);
  const compiler = createPolicyCompiler({ completionLLM });
  const results: LivePolicyCompilerBenchCaseResult[] = [];
  let totalDurationMs = 0;

  for (const benchmarkCase of sample) {
    const request = benchmarkCase.naturalLanguageRequests[0] ?? benchmarkCase.intentId;
    const { outcome: expected, unlowerable } = compilerExpectedOutcome(benchmarkCase);
    const reasons: string[] = [];
    const startedAt = Date.now();
    let actualOutcome: TrackV4HandlingOutcome | "compiler_error" = "compiler_error";
    let repairCount: number | undefined;
    let approximationCount: number | undefined;

    try {
      const result = await compiler.compile({
        goal: request,
        name: benchmarkCase.intentId,
        skillIds: [],
        domainId: resolveDomainId(benchmarkCase.domainId),
        trackId: `live-bench-${benchmarkCase.intentId}`,
        userId: "live-bench",
        learnspaceId: "live-bench",
        now: () => new Date(),
      });
      actualOutcome = result.outcome;
      if (result.outcome === "compiled" || result.outcome === "repaired") {
        repairCount = result.explanation.repairs?.length ?? 0;
        approximationCount = result.explanation.approximations?.length ?? 0;
      }
    } catch (error) {
      if (error instanceof PolicyCompilerError) {
        reasons.push(`${error.stage}: ${error.message}`);
      } else {
        reasons.push(error instanceof Error ? error.message : "compiler threw");
      }
    }

    const durationMs = Date.now() - startedAt;
    totalDurationMs += durationMs;

    if (actualOutcome !== expected) {
      reasons.push(`Expected ${expected}${unlowerable ? " (gold is unlowerable)" : ""}, got ${actualOutcome}.`);
    }

    results.push({
      intentId: benchmarkCase.intentId,
      domainId: benchmarkCase.domainId,
      benchmarkClass: benchmarkCase.benchmarkClass,
      request,
      expectedOutcome: benchmarkCase.expectedOutcome,
      compilerExpectedOutcome: expected,
      actualOutcome,
      passed: reasons.length === 0,
      unlowerable,
      durationMs,
      repairCount,
      approximationCount,
      reasons,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    handledCorrectlyRate: rate(passed, results.length),
    totalDurationMs,
    results,
  };
}
