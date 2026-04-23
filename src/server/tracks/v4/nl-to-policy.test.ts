import { describe, expect, test } from "vitest";
import { findBenchmarkCaseByIntentV4, compileBenchmarkCaseV4, compileNaturalLanguageTrackV4, matchesGoldOrEquivalentV4 } from "./nl-to-policy.js";

describe("track v4 nl-to-policy", () => {
  test("compiles supported requests into gold or equivalent policies", () => {
    const benchmarkCase = findBenchmarkCaseByIntentV4("dsa-mock-cadence");
    const results = compileBenchmarkCaseV4(benchmarkCase);
    expect(results.every((result) => result.outcome === "compiled")).toBe(true);
    expect(results.some((result) => result.policy && matchesGoldOrEquivalentV4(benchmarkCase, result.policy))).toBe(true);
  });

  test("returns clarify for ambiguous requests", () => {
    const result = compileNaturalLanguageTrackV4("coding-interview-patterns", "Keep me mostly on weak stuff");
    expect(result.outcome).toBe("clarify");
  });

  test("returns repaired for vague but repairable requests", () => {
    const result = compileNaturalLanguageTrackV4("coding-interview-patterns", "Push me, but don't bury me");
    expect(result.outcome).toBe("repaired");
    expect(result.policy?.difficulty.mode).toBe("adaptive");
    expect(result.policy?.adaptation.onRepeatedFailures).toBe("reduce_difficulty");
  });

  test("rejects out-of-taxonomy requests", () => {
    const result = compileNaturalLanguageTrackV4("writing-workshop", "Match difficulty to my stress level");
    expect(result.outcome).toBe("reject");
  });

  test("handles colloquial scope and loose time-budget phrasing", () => {
    const scopeResult = compileNaturalLanguageTrackV4("coding-interview-patterns", "i keep dodging graph questions, so just park me on those for a while");
    expect(scopeResult.policy?.scope.includeSkillIds).toContain("graphs");

    const pacingResult = compileNaturalLanguageTrackV4("language-lab", "i can manage like 12 on weekdays and maybe 24 when it's the weekend");
    expect(pacingResult.policy?.pacing.weekdayMinutes).toBe(12);
    expect(pacingResult.policy?.pacing.weekendMinutes).toBe(24);
  });

  test("routes vague weakness and weekend load phrasing to clarify", () => {
    expect(compileNaturalLanguageTrackV4("writing-workshop", "mostly keep me on the bits i'm wobbly at").outcome).toBe("clarify");
    expect(compileNaturalLanguageTrackV4("language-lab", "have weekends carry more of the load").outcome).toBe("clarify");
  });

  test("repairs colloquial push-with-safety language", () => {
    const result = compileNaturalLanguageTrackV4("language-lab", "push me, just don't fry me");
    expect(result.outcome).toBe("repaired");
    expect(result.policy?.difficulty.pushOnSuccess).toBe(true);
    expect(result.policy?.difficulty.backoffOnStruggle).toBe(true);
  });

  test("rejects unsupported personal-state requests beyond simple stress wording", () => {
    expect(compileNaturalLanguageTrackV4("coding-interview-patterns", "when i'm wiped out after work, have it quietly dial itself down").outcome).toBe("reject");
    expect(compileNaturalLanguageTrackV4("language-lab", "if i slept badly the night before, quietly make the plan lighter").outcome).toBe("reject");
  });

  test("handles word numbers, normalized cadence, and richer generated-content guards", () => {
    const weekly = compileNaturalLanguageTrackV4("writing-workshop", "I can manage four sessions a week if they are short");
    expect(weekly.policy?.pacing.sessionsPerWeek).toBe(4);

    const cadence = compileNaturalLanguageTrackV4("coding-interview-patterns", "Every fifth session, run me through something fake-interview-ish");
    expect(cadence.policy?.cadence[0]?.everyNSessions).toBe(5);
    expect(cadence.policy?.cadence[0]?.bucket).toBe("mock");

    const content = compileNaturalLanguageTrackV4("language-lab", "Synthetic items are fine for drills. They are not fine for anything that counts as assessment.");
    expect(content.policy?.contentSource.generatedForDrillsOnly).toBe(true);
    expect(content.policy?.contentSource.noGeneratedForAssessment).toBe(true);
  });

  test("does not over-trigger difficulty from incidental hard or easy phrasing", () => {
    const weighted = compileNaturalLanguageTrackV4("coding-interview-patterns", "tilt it pretty hard toward graphs over trees. call it 70/30");
    expect(weighted.policy?.difficulty.mode).toBe("adaptive");

    const reviewFocus = compileNaturalLanguageTrackV4("language-lab", "shift hard into review focus until the backlog comes down");
    expect(reviewFocus.policy?.difficulty.mode).toBe("adaptive");

    const cruising = compileNaturalLanguageTrackV4("writing-workshop", "if i'm cruising, then yes, raise the bar. i don't want easy mode forever");
    expect(cruising.policy?.difficulty.pushOnSuccess).toBe(true);
    expect(cruising.policy?.difficulty.targetBand).toBeUndefined();
  });

  test("keeps breadth-first, sentence-local pacing, and seed-only semantics stable on noisier phrasing", () => {
    const breadth = compileNaturalLanguageTrackV4("coding-interview-patterns", "I want a breadth-first pass before we go deep. Touch the landscape, then dig.");
    expect(breadth.policy?.progression.mode).toBe("breadth_first");

    const pacing = compileNaturalLanguageTrackV4("writing-workshop", "Weekdays are cramped, so assume 10 there. Weekends are where I can actually breathe, so make those 25.");
    expect(pacing.policy?.pacing.weekdayMinutes).toBe(10);
    expect(pacing.policy?.pacing.weekendMinutes).toBe(25);

    const seedOnly = compileNaturalLanguageTrackV4("language-lab", "Keep this on real material only. No synthetic filler sneaking in because the pool got small.");
    expect(seedOnly.policy?.contentSource.seedOnly).toBe(true);
    expect(seedOnly.policy?.contentSource.generatedAllowed).toBe(false);
  });
});
