import { eq } from "drizzle-orm";
import type { AppDatabase } from "../persistence/db.js";
import { attempts, items } from "../persistence/schema.js";

// SecondaryEvidence is the derived aggregate of attempts where a given
// skill appears in items.skillIds at position 1 or later (not the primary
// slot). Secondary skills are not written to skill_confidence on completion;
// their contribution to a skill's blended score is computed on the write
// path by walking the attempts table through loadSecondaryEvidence.
export interface SecondaryEvidence {
  cleanCount: number;
  assistedCount: number;
  failedCount: number;
  totalCount: number;
  lastPracticedAt: string | null;
}

export function loadSecondaryEvidence(
  db: AppDatabase,
  skillId: string,
  learnspaceId: string,
  userId: string,
): SecondaryEvidence {
  // Drizzle/SQLite does not have a clean json_each path for this in the
  // project's current setup, so filter item rows in JS. With a single-user
  // local-first app and <100 items per learnspace the cost is negligible.
  const itemsWithSkillAsSecondary = db
    .select()
    .from(items)
    .where(eq(items.learnspaceId, learnspaceId))
    .all()
    .filter((item) => {
      const skillIds = item.skillIds ?? [];
      return skillIds.indexOf(skillId) > 0;
    });

  if (itemsWithSkillAsSecondary.length === 0) {
    return {
      cleanCount: 0,
      assistedCount: 0,
      failedCount: 0,
      totalCount: 0,
      lastPracticedAt: null,
    };
  }

  const secondaryItemIds = new Set(itemsWithSkillAsSecondary.map((item) => item.id));

  const secondaryAttempts = db
    .select()
    .from(attempts)
    .where(eq(attempts.learnspaceId, learnspaceId))
    .all()
    .filter(
      (attempt) =>
        attempt.userId === userId &&
        attempt.completedAt !== null &&
        attempt.outcome !== null &&
        attempt.outcome !== "abandoned" &&
        secondaryItemIds.has(attempt.itemId),
    );

  let cleanCount = 0;
  let assistedCount = 0;
  let failedCount = 0;
  let lastPracticedAt: string | null = null;

  for (const attempt of secondaryAttempts) {
    if (attempt.outcome === "clean") cleanCount += 1;
    else if (attempt.outcome === "assisted") assistedCount += 1;
    else if (attempt.outcome === "failed") failedCount += 1;

    if (
      attempt.completedAt !== null &&
      (lastPracticedAt === null || attempt.completedAt > lastPracticedAt)
    ) {
      lastPracticedAt = attempt.completedAt;
    }
  }

  return {
    cleanCount,
    assistedCount,
    failedCount,
    totalCount: cleanCount + assistedCount + failedCount,
    lastPracticedAt,
  };
}
