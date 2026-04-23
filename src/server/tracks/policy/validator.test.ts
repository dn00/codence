import { describe, expect, test } from "vitest";
import { normalizePolicy, validatePolicy } from "./validator.js";
import type { TrackPolicy } from "./types.js";

function basePolicy(overrides: Partial<TrackPolicy> = {}): TrackPolicy {
  return {
    scope: {
      includeSkillIds: [],
      excludeSkillIds: [],
      includeCategories: [],
      excludeCategories: [],
    },
    allocation: {},
    pacing: {},
    sessionComposition: {},
    difficulty: { mode: "adaptive" },
    progression: { mode: "linear" },
    review: { scheduler: "sm5" },
    adaptation: {},
    cadence: [],
    contentSource: {},
    ...overrides,
  };
}

describe("normalizePolicy", () => {
  test("renormalizes skill weights to sum to 1", () => {
    const policy = basePolicy({ allocation: { skillWeights: { arrays_and_hashing: 2, graphs: 2 } } });
    const normalized = normalizePolicy(policy);
    const total = Object.values(normalized.allocation.skillWeights ?? {}).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1, 3);
  });

  test("leaves already-normalized weights alone", () => {
    const policy = basePolicy({ allocation: { skillWeights: { arrays_and_hashing: 0.4, graphs: 0.6 } } });
    const normalized = normalizePolicy(policy);
    expect(normalized.allocation.skillWeights).toEqual({ arrays_and_hashing: 0.4, graphs: 0.6 });
  });

  test("renormalizes session composition shares only when total overshoots 1", () => {
    const over = normalizePolicy(basePolicy({ sessionComposition: { reviewShare: 3, newShare: 1 } }));
    expect(over.sessionComposition.reviewShare).toBeCloseTo(0.75, 3);
    expect(over.sessionComposition.newShare).toBeCloseTo(0.25, 3);

    const under = normalizePolicy(basePolicy({ sessionComposition: { recallShare: 0.2 } }));
    expect(under.sessionComposition.recallShare).toBe(0.2);
  });

  test("strips weights with non-positive values", () => {
    const policy = basePolicy({ allocation: { skillWeights: { arrays_and_hashing: 1, graphs: 0 } } });
    const normalized = normalizePolicy(policy);
    expect(normalized.allocation.skillWeights).toEqual({ arrays_and_hashing: 1 });
  });
});

describe("validatePolicy", () => {
  test("accepts a minimal valid policy", () => {
    const result = validatePolicy(basePolicy(), "coding-interview-patterns");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects unknown skill ids", () => {
    const policy = basePolicy({
      scope: {
        includeSkillIds: ["not_a_real_skill"],
        excludeSkillIds: [],
        includeCategories: [],
        excludeCategories: [],
      },
    });
    const result = validatePolicy(policy, "coding-interview-patterns");
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/unknown skill id: not_a_real_skill/);
  });

  test("returns normalized policy even when invalid", () => {
    const policy = basePolicy({
      scope: {
        includeSkillIds: ["not_a_real_skill"],
        excludeSkillIds: [],
        includeCategories: [],
        excludeCategories: [],
      },
      allocation: { skillWeights: { a: 2, b: 2 } },
    });
    const result = validatePolicy(policy, "coding-interview-patterns");
    expect(result.valid).toBe(false);
    const total = Object.values(result.normalized.allocation.skillWeights ?? {}).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1, 3);
  });

  test("flags seedOnly + generatedAllowed conflict", () => {
    const policy = basePolicy({
      contentSource: { seedOnly: true, generatedAllowed: true },
    });
    const result = validatePolicy(policy, "coding-interview-patterns");
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/seedOnly conflicts with generatedAllowed/);
  });
});
