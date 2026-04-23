import { eq } from "drizzle-orm";
import type { AppDatabase } from "../persistence/db.js";
import { attempts, items, skillConfidence } from "../persistence/schema.js";
import type {
  AttemptCoachingSummary,
  CoachingMetadata,
  EvaluationSeverity,
  SkillTrend,
  UserUnderstanding,
} from "../core/types.js";
import { extractFailurePatterns } from "./failure-patterns.js";
import { isCoachingMetadata } from "./coach-metadata.js";

const SKILL_TRENDS: SkillTrend[] = ["improving", "stable", "declining"];
const EVALUATION_SEVERITIES: EvaluationSeverity[] = [
  "minor",
  "moderate",
  "critical",
];
const USER_UNDERSTANDINGS: UserUnderstanding[] = [
  "confused",
  "partial",
  "solid",
  "strong",
];

export interface CoachMemorySnapshot {
  skillId: string;
  score: number;
  totalAttempts: number;
  cleanSolves: number;
  assistedSolves: number;
  failedAttempts: number;
  trend: SkillTrend | null;
  topMistakes: string[];
  commonMistakes: Array<{
    type: string;
    count: number;
    severity: EvaluationSeverity;
  }>;
  recentInsights: string[];
  coachingPatterns: {
    avgHelpLevel: number;
    fullSolutionRate: number;
    stuckRate: number;
    latestUnderstanding: UserUnderstanding | null;
    recurringNotableMistakes: string[];
  };
}

interface ParsedEvaluation {
  mistakes: Array<{ type: string }>;
  coachingSummary: string | null;
}

function isUserUnderstanding(value: unknown): value is UserUnderstanding {
  return (
    typeof value === "string" &&
    USER_UNDERSTANDINGS.includes(value as UserUnderstanding)
  );
}

function isSkillTrend(value: unknown): value is SkillTrend {
  return typeof value === "string" && SKILL_TRENDS.includes(value as SkillTrend);
}

function isEvaluationSeverity(value: unknown): value is EvaluationSeverity {
  return (
    typeof value === "string" &&
    EVALUATION_SEVERITIES.includes(value as EvaluationSeverity)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isAttemptCoachingSummary(value: unknown): value is AttemptCoachingSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.coach_turns === "number" &&
    Number.isFinite(record.coach_turns) &&
    typeof record.avg_help_level === "number" &&
    Number.isFinite(record.avg_help_level) &&
    typeof record.max_help_level === "number" &&
    Number.isFinite(record.max_help_level) &&
    typeof record.stuck_turns === "number" &&
    Number.isFinite(record.stuck_turns) &&
    typeof record.full_solution_turns === "number" &&
    Number.isFinite(record.full_solution_turns) &&
    (record.latest_understanding === null ||
      isUserUnderstanding(record.latest_understanding)) &&
    isStringArray(record.recurring_notable_mistakes) &&
    isStringArray(record.information_revealed)
  );
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function parseEvaluation(value: unknown): ParsedEvaluation | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const mistakes = Array.isArray(record.mistakes)
    ? record.mistakes.flatMap((entry) => {
        if (
          typeof entry !== "object" ||
          entry === null ||
          typeof (entry as Record<string, unknown>).type !== "string"
        ) {
          return [];
        }

        const type = ((entry as Record<string, unknown>).type as string).trim();
        return type ? [{ type }] : [];
      })
    : [];
  const coachingSummary =
    typeof record.coaching_summary === "string" && record.coaching_summary.trim()
      ? record.coaching_summary.trim()
      : null;

  return {
    mistakes,
    coachingSummary,
  };
}

function parsePersistedTrend(value: unknown): SkillTrend | null {
  return isSkillTrend(value) ? value : null;
}

function scoreOutcome(outcome: string): number | null {
  if (outcome === "clean") return 2;
  if (outcome === "assisted") return 1;
  if (outcome === "failed") return 0;
  return null;
}

