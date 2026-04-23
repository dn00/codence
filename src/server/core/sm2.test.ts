import { expectTypeOf } from "vitest";
import type {
  PracticeClock,
  PracticeOutcome,
  SM2State,
  StructuredEvaluation,
} from "./types.js";
import { deriveMaxIntervalDays, updateSM2 } from "./sm2.js";

function createClock(isoString: string): PracticeClock {
  return {
    now: () => new Date(isoString),
  };
}

describe("SM-2 helpers", () => {
  test("AC-1 exports shared practice-domain contracts for queue and completion flows", () => {
    const outcome: PracticeOutcome = "clean";
    const state: SM2State = {
      intervalDays: 6,
      easeFactor: 2.5,
      round: 2,
    };
    const evaluation: StructuredEvaluation = {
      outcome: "assisted",
      diagnosis: "Needs a stronger walkthrough",
      severity: "moderate",
      approach_correct: true,
      per_step_quality: {
        understanding: "solid",
      },
      mistakes: [
        {
          type: "trace-gap",
          description: "Skipped a branch in the example walkthrough",
          step: "walkthrough",
        },
      ],
      strengths: ["Correctly identified the core pattern"],
      coaching_summary: "Mostly correct, but the explanation was incomplete.",
      evaluation_source: "llm",
      retry_recovered: false,
    };
    const clock = createClock("2026-04-08T00:00:00.000Z");

    expectTypeOf(outcome).toMatchTypeOf<PracticeOutcome>();
    expectTypeOf(state).toMatchTypeOf<SM2State>();
    expectTypeOf(evaluation).toMatchTypeOf<StructuredEvaluation>();
    expectTypeOf(clock).toMatchTypeOf<PracticeClock>();

    expect(updateSM2(state, "abandoned")).toEqual(state);
    expect(evaluation.mistakes[0]?.step).toBe("walkthrough");
    expect(clock.now().toISOString()).toBe("2026-04-08T00:00:00.000Z");
  });
  test("AC-2 applies spec-exact SM-2 transitions for clean assisted failed and abandoned outcomes", () => {
    const reviewState: SM2State = {
      intervalDays: 6,
      easeFactor: 2.5,
      round: 2,
    };

    expect(updateSM2(reviewState, "clean")).toEqual({
      intervalDays: 16,
      easeFactor: 2.6,
      round: 3,
    });

    expect(updateSM2(reviewState, "assisted")).toEqual({
      intervalDays: 9,
      easeFactor: 2.45,
      round: 3,
    });

    expect(updateSM2(reviewState, "failed")).toEqual({
      intervalDays: 1,
      easeFactor: 2.3,
      round: 0,
    });

    expect(updateSM2(reviewState, "abandoned")).toEqual(reviewState);
    expect(updateSM2({ intervalDays: 1, easeFactor: 2.5, round: 0 }, "clean")).toEqual({
      intervalDays: 1,
      easeFactor: 2.6,
      round: 1,
    });
    expect(updateSM2({ intervalDays: 1, easeFactor: 2.5, round: 1 }, "clean")).toEqual({
      intervalDays: 3,
      easeFactor: 2.6,
      round: 2,
    });
  });
  test("AC-3 derives the max interval from interview_date using the injected clock", () => {
    const clock = createClock("2026-04-08T00:00:00.000Z");

    expect(deriveMaxIntervalDays(undefined, clock)).toBe(30);
    expect(deriveMaxIntervalDays("2026-04-20T00:00:00.000Z", clock)).toBe(6);
    expect(deriveMaxIntervalDays("2026-05-20T00:00:00.000Z", clock)).toBe(14);
  });
  test("EC-1 clamps easeFactor to the 1.3 floor", () => {
    expect(
      updateSM2({ intervalDays: 8, easeFactor: 1.35, round: 3 }, "failed"),
    ).toEqual({
      intervalDays: 1,
      easeFactor: 1.3,
      round: 0,
    });

    expect(
      updateSM2({ intervalDays: 8, easeFactor: 1.32, round: 3 }, "assisted"),
    ).toEqual({
      intervalDays: 6,
      easeFactor: 1.3,
      round: 4,
    });
  });
  test("ERR-1 falls back to the default max interval for malformed or past interview dates", () => {
    const clock = createClock("2026-04-08T00:00:00.000Z");

    expect(deriveMaxIntervalDays("not-a-date", clock)).toBe(30);
    expect(deriveMaxIntervalDays("2026-04-07T00:00:00.000Z", clock)).toBe(30);
  });
});
