import type {
  TrackBenchmarkCaseV4,
  TrackV4HandlingOutcome,
} from "./benchmark-schema.js";
import { TRACK_V4_BENCHMARK_CASES } from "./benchmark-fixtures.js";
import { assessTaxonomyExpressivityV4 } from "./taxonomy-coverage.js";
import {
  compileBenchmarkCaseV4,
  matchesGoldOrEquivalentV4,
} from "./nl-to-policy.js";
import { evaluateRuntimeScenarioV4 } from "./policy-runtime.js";

export interface EndToEndCaseResultV4 {
  intentId: string;
  domainId: TrackBenchmarkCaseV4["domainId"];
  expectedOutcome: TrackV4HandlingOutcome;
  actualOutcome: TrackV4HandlingOutcome;
  passed: boolean;
  reasons: string[];
}

export interface EndToEndSummaryV4 {
  total: number;
  passed: number;
  failed: number;
  handledCorrectlyRate: number;
  results: EndToEndCaseResultV4[];
}

export function evaluateTrackBenchmarkCaseV4(benchmarkCase: TrackBenchmarkCaseV4): EndToEndCaseResultV4 {
  const expressivity = assessTaxonomyExpressivityV4(benchmarkCase);
  const compileResults = compileBenchmarkCaseV4(benchmarkCase);
  const reasons: string[] = [];

  let actualOutcome: TrackV4HandlingOutcome = compileResults[0]?.outcome ?? "reject";

  if (expressivity.status === "not_expressible" && benchmarkCase.expectedOutcome === "reject") {
    actualOutcome = "reject";
  } else if (compileResults.some((result) => result.outcome === "clarify")) {
    actualOutcome = "clarify";
  } else if (compileResults.some((result) => result.outcome === "repaired")) {
    actualOutcome = "repaired";
  } else if (compileResults.some((result) => result.outcome === "compiled")) {
    actualOutcome = "compiled";
  }

  if ((actualOutcome === "compiled" || actualOutcome === "repaired") && benchmarkCase.goldPolicy) {
    const matchingResult = compileResults.find((result) => result.policy && matchesGoldOrEquivalentV4(benchmarkCase, result.policy));
    if (!matchingResult) {
      reasons.push("No compiled policy matched the gold or acceptable equivalents.");
    }
  }

  if ((actualOutcome === "compiled" || actualOutcome === "repaired") && benchmarkCase.runtimeScenarios && compileResults[0]?.policy) {
    for (const scenario of benchmarkCase.runtimeScenarios) {
      const runtime = evaluateRuntimeScenarioV4(compileResults[0].policy, scenario);
      if (!runtime.passed) {
        reasons.push(...runtime.reasons.map((reason) => `${scenario.id}: ${reason}`));
      }
    }
  }

  if (actualOutcome !== benchmarkCase.expectedOutcome) {
    reasons.push(`Expected outcome ${benchmarkCase.expectedOutcome} but got ${actualOutcome}.`);
  }

  return {
    intentId: benchmarkCase.intentId,
    domainId: benchmarkCase.domainId,
    expectedOutcome: benchmarkCase.expectedOutcome,
    actualOutcome,
    passed: reasons.length === 0,
    reasons,
  };
}

export function runEndToEndTrackHandlingHarnessV4(
  cases: TrackBenchmarkCaseV4[] = TRACK_V4_BENCHMARK_CASES,
): EndToEndSummaryV4 {
  const results = cases.map(evaluateTrackBenchmarkCaseV4);
  const passed = results.filter((result) => result.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    handledCorrectlyRate: Number(((passed / results.length) * 100).toFixed(2)),
    results,
  };
}
