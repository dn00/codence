import { describe, expect, test } from "vitest";
import { findBenchmarkCaseByIntentV4, compileBenchmarkCaseV4 } from "./nl-to-policy.js";
import { evaluateRuntimeScenarioV4 } from "./policy-runtime.js";

describe("track v4 policy runtime", () => {
  test("generation fallback only enables generation when the pool is low", () => {
    const benchmarkCase = findBenchmarkCaseByIntentV4("dsa-generated-fallback");
    const compiled = compileBenchmarkCaseV4(benchmarkCase)[0]!;
    const scenario = benchmarkCase.runtimeScenarios?.[0]!;
    const result = evaluateRuntimeScenarioV4(compiled.policy!, scenario);

    expect(result.passed).toBe(true);
    expect(result.decisions[0]?.generatedAllowed).toBe(false);
    expect(result.decisions[1]?.generatedAllowed).toBe(true);
  });

  test("repair policies can reduce difficulty after repeated failures", () => {
    const benchmarkCase = findBenchmarkCaseByIntentV4("dsa-repair-push-dont-bury");
    const compiled = compileBenchmarkCaseV4(benchmarkCase)[0]!;
    const scenario = benchmarkCase.runtimeScenarios?.[0]!;
    const result = evaluateRuntimeScenarioV4(compiled.policy!, scenario);

    expect(result.passed).toBe(true);
    expect(result.decisions.find((decision) => decision.sessionIndex === 4)?.difficultyBand).toBe("easy");
  });
});
