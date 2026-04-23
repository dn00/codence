import {
  TRACK_V4_ACCEPTANCE_THRESHOLDS,
  type TrackBenchmarkCaseV4,
  type TrackV4BenchmarkClass,
  type TrackV4DomainId,
} from "../src/server/tracks/v4/benchmark-schema.js";
import { TRACK_V4_BENCHMARK_CASES } from "../src/server/tracks/v4/benchmark-fixtures.js";
import { runTaxonomyCoverageHarnessV4 } from "../src/server/tracks/v4/taxonomy-coverage.js";
import {
  comparePoliciesV4,
  compileBenchmarkCaseV4,
  matchesGoldOrEquivalentV4,
} from "../src/server/tracks/v4/nl-to-policy.js";
import { runEndToEndTrackHandlingHarnessV4 } from "../src/server/tracks/v4/e2e-track-handling.js";

function rate(passed: number, total: number): number {
  if (total === 0) return 0;
  return Number(((passed / total) * 100).toFixed(2));
}

function summarizeByDomain(
  cases: TrackBenchmarkCaseV4[],
  passedIntentIds: Set<string>,
): Record<TrackV4DomainId, { total: number; passed: number; handledCorrectlyRate: number }> {
  const summary: Record<TrackV4DomainId, { total: number; passed: number; handledCorrectlyRate: number }> = {
    "coding-interview-patterns": { total: 0, passed: 0, handledCorrectlyRate: 0 },
    "writing-workshop": { total: 0, passed: 0, handledCorrectlyRate: 0 },
    "language-lab": { total: 0, passed: 0, handledCorrectlyRate: 0 },
  };

  for (const benchmarkCase of cases) {
    const entry = summary[benchmarkCase.domainId];
    entry.total += 1;
    if (passedIntentIds.has(benchmarkCase.intentId)) {
      entry.passed += 1;
    }
  }

  for (const entry of Object.values(summary)) {
    entry.handledCorrectlyRate = rate(entry.passed, entry.total);
  }

  return summary;
}

function summarizeByClass(
  cases: TrackBenchmarkCaseV4[],
  passedIntentIds: Set<string>,
): Record<TrackV4BenchmarkClass, { total: number; passed: number; handledCorrectlyRate: number }> {
  const summary: Record<TrackV4BenchmarkClass, { total: number; passed: number; handledCorrectlyRate: number }> = {
    supported: { total: 0, passed: 0, handledCorrectlyRate: 0 },
    ambiguous: { total: 0, passed: 0, handledCorrectlyRate: 0 },
    repairable: { total: 0, passed: 0, handledCorrectlyRate: 0 },
    unsupported: { total: 0, passed: 0, handledCorrectlyRate: 0 },
  };

  for (const benchmarkCase of cases) {
    const entry = summary[benchmarkCase.benchmarkClass];
    entry.total += 1;
    if (passedIntentIds.has(benchmarkCase.intentId)) {
      entry.passed += 1;
    }
  }

  for (const entry of Object.values(summary)) {
    entry.handledCorrectlyRate = rate(entry.passed, entry.total);
  }

  return summary;
}

const taxonomy = runTaxonomyCoverageHarnessV4();
const endToEnd = runEndToEndTrackHandlingHarnessV4();
const passedIntentIds = new Set(endToEnd.results.filter((result) => result.passed).map((result) => result.intentId));
const compileResults = TRACK_V4_BENCHMARK_CASES.flatMap((benchmarkCase) => compileBenchmarkCaseV4(benchmarkCase));

const semanticCases = TRACK_V4_BENCHMARK_CASES.map((benchmarkCase) => {
  const results = compileBenchmarkCaseV4(benchmarkCase);
  const matchingResult = results.find((result) => result.policy && matchesGoldOrEquivalentV4(benchmarkCase, result.policy));
  const exactPolicyMatch = Boolean(
    matchingResult
    && benchmarkCase.goldPolicy
    && matchingResult.policy
    && comparePoliciesV4(benchmarkCase.goldPolicy, matchingResult.policy),
  );

  return {
    intentId: benchmarkCase.intentId,
    domainId: benchmarkCase.domainId,
    benchmarkClass: benchmarkCase.benchmarkClass,
    expectedOutcome: benchmarkCase.expectedOutcome,
    actualOutcome: endToEnd.results.find((result) => result.intentId === benchmarkCase.intentId)?.actualOutcome,
    exactPolicyMatch,
    acceptableEquivalentMatch: Boolean(matchingResult) && !exactPolicyMatch,
  };
});

const semanticSummary = {
  exactPolicyMatches: semanticCases.filter((entry) => entry.exactPolicyMatch).length,
  acceptableEquivalentMatches: semanticCases.filter((entry) => entry.acceptableEquivalentMatch).length,
  repairedAccepted: endToEnd.results.filter((result) => result.expectedOutcome === "repaired" && result.passed).length,
  clarifyAccepted: endToEnd.results.filter((result) => result.expectedOutcome === "clarify" && result.passed).length,
  rejectAccepted: endToEnd.results.filter((result) => result.expectedOutcome === "reject" && result.passed).length,
};

