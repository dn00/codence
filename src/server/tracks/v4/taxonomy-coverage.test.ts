import { describe, expect, test } from "vitest";
import { TRACK_V4_BENCHMARK_CASES, summarizeTrackBenchmarkCasesV4 } from "./benchmark-fixtures.js";
import { assessTaxonomyExpressivityV4, runTaxonomyCoverageHarnessV4 } from "./taxonomy-coverage.js";

describe("track v4 taxonomy coverage", () => {
  test("benchmark fixtures cover multiple classes and domains", () => {
    const summary = summarizeTrackBenchmarkCasesV4();
    expect(summary.total).toBeGreaterThanOrEqual(100);
    expect(summary.byClass.supported).toBeGreaterThan(0);
    expect(summary.byClass.ambiguous).toBeGreaterThan(0);
    expect(summary.byClass.repairable).toBeGreaterThan(0);
    expect(summary.byClass.unsupported).toBeGreaterThan(0);
    expect(summary.byDomain["coding-interview-patterns"]).toBeGreaterThan(0);
    expect(summary.byDomain["writing-workshop"]).toBeGreaterThan(0);
    expect(summary.byDomain["language-lab"]).toBeGreaterThan(0);
  });

  test("taxonomy expressivity distinguishes supported and unsupported intents", () => {
    const supported = TRACK_V4_BENCHMARK_CASES.find((entry) => entry.intentId === "dsa-graphs-only")!;
    const unsupported = TRACK_V4_BENCHMARK_CASES.find((entry) => entry.intentId === "dsa-unsupported-tired")!;

    expect(assessTaxonomyExpressivityV4(supported).status).toBe("exact_fit");
    expect(assessTaxonomyExpressivityV4(unsupported).status).toBe("not_expressible");
  });

  test("taxonomy harness reports zero unsupported fits for supported benchmark cases", () => {
    const summary = runTaxonomyCoverageHarnessV4();
    expect(summary.total).toBe(TRACK_V4_BENCHMARK_CASES.length);
    expect(summary.notExpressible).toBe(TRACK_V4_BENCHMARK_CASES.filter((entry) => entry.benchmarkClass === "unsupported").length);
  });
});
