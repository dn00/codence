import { eq } from "drizzle-orm";
import { loadCoachMemorySnapshot } from "../ai/coach-memory.js";
import type { AppDatabase } from "../persistence/db.js";
import { attempts, items, skills, skillConfidence, queue } from "../persistence/schema.js";

export type HelpDependenceLabel = "independent" | "guided" | "help-heavy";

export interface HelpDependence {
  avgHelpLevel: number;
  fullSolutionRate: number;
  stuckRate: number;
  label: HelpDependenceLabel;
}

export interface SkillDrilldown {
  skillId: string;
  name: string;
  score: number;
  totalAttempts: number;
  cleanSolves: number;
  assistedSolves: number;
  failedAttempts: number;
  trend: string | null;
  dueDate: string | null;
  items: Array<{
    itemId: string;
    title: string;
    difficulty: string;
    source: string;
    solveCount: number;
    lastOutcome: string | null;
  }>;
  /** @deprecated Use `items` instead */
  itemsPracticed: Array<{
    itemId: string;
    title: string;
    source: string;
    solveCount: number;
    lastOutcome: string | null;
  }>;
  commonMistakes: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  coachingInsights: string[];
  helpDependence: HelpDependence;
  behaviorSummary: string;
}

interface DrilldownInput {
  skillId: string;
  userId: string;
  learnspaceId: string;
}

export function getSkillDrilldown(
  db: AppDatabase,
  input: DrilldownInput,
): SkillDrilldown | null {
  const { skillId, userId, learnspaceId } = input;

  // Verify skill exists
  const skill = db.select().from(skills).where(eq(skills.id, skillId)).get();
  if (!skill) return null;

  // Get confidence data
  const confidence = db
    .select()
    .from(skillConfidence)
    .all()
    .find(
      (row) =>
        row.skillId === skillId &&
        row.userId === userId &&
        row.learnspaceId === learnspaceId,
    );

  // Get due date from queue
  const queueRow = db
    .select()
    .from(queue)
    .all()
    .find(
      (row) =>
        row.skillId === skillId &&
        row.userId === userId &&
        row.learnspaceId === learnspaceId,
    );

  // Find items for this skill
  const skillItems = db
    .select()
    .from(items)
    .where(eq(items.learnspaceId, learnspaceId))
    .all()
    .filter((item) => Array.isArray(item.skillIds) && item.skillIds.includes(skillId) && item.status !== "retired");

  const skillItemIds = new Set(skillItems.map((item) => item.id));
  const itemById = new Map(skillItems.map((item) => [item.id, item]));

  // Get completed attempts for items in this skill
  const skillAttempts = db
    .select()
    .from(attempts)
    .where(eq(attempts.learnspaceId, learnspaceId))
    .all()
    .filter(
      (a) =>
        a.userId === userId &&
        a.completedAt !== null &&
        a.outcome !== "abandoned" &&
        skillItemIds.has(a.itemId),
    )
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  // Items practiced: group by item, count attempts, get last outcome
  const itemStats = new Map<string, { solveCount: number; lastOutcome: string | null; lastAt: string }>();
  for (const attempt of skillAttempts) {
    const existing = itemStats.get(attempt.itemId);
    if (existing) {
      existing.solveCount += 1;
    } else {
      itemStats.set(attempt.itemId, {
        solveCount: 1,
        lastOutcome: attempt.outcome,
        lastAt: attempt.completedAt ?? "",
      });
    }
  }

  const itemsPracticed = [...itemStats.entries()].map(([itemId, stats]) => {
    const item = itemById.get(itemId);
    return {
      itemId,
      title: item?.title ?? itemId,
      source: item?.source ?? "unknown",
      solveCount: stats.solveCount,
      lastOutcome: stats.lastOutcome,
    };
  });

  // Build full items list: all items for this skill with attempt status
  const allItems = skillItems.map((item) => {
    const stats = itemStats.get(item.id);
    return {
      itemId: item.id,
      title: item.title,
      difficulty: item.difficulty ?? "medium",
      source: item.source ?? "seed",
      solveCount: stats?.solveCount ?? 0,
      lastOutcome: stats?.lastOutcome ?? null,
    };
  }).sort((a, b) => {
    // Practiced items first, then by title
    if (a.solveCount > 0 && b.solveCount === 0) return -1;
    if (a.solveCount === 0 && b.solveCount > 0) return 1;
    return a.title.localeCompare(b.title);
  });

  const coachMemory = loadCoachMemorySnapshot(db, skillId, learnspaceId, userId);
  const helpDependence = deriveHelpDependence(coachMemory.coachingPatterns);

  // Rolling window: last 10 attempts for performance display
  const ROLLING_WINDOW = 10;
  const recentAttempts = skillAttempts.slice(0, ROLLING_WINDOW);
  const recentTotal = recentAttempts.length;
  const recentClean = recentAttempts.filter((a) => a.outcome === "clean").length;
  const recentAssisted = recentAttempts.filter((a) => a.outcome === "assisted").length;
  const recentFailed = recentAttempts.filter((a) => a.outcome === "failed").length;

  const behaviorSummary = deriveBehaviorSummary(
    recentTotal,
    confidence?.trend ?? coachMemory.trend,
    helpDependence.label,
    coachMemory.commonMistakes.length,
  );

  return {
    skillId,
    name: skill.name,
    score: confidence?.score ?? 0,
    totalAttempts: recentTotal,
    cleanSolves: recentClean,
    assistedSolves: recentAssisted,
    failedAttempts: recentFailed,
    trend: confidence?.trend ?? coachMemory.trend,
    dueDate: queueRow?.dueDate ?? null,
    items: allItems,
    itemsPracticed,
    commonMistakes: coachMemory.commonMistakes,
    coachingInsights: coachMemory.recentInsights,
    helpDependence,
    behaviorSummary,
  };
}

function deriveHelpDependence(patterns: {
  avgHelpLevel: number;
  fullSolutionRate: number;
  stuckRate: number;
}): HelpDependence {
  let label: HelpDependenceLabel = "independent";
  if (patterns.fullSolutionRate > 0.3 || patterns.avgHelpLevel > 0.6) {
    label = "help-heavy";
  } else if (patterns.avgHelpLevel > 0.3 || patterns.stuckRate > 0.3) {
    label = "guided";
  }
  return {
    avgHelpLevel: patterns.avgHelpLevel,
    fullSolutionRate: patterns.fullSolutionRate,
    stuckRate: patterns.stuckRate,
    label,
  };
}

function deriveBehaviorSummary(
  totalAttempts: number,
  trend: string | null,
  helpLabel: HelpDependenceLabel,
  mistakeCount: number,
): string {
  if (totalAttempts === 0) {
    return "No practice history yet. Start a session to build signal.";
  }
  if (totalAttempts < 3) {
    return "Early practice — keep going to build a clearer picture.";
  }

  const parts: string[] = [];
  if (trend === "improving") parts.push("Trending upward");
  else if (trend === "declining") parts.push("Trending downward — focus here");
  else parts.push("Holding steady");

  if (helpLabel === "help-heavy") parts.push("relying heavily on coach guidance");
  else if (helpLabel === "guided") parts.push("using moderate coach support");
  else parts.push("solving mostly independently");

  if (mistakeCount > 0) parts.push(`${mistakeCount} recurring mistake pattern${mistakeCount > 1 ? "s" : ""} detected`);

  return parts.join(". ") + ".";
}