export function deriveSkillTrend(
  outcomes: string[],
  persistedTrend: SkillTrend | null,
): SkillTrend | null {
  const scored = outcomes
    .map((outcome) => scoreOutcome(outcome))
    .filter((value): value is number => value !== null);

  if (scored.length < 4) {
    return persistedTrend;
  }

  const latestWindow = scored.slice(0, 3);
  const previousWindow = scored.slice(3, 6);

  if (previousWindow.length === 0) {
    return persistedTrend;
  }

  const delta = average(latestWindow) - average(previousWindow);
  if (delta >= 0.5) {
    return "improving";
  }
  if (delta <= -0.5) {
    return "declining";
  }
  return "stable";
}

export function createEmptyAttemptCoachingSummary(): AttemptCoachingSummary {
  return {
    coach_turns: 0,
    avg_help_level: 0,
    max_help_level: 0,
    stuck_turns: 0,
    full_solution_turns: 0,
    latest_understanding: null,
    recurring_notable_mistakes: [],
    information_revealed: [],
  };
}

export function createEmptyCoachMemorySnapshot(
  skillId: string,
  persisted?: {
    score?: number;
    totalAttempts?: number;
    cleanSolves?: number;
    assistedSolves?: number;
    failedAttempts?: number;
    trend?: string | null;
  },
): CoachMemorySnapshot {
  return {
    skillId,
    score: persisted?.score ?? 0,
    totalAttempts: persisted?.totalAttempts ?? 0,
    cleanSolves: persisted?.cleanSolves ?? 0,
    assistedSolves: persisted?.assistedSolves ?? 0,
    failedAttempts: persisted?.failedAttempts ?? 0,
    trend: parsePersistedTrend(persisted?.trend ?? null),
    topMistakes: [],
    commonMistakes: [],
    recentInsights: [],
    coachingPatterns: {
      avgHelpLevel: 0,
      fullSolutionRate: 0,
      stuckRate: 0,
      latestUnderstanding: null,
      recurringNotableMistakes: [],
    },
  };
}

export function extractCoachingMetadataEntries(
  rawMessages: unknown[] | null | undefined,
): CoachingMetadata[] {
  if (!Array.isArray(rawMessages)) {
    return [];
  }

  const metadataEntries: CoachingMetadata[] = [];

  for (const message of rawMessages) {
    if (typeof message !== "object" || message === null) {
      continue;
    }

    const record = message as Record<string, unknown>;
    if (record.role !== "assistant" || !isCoachingMetadata(record.metadata)) {
      continue;
    }

    metadataEntries.push(record.metadata);
  }

  return metadataEntries;
}

export function summarizeAttemptCoaching(
  metadataEntries: CoachingMetadata[],
): AttemptCoachingSummary {
  if (metadataEntries.length === 0) {
    return createEmptyAttemptCoachingSummary();
  }

  const notableMistakeCounts = new Map<string, number>();
  const informationRevealed = new Set<string>();
  let helpLevelTotal = 0;
  let maxHelpLevel = 0;
  let stuckTurns = 0;
  let fullSolutionTurns = 0;

  for (const metadata of metadataEntries) {
    helpLevelTotal += metadata.help_level;
    maxHelpLevel = Math.max(maxHelpLevel, metadata.help_level);
    if (metadata.user_appears_stuck) {
      stuckTurns += 1;
    }
    if (metadata.gave_full_solution) {
      fullSolutionTurns += 1;
    }
    for (const revealed of metadata.information_revealed) {
      informationRevealed.add(revealed);
    }

    const notableMistake = metadata.notable_mistake?.trim();
    if (notableMistake) {
      notableMistakeCounts.set(
        notableMistake,
        (notableMistakeCounts.get(notableMistake) ?? 0) + 1,
      );
    }
  }

  const recurringNotableMistakes = [...notableMistakeCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([mistake]) => mistake);

  return {
    coach_turns: metadataEntries.length,
    avg_help_level: roundMetric(helpLevelTotal / metadataEntries.length),
    max_help_level: roundMetric(maxHelpLevel),
    stuck_turns: stuckTurns,
    full_solution_turns: fullSolutionTurns,
    latest_understanding:
      metadataEntries[metadataEntries.length - 1]?.user_understanding ?? null,
    recurring_notable_mistakes: recurringNotableMistakes,
    information_revealed: [...informationRevealed].sort((a, b) =>
      a.localeCompare(b),
    ),
  };
}

