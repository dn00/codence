import { eq } from "drizzle-orm";
import type { AppDatabase } from "../persistence/db.js";
import { attempts, items } from "../persistence/schema.js";
import type { EvaluationSeverity } from "../core/types.js";

export interface FailurePattern {
  type: string;
  skillId: string;
  count: number;
  lastSeenAt: string;
  lastSeenItemId: string | null;
  severity: EvaluationSeverity;
}

interface MistakeEntry {
  type: string;
  description?: string;
  step?: string;
}

interface AccumulatedPattern {
  count: number;
  lastSeenAt: string;
  lastSeenItemId: string | null;
  maxSeverity: EvaluationSeverity;
}

const SEVERITY_ORDER: Record<string, number> = {
  minor: 0,
  moderate: 1,
  critical: 2,
};

function maxSeverity(a: EvaluationSeverity, b: EvaluationSeverity): EvaluationSeverity {
  return (SEVERITY_ORDER[a] ?? 0) >= (SEVERITY_ORDER[b] ?? 0) ? a : b;
}

export function extractFailurePatterns(
  db: AppDatabase,
  skillId: string,
  learnspaceId: string,
  options?: { maxAttempts?: number; userId?: string },
): FailurePattern[] {
  const maxAttempts = options?.maxAttempts ?? 20;

  // Find items belonging to the target skill
  const skillItemIds = new Set(
    db.select().from(items).where(eq(items.learnspaceId, learnspaceId)).all()
      .filter((item) => Array.isArray(item.skillIds) && item.skillIds.includes(skillId))
      .map((item) => item.id),
  );

  const recentAttempts = db
    .select()
    .from(attempts)
    .where(eq(attempts.learnspaceId, learnspaceId))
    .all()
    .filter((a) =>
      a.completedAt !== null &&
      (options?.userId ? a.userId === options.userId : true) &&
      a.structuredEvaluation !== null &&
      skillItemIds.has(a.itemId),
    )
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, maxAttempts);

  const patterns = new Map<string, AccumulatedPattern>();

  for (const attempt of recentAttempts) {
    const evaluation = attempt.structuredEvaluation as Record<string, unknown> | null;
    if (!evaluation || typeof evaluation !== "object") continue;

    const mistakes = evaluation.mistakes;
    if (!Array.isArray(mistakes)) continue;

    const severity = (evaluation.severity as EvaluationSeverity) ?? "minor";

    for (const mistake of mistakes) {
      if (typeof mistake !== "object" || mistake === null) continue;
      const entry = mistake as MistakeEntry;
      if (typeof entry.type !== "string" || entry.type.trim().length === 0) continue;

      const existing = patterns.get(entry.type);
      if (existing) {
        existing.count += 1;
        if ((attempt.completedAt ?? "") > existing.lastSeenAt) {
          existing.lastSeenAt = attempt.completedAt ?? "";
          existing.lastSeenItemId = attempt.itemId;
        }
        existing.maxSeverity = maxSeverity(existing.maxSeverity, severity);
      } else {
        patterns.set(entry.type, {
          count: 1,
          lastSeenAt: attempt.completedAt ?? "",
          lastSeenItemId: attempt.itemId,
          maxSeverity: severity,
        });
      }
    }
  }

  return [...patterns.entries()]
    .map(([type, p]) => ({
      type,
      skillId,
      count: p.count,
      lastSeenAt: p.lastSeenAt,
      lastSeenItemId: p.lastSeenItemId,
      severity: p.maxSeverity,
    }))
    .sort((a, b) => b.count - a.count);
}