const inDomainCases = TRACK_V4_BENCHMARK_CASES.filter((benchmarkCase) => benchmarkCase.benchmarkClass !== "unsupported");
const inDomainPassed = endToEnd.results.filter((result) =>
  TRACK_V4_BENCHMARK_CASES.find((benchmarkCase) => benchmarkCase.intentId === result.intentId)?.benchmarkClass !== "unsupported"
  && result.passed,
).length;
const taxonomyExpressivityRate = rate(taxonomy.exactFit + taxonomy.normalizedFit, inDomainCases.length);
const inDomainHandledCorrectlyRate = rate(inDomainPassed, inDomainCases.length);
const byDomain = summarizeByDomain(TRACK_V4_BENCHMARK_CASES, passedIntentIds);
const byClass = summarizeByClass(TRACK_V4_BENCHMARK_CASES, passedIntentIds);

const acceptanceFailures: string[] = [];

if (TRACK_V4_BENCHMARK_CASES.length < TRACK_V4_ACCEPTANCE_THRESHOLDS.minCases) {
  acceptanceFailures.push(`min benchmark cases ${TRACK_V4_ACCEPTANCE_THRESHOLDS.minCases} not met`);
}
if (taxonomyExpressivityRate < TRACK_V4_ACCEPTANCE_THRESHOLDS.taxonomyExpressivityRate) {
  acceptanceFailures.push(
    `taxonomy expressivity ${taxonomyExpressivityRate}% < ${TRACK_V4_ACCEPTANCE_THRESHOLDS.taxonomyExpressivityRate}%`,
  );
}
if (endToEnd.handledCorrectlyRate < TRACK_V4_ACCEPTANCE_THRESHOLDS.handledCorrectlyRate) {
  acceptanceFailures.push(
    `overall handled rate ${endToEnd.handledCorrectlyRate}% < ${TRACK_V4_ACCEPTANCE_THRESHOLDS.handledCorrectlyRate}%`,
  );
}
if (inDomainHandledCorrectlyRate < TRACK_V4_ACCEPTANCE_THRESHOLDS.inDomainHandledCorrectlyRate) {
  acceptanceFailures.push(
    `in-domain handled rate ${inDomainHandledCorrectlyRate}% < ${TRACK_V4_ACCEPTANCE_THRESHOLDS.inDomainHandledCorrectlyRate}%`,
  );
}

for (const [domainId, summary] of Object.entries(byDomain) as Array<[TrackV4DomainId, { handledCorrectlyRate: number }]>) {
  if (summary.handledCorrectlyRate < TRACK_V4_ACCEPTANCE_THRESHOLDS.perDomainHandledCorrectlyRate) {
    acceptanceFailures.push(
      `${domainId} handled rate ${summary.handledCorrectlyRate}% < ${TRACK_V4_ACCEPTANCE_THRESHOLDS.perDomainHandledCorrectlyRate}%`,
    );
  }
}

for (const [benchmarkClass, threshold] of Object.entries(TRACK_V4_ACCEPTANCE_THRESHOLDS.perClassHandledCorrectlyRate) as Array<
  [Exclude<TrackV4BenchmarkClass, "unsupported">, number]
>) {
  const classRate = byClass[benchmarkClass].handledCorrectlyRate;
  if (classRate < threshold) {
    acceptanceFailures.push(`${benchmarkClass} handled rate ${classRate}% < ${threshold}%`);
  }
}

console.log(JSON.stringify({
  acceptance: {
    thresholds: TRACK_V4_ACCEPTANCE_THRESHOLDS,
    passed: acceptanceFailures.length === 0,
    failures: acceptanceFailures,
  },
  coverage: {
    totalCases: TRACK_V4_BENCHMARK_CASES.length,
    taxonomyExpressivityRate,
    inDomainHandledCorrectlyRate,
    byDomain,
    byClass,
  },
  taxonomy: {
    total: taxonomy.total,
    exactFit: taxonomy.exactFit,
    normalizedFit: taxonomy.normalizedFit,
    notExpressible: taxonomy.notExpressible,
  },
  nlToPolicy: {
    totalRequests: compileResults.length,
    compiled: compileResults.filter((result) => result.outcome === "compiled").length,
    repaired: compileResults.filter((result) => result.outcome === "repaired").length,
    clarify: compileResults.filter((result) => result.outcome === "clarify").length,
    reject: compileResults.filter((result) => result.outcome === "reject").length,
  },
  semantic: semanticSummary,
  endToEnd: {
    total: endToEnd.total,
    passed: endToEnd.passed,
    failed: endToEnd.failed,
    handledCorrectlyRate: endToEnd.handledCorrectlyRate,
    failedCases: endToEnd.results.filter((result) => !result.passed),
  },
}, null, 2));

if (acceptanceFailures.length > 0 || endToEnd.failed > 0) {
  process.exitCode = 1;
}
