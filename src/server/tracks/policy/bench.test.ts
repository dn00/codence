import { describe, expect, test } from "vitest";
import {
  runCompilerBenchCase,
  runPolicyCompilerBench,
  runPolicyCompilerParity,
  synthesizeCompilerResponse,
} from "./bench.js";
import type { TrackBenchmarkCaseV4 } from "../v4/benchmark-schema.js";

function fakeCase(overrides: Partial<TrackBenchmarkCaseV4> = {}): TrackBenchmarkCaseV4 {
  return {
    intentId: "test-case",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    policyFamilies: ["scope"],
    naturalLanguageRequests: ["prep for coding interviews"],
    clarificationExpected: false,
    repairAllowed: false,
    expectedOutcome: "compiled",
    goldPolicy: {
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [] },
      allocation: {},
      pacing: {},
      sessionComposition: {},
      difficulty: { mode: "adaptive", targetBand: "medium" },
      progression: { mode: "linear" },
      review: { scheduler: "sm5" },
      adaptation: {},
      cadence: [],
      contentSource: {},
    },
    ...overrides,
  };
}

describe("synthesizeCompilerResponse", () => {
  test("compiled outcome with gold policy", () => {
    const raw = synthesizeCompilerResponse(fakeCase());
    const parsed = JSON.parse(raw);
    expect(parsed.outcome).toBe("compiled");
    expect(parsed.policy).toBeTruthy();
  });

  test("repaired outcome includes repair explanation", () => {
    const raw = synthesizeCompilerResponse(fakeCase({ expectedOutcome: "repaired", benchmarkClass: "repairable" }));
    const parsed = JSON.parse(raw);
    expect(parsed.outcome).toBe("repaired");
    expect(parsed.explanation?.repairs).toBeTruthy();
  });

  test("clarify outcome returns question", () => {
    const raw = synthesizeCompilerResponse(fakeCase({
      expectedOutcome: "clarify",
      benchmarkClass: "ambiguous",
      goldPolicy: undefined,
      clarificationExpected: true,
    }));
    const parsed = JSON.parse(raw);
    expect(parsed.outcome).toBe("clarify");
    expect(typeof parsed.question).toBe("string");
  });

  test("reject outcome returns reason", () => {
    const raw = synthesizeCompilerResponse(fakeCase({
      expectedOutcome: "reject",
      benchmarkClass: "unsupported",
      goldPolicy: undefined,
      unsupportedReason: "not expressible",
    }));
    const parsed = JSON.parse(raw);
    expect(parsed.outcome).toBe("reject");
    expect(parsed.reason).toBe("not expressible");
  });
});

describe("runCompilerBenchCase", () => {
  test("passes for a simple supported case", async () => {
    const result = await runCompilerBenchCase(fakeCase());
    expect(result.passed).toBe(true);
    expect(result.actualOutcome).toBe("compiled");
    expect(result.unlowerable).toBe(false);
  });

  test("overrides expected outcome to reject when gold is unlowerable (spiral)", async () => {
    const result = await runCompilerBenchCase(fakeCase({
      goldPolicy: {
        scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [] },
        allocation: {},
        pacing: {},
        sessionComposition: {},
        difficulty: { mode: "adaptive" },
        progression: { mode: "spiral" },
        review: { scheduler: "sm5" },
        adaptation: {},
        cadence: [],
        contentSource: {},
      },
    }));
    expect(result.passed).toBe(true);
    expect(result.unlowerable).toBe(true);
    expect(result.compilerExpectedOutcome).toBe("reject");
    expect(result.actualOutcome).toBe("reject");
  });
});

describe("runPolicyCompilerBench + parity", () => {
  test("full benchmark achieves parity with heuristic baseline", async () => {
    const parity = await runPolicyCompilerParity();
    expect(parity.parityMet).toBe(true);
    expect(parity.regressed).toEqual([]);
  }, 30_000);

  test("summary reports per-domain and per-class breakdowns", async () => {
    const summary = await runPolicyCompilerBench();
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.byDomain["coding-interview-patterns"].total).toBeGreaterThan(0);
    expect(summary.byClass.supported.total).toBeGreaterThan(0);
  }, 30_000);
});
