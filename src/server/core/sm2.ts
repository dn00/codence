import type { PracticeClock, PracticeOutcome, SM2State } from "./types.js";

export const DEFAULT_MAX_INTERVAL_DAYS = 30;
export const MIN_EASE_FACTOR = 1.3;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function updateSM2(
  state: SM2State,
  outcome: PracticeOutcome,
  maxIntervalDays: number = DEFAULT_MAX_INTERVAL_DAYS,
): SM2State {
  if (outcome === "abandoned") {
    return { ...state };
  }

  if (outcome === "failed") {
    return {
      intervalDays: 1,
      easeFactor: Math.max(MIN_EASE_FACTOR, state.easeFactor - 0.2),
      round: 0,
    };
  }

  const qualityMultiplier = outcome === "clean" ? 1.0 : 0.6;
  const easeAdjustment = outcome === "clean" ? 0.1 : -0.05;
  const easeFactor = Math.max(MIN_EASE_FACTOR, state.easeFactor + easeAdjustment);

  let intervalDays: number;
  if (state.round === 0) {
    intervalDays = 1;
  } else if (state.round === 1) {
    intervalDays = 3;
  } else {
    intervalDays = Math.round(state.intervalDays * easeFactor * qualityMultiplier);
  }

  return {
    intervalDays: Math.min(intervalDays, maxIntervalDays),
    easeFactor,
    round: state.round + 1,
  };
}

export function deriveMaxIntervalDays(
  interviewDate: string | null | undefined,
  clock: PracticeClock,
): number {
  if (!interviewDate) {
    return DEFAULT_MAX_INTERVAL_DAYS;
  }

  const parsedInterviewDate = new Date(interviewDate);
  const interviewTime = parsedInterviewDate.getTime();

  if (Number.isNaN(interviewTime)) {
    return DEFAULT_MAX_INTERVAL_DAYS;
  }

  const daysUntilInterview =
    (startOfUtcDay(parsedInterviewDate).getTime() - startOfUtcDay(clock.now()).getTime()) /
    MILLISECONDS_PER_DAY;
  if (daysUntilInterview <= 0) {
    return DEFAULT_MAX_INTERVAL_DAYS;
  }

  return Math.min(14, daysUntilInterview / 2);
}
