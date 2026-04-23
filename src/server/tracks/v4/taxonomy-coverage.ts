import type {
  TrackBenchmarkCaseV4,
  TrackPolicyV4,
  TrackV4BenchmarkClass,
} from "./benchmark-schema.js";
import {
  TRACK_V4_BENCHMARK_CASES,
  TRACK_V4_DOMAIN_FIXTURES,
  type TrackBenchmarkDomainFixtureV4,
} from "./benchmark-fixtures.js";

export type ExpressivityStatusV4 = "exact_fit" | "normalized_fit" | "not_expressible";

export interface ExpressivityResultV4 {
  intentId: string;
  domainId: TrackBenchmarkCaseV4["domainId"];
  benchmarkClass: TrackV4BenchmarkClass;
  status: ExpressivityStatusV4;
  reasons: string[];
}

function validateWeights(weights: Record<string, number> | undefined): string[] {
  if (!weights || Object.keys(weights).length === 0) return [];
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > 0.001) {
    return [`weights must sum to 1, received ${total.toFixed(3)}`];
  }
  return [];
}

export function validateTrackPolicyV4(
  policy: TrackPolicyV4,
  domainId: TrackBenchmarkCaseV4["domainId"],
  catalog?: TrackBenchmarkDomainFixtureV4,
): string[] {
  const domain = catalog ?? TRACK_V4_DOMAIN_FIXTURES[domainId];
  const knownSkillIds = new Set(domain.skills.map((skill) => skill.id));
  const knownCategories = new Set(domain.skills.map((skill) => skill.category));
  const issues: string[] = [];

  for (const skillId of [...policy.scope.includeSkillIds, ...policy.scope.excludeSkillIds]) {
    if (!knownSkillIds.has(skillId)) {
      issues.push(`unknown skill id: ${skillId}`);
    }
  }
  for (const category of [...policy.scope.includeCategories, ...policy.scope.excludeCategories]) {
    if (!knownCategories.has(category)) {
      issues.push(`unknown category: ${category}`);
    }
  }

  issues.push(...validateWeights(policy.allocation.skillWeights));
  issues.push(...validateWeights(policy.allocation.categoryWeights));

  for (const cadence of policy.cadence) {
    if (!domain.supportedCadenceBuckets.includes(cadence.bucket)) {
      issues.push(`unsupported cadence bucket for ${domainId}: ${cadence.bucket}`);
    }
  }

  if (policy.contentSource.seedOnly && policy.contentSource.generatedAllowed) {
    issues.push("seedOnly conflicts with generatedAllowed");
  }
  if (policy.contentSource.generatedForDrillsOnly && !policy.contentSource.generatedAllowed) {
    issues.push("generatedForDrillsOnly requires generatedAllowed");
  }
  if (policy.contentSource.noGeneratedForAssessment && domain.supportsGeneratedAssessment) {
    issues.push(`domain ${domainId} allows generated assessment; benchmark policy assumes it does not`);
  }
  if (policy.contentSource.generatedAllowed && !domain.supportsGeneratedContent) {
    issues.push(`domain ${domainId} does not support generated content`);
  }

  return issues;
}

export function assessTaxonomyExpressivityV4(benchmarkCase: TrackBenchmarkCaseV4): ExpressivityResultV4 {
  if (!benchmarkCase.goldPolicy) {
    return {
      intentId: benchmarkCase.intentId,
      domainId: benchmarkCase.domainId,
      benchmarkClass: benchmarkCase.benchmarkClass,
      status: "not_expressible",
      reasons: [benchmarkCase.unsupportedReason ?? "No gold policy supplied."],
    };
  }

  const issues = validateTrackPolicyV4(benchmarkCase.goldPolicy, benchmarkCase.domainId);
  if (issues.length > 0) {
    return {
      intentId: benchmarkCase.intentId,
      domainId: benchmarkCase.domainId,
      benchmarkClass: benchmarkCase.benchmarkClass,
      status: "not_expressible",
      reasons: issues,
    };
  }

  const normalizedFit =
    benchmarkCase.repairAllowed
    || benchmarkCase.clarificationExpected
    || (benchmarkCase.acceptableEquivalentPolicies?.length ?? 0) > 0;

  return {
    intentId: benchmarkCase.intentId,
    domainId: benchmarkCase.domainId,
    benchmarkClass: benchmarkCase.benchmarkClass,
    status: normalizedFit ? "normalized_fit" : "exact_fit",
    reasons: normalizedFit
      ? ["Policy is expressible but may require clarification, repair, or semantic normalization."]
      : [],
  };
}

export function runTaxonomyCoverageHarnessV4(cases: TrackBenchmarkCaseV4[] = TRACK_V4_BENCHMARK_CASES): {
  total: number;
  exactFit: number;
  normalizedFit: number;
  notExpressible: number;
  results: ExpressivityResultV4[];
} {
  const results = cases.map(assessTaxonomyExpressivityV4);
  return {
    total: results.length,
    exactFit: results.filter((result) => result.status === "exact_fit").length,
    normalizedFit: results.filter((result) => result.status === "normalized_fit").length,
    notExpressible: results.filter((result) => result.status === "not_expressible").length,
    results,
  };
}
