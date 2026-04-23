import type {
  RuntimeScenarioV4,
  TrackPolicyV4,
} from "./benchmark-schema.js";

export interface RuntimeDecisionV4 {
  sessionIndex: number;
  difficultyBand: "easy" | "medium" | "hard";
  reviewShare: number;
  newShare: number;
  generatedAllowed: boolean;
  scopeSkillIds: string[];
  plannedMinutes: number | null;
}

export interface RuntimeScenarioResultV4 {
  scenarioId: string;
  passed: boolean;
  reasons: string[];
  decisions: RuntimeDecisionV4[];
}

const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const;

function lowerDifficulty(value: RuntimeDecisionV4["difficultyBand"]): RuntimeDecisionV4["difficultyBand"] {
  const index = DIFFICULTY_ORDER.indexOf(value);
  return DIFFICULTY_ORDER[Math.max(index - 1, 0)];
}

function raiseDifficulty(value: RuntimeDecisionV4["difficultyBand"]): RuntimeDecisionV4["difficultyBand"] {
  const index = DIFFICULTY_ORDER.indexOf(value);
  return DIFFICULTY_ORDER[Math.min(index + 1, DIFFICULTY_ORDER.length - 1)];
}

function initialDifficulty(policy: TrackPolicyV4): RuntimeDecisionV4["difficultyBand"] {
  if (policy.difficulty.mode === "fixed") {
    return policy.difficulty.targetBand ?? "medium";
  }
  if (policy.difficulty.mode === "staged") {
    return policy.difficulty.stages?.[0]?.targetBand ?? "easy";
  }
  return policy.difficulty.targetBand ?? policy.difficulty.minBand ?? "medium";
}

function defaultPlannedMinutes(policy: TrackPolicyV4, weekend = false): number | null {
  return weekend
    ? (policy.pacing.weekendMinutes ?? policy.pacing.weekdayMinutes ?? null)
    : (policy.pacing.weekdayMinutes ?? policy.pacing.weekendMinutes ?? null);
}

export function simulatePolicyRuntimeV4(
  policy: TrackPolicyV4,
  scenario: RuntimeScenarioV4,
): RuntimeDecisionV4[] {
  const decisions: RuntimeDecisionV4[] = [];
  let currentDifficulty = initialDifficulty(policy);
  let reviewShare = policy.sessionComposition.reviewShare ?? 0.6;
  let newShare = policy.sessionComposition.newShare ?? 0.4;

  for (const step of scenario.trace) {
    const recent = scenario.trace.filter((traceStep) => traceStep.sessionIndex <= step.sessionIndex).slice(-3);
    const allFails = recent.length === 3 && recent.every((traceStep) => traceStep.outcomes.some((outcome) => outcome.result === "fail"));
    const allSuccess = recent.length === 3 && recent.every((traceStep) => traceStep.outcomes.every((outcome) => outcome.result === "success"));

    if (allFails && (policy.adaptation.onRepeatedFailures === "reduce_difficulty" || policy.adaptation.onRepeatedFailures === "rehab_focus")) {
      currentDifficulty = lowerDifficulty(currentDifficulty);
      reviewShare = Math.min(0.85, reviewShare + 0.15);
      newShare = Math.max(0.15, 1 - reviewShare);
    }

    if (allSuccess && policy.adaptation.onCleanStreak === "advance_difficulty") {
      currentDifficulty = raiseDifficulty(currentDifficulty);
    }

    if (
      (step.overdueCount ?? 0) >= 5
      && (policy.adaptation.onOverdueLoad === "review_focus" || policy.adaptation.onOverdueLoad === "reduce_new_material")
    ) {
      reviewShare = Math.max(reviewShare, policy.sessionComposition.reviewShare ?? 0.75);
      reviewShare = Math.max(reviewShare, 0.75);
      newShare = Math.min(newShare, policy.sessionComposition.newShare ?? 0.25);
      newShare = Math.min(newShare, 0.25);
    }

    if (policy.difficulty.mode === "staged" && policy.difficulty.stages) {
      const stage = [...policy.difficulty.stages]
        .sort((a, b) => a.afterSessions - b.afterSessions)
        .filter((candidate) => candidate.afterSessions <= step.sessionIndex)
        .at(-1);
      if (stage?.targetBand) {
        currentDifficulty = stage.targetBand;
      } else if (stage?.maxBand === "medium" && currentDifficulty === "hard") {
        currentDifficulty = "medium";
      }
    }

    decisions.push({
      sessionIndex: step.sessionIndex + 1,
      difficultyBand: currentDifficulty,
      reviewShare,
      newShare,
      generatedAllowed: Boolean(
        policy.contentSource.generatedAllowed
        && (!policy.contentSource.generatedOnlyAsFallback || step.seedPoolLow),
      ),
      scopeSkillIds: policy.scope.includeSkillIds.filter((skillId) => !policy.scope.excludeSkillIds.includes(skillId)),
      plannedMinutes: defaultPlannedMinutes(policy, step.sessionIndex % 7 === 0),
    });
  }

  if (scenario.trace.length === 0) {
    decisions.push({
      sessionIndex: 1,
      difficultyBand: currentDifficulty,
      reviewShare,
      newShare,
      generatedAllowed: Boolean(policy.contentSource.generatedAllowed && !policy.contentSource.generatedOnlyAsFallback),
      scopeSkillIds: policy.scope.includeSkillIds.filter((skillId) => !policy.scope.excludeSkillIds.includes(skillId)),
      plannedMinutes: defaultPlannedMinutes(policy, false),
    });
  }

  return decisions;
}

