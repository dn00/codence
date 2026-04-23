import { describe, expect, test } from "vitest";
import { TRACK_V4_BENCHMARK_CASES } from "./benchmark-fixtures.js";
import { evaluateTrackBenchmarkCaseV4, runEndToEndTrackHandlingHarnessV4 } from "./e2e-track-handling.js";

describe("track v4 end-to-end handling", () => {
  test("handles benchmark cases with compile, repair, clarify, and reject outcomes", () => {
    const compileCase = TRACK_V4_BENCHMARK_CASES.find((entry) => entry.intentId === "dsa-graphs-only")!;
    const clarifyCase = TRACK_V4_BENCHMARK_CASES.find((entry) => entry.intentId === "dsa-ambiguous-weak-stuff")!;
    const repairCase = TRACK_V4_BENCHMARK_CASES.find((entry) => entry.intentId === "dsa-repair-push-dont-bury")!;
    const rejectCase = TRACK_V4_BENCHMARK_CASES.find((entry) => entry.intentId === "dsa-unsupported-tired")!;

    expect(evaluateTrackBenchmarkCaseV4(compileCase).actualOutcome).toBe("compiled");
    expect(evaluateTrackBenchmarkCaseV4(clarifyCase).actualOutcome).toBe("clarify");
    expect(evaluateTrackBenchmarkCaseV4(repairCase).actualOutcome).toBe("repaired");
    expect(evaluateTrackBenchmarkCaseV4(rejectCase).actualOutcome).toBe("reject");
  });

  test("benchmark handling rate stays high for the seed cases", () => {
    const summary = runEndToEndTrackHandlingHarnessV4();
    expect(summary.total).toBe(TRACK_V4_BENCHMARK_CASES.length);
    expect(summary.handledCorrectlyRate).toBeGreaterThanOrEqual(95);
  });
});
