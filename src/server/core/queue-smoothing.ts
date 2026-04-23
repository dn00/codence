import { eq } from "drizzle-orm";
import type { AppDatabase } from "../persistence/db.js";
import { attempts, itemQueue, queue } from "../persistence/schema.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";

/**
 * Hard bounds on the adaptive daily cap. A cap of 1 still works (just means
 * the pile spreads wider). A cap of 30 is the upper guard against runaway
 * throughput dragging the cap into "treadmill" territory where even diligent
 * users can't keep up.
 */
export const MIN_DAILY_CAP = 1;
export const MAX_DAILY_CAP = 30;
const THROUGHPUT_WINDOW_DAYS = 7;
const COLD_START_ATTEMPT_THRESHOLD = 7;
const THROUGHPUT_MULTIPLIER = 1.5;
const FALLBACK_DAILY_CAP = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

interface SmoothScope {
  learnspaceId: string;
  userId: string;
  now: Date;
}

/**
 * Daily review cap tailored to this user on this learnspace. Cold start
 * (< 7 completed attempts) uses the learnspace's `defaultDailyCap`, which
 * encodes item-cost reality (DSA ~25 min → 5, long-form ~45 min → 3,
 * short-form math/trivia → larger). Once the user has meaningful history,
 * we switch to rolling-throughput: ceil(last7dAttempts / 7 × 1.5), clamped
 * to [MIN_DAILY_CAP, MAX_DAILY_CAP]. Throughput self-corrects for all three
 * variables (user pace, item cost, track intent) without config.
 */
export function resolveDailyCap(
  db: AppDatabase,
  { learnspaceId, userId, now }: SmoothScope,
  learnspaceConfig: Pick<LearnspaceConfig, "defaultDailyCap"> | null,
): number {
  const windowStart = now.getTime() - THROUGHPUT_WINDOW_DAYS * MS_PER_DAY;
  const completedInWindow = db
    .select()
    .from(attempts)
    .all()
    .filter(
      (row) =>
        row.learnspaceId === learnspaceId
        && row.userId === userId
        && row.completedAt !== null
        && row.outcome !== "abandoned"
        && new Date(row.completedAt).getTime() >= windowStart,
    ).length;

  const allCompleted = db
    .select()
    .from(attempts)
    .all()
    .filter(
      (row) =>
        row.learnspaceId === learnspaceId
        && row.userId === userId
        && row.completedAt !== null
        && row.outcome !== "abandoned",
    ).length;

  if (allCompleted < COLD_START_ATTEMPT_THRESHOLD) {
    const coldStart = learnspaceConfig?.defaultDailyCap ?? FALLBACK_DAILY_CAP;
    return Math.max(MIN_DAILY_CAP, Math.min(MAX_DAILY_CAP, coldStart));
  }

  const perDay = completedInWindow / THROUGHPUT_WINDOW_DAYS;
  const adaptive = Math.ceil(perDay * THROUGHPUT_MULTIPLIER);
  return Math.max(MIN_DAILY_CAP, Math.min(MAX_DAILY_CAP, adaptive));
}

/**
 * When an overdue backlog exceeds the daily cap, spread it forward across
 * upcoming days `cap` per day (earliest dueDate first → today, next batch →
 * tomorrow, …). Preserves priority order. Touches `item_queue` and `queue`
 * rows in tandem so skill- and item-level due counts stay consistent.
 *
 * Why: without smoothing, a user who skips a week returns to an N-item
 * "overdue" pile all due today — reads as shame-debt rather than practice.
 * Return-smoothing keeps the daily surface area constant and calibrated to
 * the user's actual throughput.
 *
 * No-op when the overdue count fits within a single day's cap — we only
 * intervene when the pile is truly overwhelming.
 */
export function smoothOverdueQueue(
  db: AppDatabase,
  scope: SmoothScope,
  cap: number,
): void {
  const dayStart = startOfUtcDay(scope.now).getTime();
  const nowIso = scope.now.toISOString();

  const overdueItemRows = db
    .select()
    .from(itemQueue)
    .all()
    .filter(
      (row) =>
        row.learnspaceId === scope.learnspaceId
        && row.userId === scope.userId
        && row.dueDate !== null
        && new Date(row.dueDate).getTime() < dayStart,
    )
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  if (overdueItemRows.length > cap) {
    for (let i = 0; i < overdueItemRows.length; i++) {
      const dayOffset = Math.floor(i / cap);
      const newDue = new Date(dayStart + dayOffset * MS_PER_DAY).toISOString();
      db.update(itemQueue)
        .set({ dueDate: newDue, updatedAt: nowIso })
        .where(eq(itemQueue.id, overdueItemRows[i].id))
        .run();
    }
  }

  const overdueSkillRows = db
    .select()
    .from(queue)
    .all()
    .filter(
      (row) =>
        row.learnspaceId === scope.learnspaceId
        && row.userId === scope.userId
        && row.dueDate !== null
        && new Date(row.dueDate).getTime() < dayStart,
    )
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  if (overdueSkillRows.length > cap) {
    for (let i = 0; i < overdueSkillRows.length; i++) {
      const dayOffset = Math.floor(i / cap);
      const newDue = new Date(dayStart + dayOffset * MS_PER_DAY).toISOString();
      db.update(queue)
        .set({ dueDate: newDue, updatedAt: nowIso })
        .where(eq(queue.id, overdueSkillRows[i].id))
        .run();
    }
  }
}
