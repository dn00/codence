import { validateTrackPolicyV4 } from "../v4/taxonomy-coverage.js";
import type { TrackBenchmarkDomainFixtureV4 } from "../v4/benchmark-fixtures.js";
import type { PolicyDomainId, TrackPolicy } from "./types.js";

export interface PolicyValidationResult {
  valid: boolean;
  normalized: TrackPolicy;
  errors: string[];
}

function normalizeWeights(weights: Record<string, number> | undefined): Record<string, number> | undefined {
  if (!weights) return undefined;
  const entries = Object.entries(weights).filter(([, weight]) => Number.isFinite(weight) && weight > 0);
  if (entries.length === 0) return undefined;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (Math.abs(total - 1) < 0.001) return Object.fromEntries(entries);
  return Object.fromEntries(entries.map(([key, weight]) => [key, weight / total]));
}

function normalizeShares(
  composition: TrackPolicy["sessionComposition"],
): TrackPolicy["sessionComposition"] {
  const shareKeys = ["reviewShare", "newShare", "drillShare", "mockShare", "recallShare"] as const;
  const rawShares = shareKeys
    .map((key) => ({ key, value: composition[key] }))
    .filter((entry): entry is { key: typeof entry.key; value: number } =>
      typeof entry.value === "number" && Number.isFinite(entry.value) && entry.value > 0,
    );
  if (rawShares.length === 0) return composition;
  const total = rawShares.reduce((sum, entry) => sum + entry.value, 0);
  const nextComposition: TrackPolicy["sessionComposition"] = { ...composition };
  // Shares express emphasis, not exclusive partitions — values below 1 are
  // intentional (implicit remainder goes to default blend). Only rescale
  // when the total overshoots 1.
  if (total <= 1 + 0.001) return nextComposition;
  for (const { key, value } of rawShares) {
    nextComposition[key] = value / total;
  }
  return nextComposition;
}

export function normalizePolicy(policy: TrackPolicy): TrackPolicy {
  return {
    ...policy,
    allocation: {
      ...policy.allocation,
      skillWeights: normalizeWeights(policy.allocation.skillWeights),
      categoryWeights: normalizeWeights(policy.allocation.categoryWeights),
    },
    sessionComposition: normalizeShares(policy.sessionComposition),
  };
}

export function validatePolicy(
  policy: TrackPolicy,
  domainId: PolicyDomainId,
  catalog?: TrackBenchmarkDomainFixtureV4,
): PolicyValidationResult {
  const normalized = normalizePolicy(policy);
  const errors = validateTrackPolicyV4(normalized, domainId, catalog);
  return {
    valid: errors.length === 0,
    normalized,
    errors,
  };
}