export function buildAttemptCoachingSummary(
  rawMessages: unknown[] | null | undefined,
): AttemptCoachingSummary {
  return summarizeAttemptCoaching(extractCoachingMetadataEntries(rawMessages));
}

export function loadCoachMemorySnapshot(
  db: AppDatabase,
  skillId: string,
  learnspaceId: string,
  userId: string,
): CoachMemorySnapshot {
  const confidence = db
    .select()
    .from(skillConfidence)
    .all()
    .find(
      (row) =>
        row.learnspaceId === learnspaceId &&
        row.userId === userId &&
        row.skillId === skillId,
    );
  const snapshot = createEmptyCoachMemorySnapshot(skillId, confidence);

  const skillItems = db
    .select()
    .from(items)
    .where(eq(items.learnspaceId, learnspaceId))
    .all()
    .filter((item) => Array.isArray(item.skillIds) && item.skillIds.includes(skillId));

  if (skillItems.length === 0) {
    return snapshot;
  }

  const skillItemIds = new Set(skillItems.map((item) => item.id));
  const primaryItemIds = new Set(
    skillItems
      .filter((item) => item.skillIds?.[0] === skillId)
      .map((item) => item.id),
  );
  const relevantAttempts = db
    .select()
    .from(attempts)
    .where(eq(attempts.learnspaceId, learnspaceId))
    .all()
    .filter(
      (attempt) =>
        attempt.userId === userId &&
        attempt.completedAt !== null &&
        attempt.outcome !== "abandoned" &&
        skillItemIds.has(attempt.itemId),
    )
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""));

  const commonMistakes = extractFailurePatterns(db, skillId, learnspaceId, {
    userId,
  }).map((pattern) => ({
    type: pattern.type,
    count: pattern.count,
    severity: pattern.severity,
  }));

  const topMistakes = commonMistakes.slice(0, 3).map((mistake) => mistake.type);
  const recentInsights: string[] = [];
  const recurringMistakeCounts = new Map<string, number>();
  let weightedHelpSum = 0;
  let totalCoachTurns = 0;
  let totalFullSolutionTurns = 0;
  let totalStuckTurns = 0;
  let latestUnderstanding: UserUnderstanding | null = null;

  for (const attempt of relevantAttempts) {
    const evaluation = parseEvaluation(attempt.structuredEvaluation);
    if (evaluation?.coachingSummary && recentInsights.length < 3) {
      recentInsights.push(evaluation.coachingSummary);
    }

    if (!isAttemptCoachingSummary(attempt.coachingMetadata)) {
      continue;
    }

    const summary = attempt.coachingMetadata;
    totalCoachTurns += summary.coach_turns;
    weightedHelpSum += summary.avg_help_level * summary.coach_turns;
    totalFullSolutionTurns += summary.full_solution_turns;
    totalStuckTurns += summary.stuck_turns;
    if (latestUnderstanding === null && summary.latest_understanding !== null) {
      latestUnderstanding = summary.latest_understanding;
    }

    for (const mistake of summary.recurring_notable_mistakes) {
      recurringMistakeCounts.set(
        mistake,
        (recurringMistakeCounts.get(mistake) ?? 0) + 1,
      );
    }
  }

  const recurringNotableMistakes = [...recurringMistakeCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([mistake]) => mistake);

  const primaryOutcomes = relevantAttempts
    .filter((attempt) => primaryItemIds.has(attempt.itemId))
    .map((attempt) => attempt.outcome ?? "");
  const trend = deriveSkillTrend(primaryOutcomes, snapshot.trend);

  return {
    ...snapshot,
    trend,
    topMistakes,
    commonMistakes,
    recentInsights,
    coachingPatterns: {
      avgHelpLevel:
        totalCoachTurns > 0 ? roundMetric(weightedHelpSum / totalCoachTurns) : 0,
      fullSolutionRate:
        totalCoachTurns > 0
          ? roundMetric(totalFullSolutionTurns / totalCoachTurns)
          : 0,
      stuckRate:
        totalCoachTurns > 0 ? roundMetric(totalStuckTurns / totalCoachTurns) : 0,
      latestUnderstanding,
      recurringNotableMistakes,
    },
  };
}