export function evaluateRuntimeScenarioV4(
  policy: TrackPolicyV4,
  scenario: RuntimeScenarioV4,
): RuntimeScenarioResultV4 {
  const decisions = simulatePolicyRuntimeV4(policy, scenario);
  const reasons: string[] = [];

  for (const invariant of scenario.invariants) {
    switch (invariant.kind) {
      case "excluded_skills_never_appear":
        if (decisions.some((decision) => invariant.skillIds.some((skillId) => decision.scopeSkillIds.includes(skillId)))) {
          reasons.push("excluded skills appeared in planned scope");
        }
        break;
      case "difficulty_reduces_after_failure_streak": {
        const decision = decisions.find((entry) => entry.sessionIndex === invariant.bySession);
        if (!decision || decision.difficultyBand === "medium" || decision.difficultyBand === "hard") {
          reasons.push("difficulty did not reduce after failure streak");
        }
        break;
      }
      case "difficulty_increases_after_clean_streak": {
        const decision = decisions.find((entry) => entry.sessionIndex === invariant.bySession);
        if (!decision || decision.difficultyBand === "easy") {
          reasons.push("difficulty did not increase after clean streak");
        }
        break;
      }
      case "review_share_increases_after_overdue_load": {
        const decision = decisions.find((entry) => entry.sessionIndex === invariant.bySession);
        if (!decision || decision.reviewShare < (invariant.minimumReviewShare ?? 0.75)) {
          reasons.push("review share did not increase after overdue load");
        }
        break;
      }
      case "weekend_minutes_exceed_weekday_minutes": {
        const weekendDecision = decisions.find((entry) => entry.sessionIndex === invariant.weekendSession);
        const weekdayDecision = decisions.find((entry) => entry.sessionIndex === invariant.weekdaySession);
        if (!weekendDecision || !weekdayDecision || (weekendDecision.plannedMinutes ?? 0) <= (weekdayDecision.plannedMinutes ?? 0)) {
          reasons.push("weekend pacing did not stay above weekday pacing");
        }
        break;
      }
      case "generation_only_when_allowed":
        if (decisions.some((decision, index) => decision.generatedAllowed && !(scenario.trace[index]?.seedPoolLow ?? false))) {
          reasons.push("generation enabled before fallback condition");
        }
        break;
      case "time_budget_respected":
        if (decisions.some((decision) => decision.plannedMinutes !== null && policy.pacing.maxDailyMinutes !== undefined && policy.pacing.maxDailyMinutes !== null && decision.plannedMinutes > policy.pacing.maxDailyMinutes)) {
          reasons.push("planned minutes exceeded max daily budget");
        }
        break;
    }
  }

  return {
    scenarioId: scenario.id,
    passed: reasons.length === 0,
    reasons,
    decisions,
  };
}
