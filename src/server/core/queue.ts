import { eq } from "drizzle-orm";
import { loadCoachMemorySnapshot } from "../ai/coach-memory.js";
import type { AppDatabase } from "../persistence/db.js";
import { abandonSession, createSession, saveCoachRuntimeState, type SessionDetail } from "./sessions.js";
import {
  attempts,
  artifactLineage,
  itemQueue,
  items,
  queue,
  sessions,
  skillConfidence,
  skills,
} from "../persistence/schema.js";
import type { PracticeOutcome } from "./types.js";
import { findLearnspaceRecord } from "../learnspaces/runtime.js";
import { createSelectionEventId, recordSelectionEvent } from "./events.js";
import {
  resolveAllowedDifficultiesForTarget,
  resolveNextSelection,
  resolveSkillScope,
} from "./selection-pipeline.js";
import { planNextSession } from "../tracks/planner.js";
import {
  ensureTrackRuntimeState,
  getTrackRuntimeState,
  recordPlannerDecisionEvent,
  saveTrackRuntimeState,
} from "../tracks/runtime-state.js";
import { ensureSystemTracks, getActiveTrack, listLearnspaceTracks } from "../tracks/service.js";
import type { LearnspaceTrackSummary, ResolvedTrackContext } from "../tracks/types.js";
import { resolveDailyCap, smoothOverdueQueue } from "./queue-smoothing.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import {
  type QueueDependencies,
  type QueueEmptyResult,
  type QueueScopeInput,
  type QueueSelection,
} from "./selection-types.js";
export type {
  QueueDependencies,
  QueueEmptyResult,
  QueueScopeInput,
  QueueSelection,
} from "./selection-types.js";

export interface ProgressSummary {
  learnspace: {
    id: string;
    name: string;
    activeTag: string | null;
    activeTrackId: string | null;
    activeTrack: LearnspaceTrackSummary | null;
    interviewDate: string | null;
    dueTodayCount: number;
    overdueCount: number;
  };
  tracks: LearnspaceTrackSummary[];
  trackAnalytics: Array<{
    trackId: string | null;
    trackName: string | null;
    completedAttempts: number;
    generatedAttempts: number;
    lastAttemptAt: string | null;
  }>;
  skills: Array<{
    skillId: string;
    name: string;
    score: number;
    totalAttempts: number;
    trend: string | null;
    dueDate: string | null;
    lastOutcome: PracticeOutcome | null;
    totalProblems: number;
    completedProblems: number;
  }>;
  recentAttempts: Array<{
    attemptId: string;
    itemTitle: string;
    outcome: PracticeOutcome | null;
    startedAt: string;
    completedAt: string | null;
    primarySkillId: string;
    trackId: string | null;
    trackName: string | null;
    schedulerIds: string[];
    selectionSource: string | null;
    generated: boolean;
    generatedFromArtifactId: string | null;
    itemSource: string;
    itemStatus: string;
    generatedForSkillId: string | null;
    generatedForTrackId: string | null;
  }>;
  queueItems: Array<{
    itemId: string;
    itemTitle: string;
    skillId: string;
    skillName: string;
    difficulty: string;
    source: string;
    dueDate: string | null;
    lastOutcome: string | null;
    round: number;
  }>;
  estimatedMinutes: number | null;
  insightsSummary: {
    strongestSkillId: string | null;
    weakestSkillId: string | null;
    mostGuidanceNeededSkillId: string | null;
    improvingSkillCount: number;
    decliningSkillCount: number;
  };
}

export interface QueueResolvedResult {
  type: "selection";
  session: SessionDetail;
  selection: QueueSelection;
}

export type QueueSelectionResult = QueueResolvedResult | QueueEmptyResult;

export interface SkipInput {
  sessionId: string;
  trackId?: string;
}

const STALE_SESSION_MS = 24 * 60 * 60 * 1000;
const QUEUE_EMPTY_RESULT: QueueEmptyResult = {
  type: "empty",
  code: "queue_empty",
  message: "No valid queue candidate could be resolved",
};

function isQueueEmptyResult(value: QueueSelection | QueueEmptyResult): value is QueueEmptyResult {
  return "type" in value && value.type === "empty";
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function nextUtcDay(date: Date): Date {
  return new Date(startOfUtcDay(date).getTime() + 24 * 60 * 60 * 1000);
}

function abandonOpenSessions(deps: QueueDependencies, scope: QueueScopeInput): void {
  const { db, now, coachRuntime } = deps;
  const openSessions = db
    .select()
    .from(sessions)
    .all()
    .filter(
      (session) =>
        session.learnspaceId === scope.learnspaceId &&
        session.userId === scope.userId &&
        (session.status === "created" || session.status === "in_progress"),
    )
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt));

  for (const session of openSessions) {
    const startedAt = new Date(session.startedAt);
    if (
      session.status === "in_progress" ||
      session.status === "created" ||
      now().getTime() - startedAt.getTime() >= STALE_SESSION_MS
    ) {
      // Release provider-side coach runtime session (best-effort, no-throw)
      if (coachRuntime) {
        const runtimeState = session.coachRuntimeState as { runtimeSessionId?: string } | null;
        coachRuntime.releaseSession({
          appSessionId: session.id,
          runtimeSessionId: runtimeState?.runtimeSessionId ?? null,
        }).catch(() => {});
      }
      try {
        saveCoachRuntimeState(db, { sessionId: session.id, state: null });
        abandonSession({ db, now }, { sessionId: session.id });
      } catch {
        // Session may have been deleted (e.g., by skill reset) — skip
      }
    }
  }
}

export async function startNextQueueSession(
  dependencies: QueueDependencies,
  scope: QueueScopeInput,
): Promise<QueueSelectionResult> {
  ensureSystemTracks(dependencies.db, {
    userId: scope.userId,
    learnspaceId: scope.learnspaceId,
    now: dependencies.now,
  });

  const smoothingScope = {
    learnspaceId: scope.learnspaceId,
    userId: scope.userId,
    now: dependencies.now(),
  };
  const smoothingLearnspace = findLearnspaceRecord(dependencies.db, scope.learnspaceId);
  const smoothingCap = resolveDailyCap(
    dependencies.db,
    smoothingScope,
    smoothingLearnspace.config as Pick<LearnspaceConfig, "defaultDailyCap">,
  );
  smoothOverdueQueue(dependencies.db, smoothingScope, smoothingCap);

  abandonOpenSessions(dependencies, scope);

  let sessionPlan = scope.sessionPlan;
  let plannerEvent = null;
  let selectedTrack: LearnspaceTrackSummary | null = null;
  if (scope.trackId) {
    const activeTrack = getActiveTrack(
      dependencies.db,
      {
        userId: scope.userId,
        learnspace: findLearnspaceRecord(dependencies.db, scope.learnspaceId),
      },
    );
    selectedTrack = listLearnspaceTracks(dependencies.db, scope.userId, scope.learnspaceId)
      .find((track) => track.id === scope.trackId) ?? activeTrack;
    const runtimeState = ensureTrackRuntimeState(dependencies.db, {
      track: selectedTrack,
      learnspaceId: scope.learnspaceId,
      userId: scope.userId,
      now: dependencies.now,
    });
    const planned = planNextSession(dependencies, {
      userId: scope.userId,
      learnspaceId: scope.learnspaceId,
      trackId: scope.trackId,
      runtimeState,
      targetSkillId: scope.targetSkillId,
      targetItemId: scope.targetItemId,
      forceGenerated: scope.forceGenerated,
    });
    sessionPlan = planned.sessionPlan;
    plannerEvent = planned.plannerEvent;
  }

  const selectionResult = await resolveNextSelection(dependencies, {
    ...scope,
    sessionPlan,
  });
  if (isQueueEmptyResult(selectionResult)) {
    return selectionResult;
  }
  const selection = selectionResult;
  const selectionEventId = createSelectionEventId();

  const session = createSession(dependencies, {
    userId: scope.userId,
    learnspaceId: scope.learnspaceId,
    itemId: selection.item.id,
    selectionContext: {
      selectionEventId,
      trackId: selection.trackId,
      sessionPlan: sessionPlan ?? null,
      selectionReason: selection.selectionReason,
      item: {
        id: selection.item.id,
        title: selection.item.title,
        source: selection.item.source,
        status: selection.item.status,
      },
    },
  });
  recordSelectionEvent(dependencies.db, {
    id: selectionEventId,
    sessionId: session.sessionId,
    attemptId: session.attemptId,
    userId: scope.userId,
    learnspaceId: scope.learnspaceId,
    selection,
    createdAt: session.startedAt,
  });

  if (scope.trackId && sessionPlan && plannerEvent) {
    const existingState = ensureTrackRuntimeState(dependencies.db, {
      track: selectedTrack ?? getActiveTrack(dependencies.db, {
        userId: scope.userId,
        learnspace: findLearnspaceRecord(dependencies.db, scope.learnspaceId),
      }),
      learnspaceId: scope.learnspaceId,
      userId: scope.userId,
      now: dependencies.now,
    });
    saveTrackRuntimeState(dependencies.db, {
      trackId: scope.trackId,
      learnspaceId: scope.learnspaceId,
      userId: scope.userId,
      state: {
        ...existingState,
        lastPlannerDecision: {
          nodeId: sessionPlan.nodeId,
          sessionId: session.sessionId,
          sessionType: sessionPlan.sessionType,
          explanation: sessionPlan.explanation,
          decidedAt: session.startedAt,
        },
        updatedAt: session.startedAt,
      },
    });
    recordPlannerDecisionEvent(dependencies.db, {
      trackId: scope.trackId,
      learnspaceId: scope.learnspaceId,
      userId: scope.userId,
      sessionId: session.sessionId,
      event: {
        ...plannerEvent,
        sessionId: session.sessionId,
        createdAt: session.startedAt,
      },
    });
  }

  return {
    type: "selection",
    session,
    selection,
  };
}

export async function skipCurrentSessionAndSelectNext(
  deps: QueueDependencies,
  { sessionId, trackId }: SkipInput,
): Promise<QueueSelectionResult> {
  const { db, now } = deps;
  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) {
    throw new Error(`Unknown session: ${sessionId}`);
  }

  const item = db.select().from(items).where(eq(items.id, session.itemId)).get();
  const primarySkillId = item?.skillIds?.[0];
  if (!item || !primarySkillId) {
    return QUEUE_EMPTY_RESULT;
  }

  const queueRow = db
    .select()
    .from(queue)
    .all()
    .find(
      (row) =>
        row.learnspaceId === session.learnspaceId &&
        row.userId === session.userId &&
        row.skillId === primarySkillId,
    );
  if (queueRow) {
    db.update(queue)
      .set({
        skipCount: queueRow.skipCount + 1,
        updatedAt: now().toISOString(),
      })
      .where(eq(queue.id, queueRow.id))
      .run();
  }

  abandonSession({ db, now }, { sessionId });

  const inheritedTrackId = (() => {
    const selectionContext = session.selectionContext as { trackId?: unknown } | null;
    return typeof selectionContext?.trackId === "string" ? selectionContext.trackId : undefined;
  })();

  return startNextQueueSession(
    deps,
    {
      userId: session.userId,
      learnspaceId: session.learnspaceId,
      trackId: trackId ?? inheritedTrackId,
    },
  );
}

export function getProgressSummary(
  { db, now }: QueueDependencies,
  { userId, learnspaceId }: QueueScopeInput,
): ProgressSummary {
  const learnspace = findLearnspaceRecord(db, learnspaceId);
  const smoothingScope = { learnspaceId, userId, now: now() };
  const smoothingCap = resolveDailyCap(
    db,
    smoothingScope,
    learnspace.config as Pick<LearnspaceConfig, "defaultDailyCap">,
  );
  smoothOverdueQueue(db, smoothingScope, smoothingCap);
  const activeTrack = getActiveTrack(db, { userId, learnspace });
  const availableTracks = listLearnspaceTracks(db, userId, learnspaceId);
  const queueRows = db.select().from(queue).all().filter((row) => row.learnspaceId === learnspaceId && row.userId === userId);
  const confidenceRows = db
    .select()
    .from(skillConfidence)
    .all()
    .filter((row) => row.learnspaceId === learnspaceId && row.userId === userId);
  const skillRows = db.select().from(skills).all().filter((skill) => skill.learnspaceId === learnspaceId);
  const allItemRows = db.select().from(items).all().filter((item) => item.learnspaceId === learnspaceId);
  const itemRows = allItemRows.filter((item) => item.status !== "retired");
  const lineageRows = db.select().from(artifactLineage).all();
  const attemptsRows = db
    .select()
    .from(attempts)
    .all()
    .filter(
      (attempt) =>
        attempt.learnspaceId === learnspaceId &&
        attempt.userId === userId &&
        attempt.completedAt !== null &&
        attempt.outcome !== "abandoned",
    );
  const queueBySkillId = new Map(queueRows.map((row) => [row.skillId, row]));
  const skillById = new Map(skillRows.map((skill) => [skill.id, skill]));
  const itemById = new Map(itemRows.map((item) => [item.id, item]));
  const historicalItemById = new Map(allItemRows.map((item) => [item.id, item]));
  const lineageByArtifactId = new Map(lineageRows.map((lineage) => [lineage.artifactId, lineage]));
  const trackById = new Map(availableTracks.map((track) => [track.id, track]));

  // Count total and completed problems per skill
  const totalItemsBySkill = new Map<string, number>();
  const completedItemsBySkill = new Map<string, Set<string>>();
  for (const item of itemRows) {
    for (const skillId of item.skillIds ?? []) {
      totalItemsBySkill.set(skillId, (totalItemsBySkill.get(skillId) ?? 0) + 1);
    }
  }
  for (const attempt of attemptsRows) {
    const item = historicalItemById.get(attempt.itemId);
    if (item) {
      for (const skillId of item.skillIds ?? []) {
        if (!completedItemsBySkill.has(skillId)) completedItemsBySkill.set(skillId, new Set());
        completedItemsBySkill.get(skillId)!.add(attempt.itemId);
      }
    }
  }

  const dayStart = startOfUtcDay(now()).getTime();
  const dayEnd = nextUtcDay(now()).getTime();

  // Item-level queue data
  const activeItemIds = new Set(itemRows.map((item) => item.id));
  const itemQueueRows = db.select().from(itemQueue).all()
    .filter((row) => row.learnspaceId === learnspaceId && row.userId === userId && activeItemIds.has(row.itemId));
  const useItemQueue = itemQueueRows.length > 0;

  // Compute due counts from item-level queue when available
  const dueTodayCount = useItemQueue
    ? itemQueueRows.filter((row) => {
        if (!row.dueDate) return false;
        const dueTime = new Date(row.dueDate).getTime();
        return dueTime >= dayStart && dueTime < dayEnd;
      }).length
    : queueRows.filter((row) => {
        if (!row.dueDate) return false;
        const dueTime = new Date(row.dueDate).getTime();
        return dueTime >= dayStart && dueTime < dayEnd;
      }).length;

  const overdueCount = useItemQueue
    ? itemQueueRows.filter((row) => {
        if (!row.dueDate) return false;
        return new Date(row.dueDate).getTime() < dayStart;
      }).length
    : queueRows.filter((row) => {
        if (!row.dueDate) return false;
        return new Date(row.dueDate).getTime() < dayStart;
      }).length;

  // Derive earliest due date per skill from item queue
  const earliestDueBySkill = new Map<string, string>();
  for (const row of itemQueueRows) {
    if (!row.dueDate) continue;
    const existing = earliestDueBySkill.get(row.skillId);
    if (!existing || row.dueDate < existing) {
      earliestDueBySkill.set(row.skillId, row.dueDate);
    }
  }

  // Build queueItems, then order according to the active track's emphasis so
  // the Home queue preview reflects the current lens.
  const confidenceBySkillId = new Map(confidenceRows.map((row) => [row.skillId, row]));
  const difficultyRank: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
  const activeTrackState = getTrackRuntimeState(db, activeTrack.id);
  const activeNode = activeTrack.program?.nodes.find((node) => node.id === activeTrackState?.activeNodeId)
    ?? activeTrack.program?.nodes.find((node) => node.id === activeTrack.program?.entryNodeId)
    ?? null;
  const emphasis = activeNode?.plannerConfig?.queueStrategy
    ?? (
      activeTrack.spec?.archetype === "curriculum_progression" || activeTrack.spec?.archetype === "topic_sprint"
        ? "new_only"
        : activeTrack.spec?.archetype === "weakness_rehab"
          ? "weakest_first"
          : activeTrack.spec?.archetype === "foundations_rebuild"
            ? "foundations"
            : "scheduler"
    );
  const previewTrackContext: ResolvedTrackContext = {
    track: activeTrack,
    source: "active_track",
  };
  const previewSkillScope = resolveSkillScope(previewTrackContext, skillRows);
  const allowGenerated = activeNode?.plannerConfig?.generationAllowed
    ?? activeTrack.spec?.generationPolicy.allowGeneration
    ?? false;
  const effectiveDifficultyTarget = activeNode?.plannerConfig?.difficultyTarget
    ?? activeTrack.spec?.difficultyPolicy.defaultTarget
    ?? null;
  const allowedDifficulties = resolveAllowedDifficultiesForTarget(effectiveDifficultyTarget);

  const mappedQueueItems = itemQueueRows
    .filter((row) => row.dueDate !== null || row.round === 0)
    .map((row) => {
      const item = itemById.get(row.itemId);
      const skillName = skillById.get(row.skillId)?.name ?? row.skillId;
      return {
        itemId: row.itemId,
        itemTitle: item?.title ?? row.itemId,
        skillId: row.skillId,
        skillName,
        difficulty: item?.difficulty ?? "medium",
        source: item?.source ?? "unknown",
        dueDate: row.dueDate,
        lastOutcome: row.lastOutcome,
        round: row.round,
      };
    });

  // Apply track scope, generation, and difficulty filters. When the result
  // is empty we surface an empty preview rather than silently showing
  // out-of-scope items — the track is the lens; leaking items from other
  // skills / difficulties misleads the user about what the track is doing.
  // Foundations normally hides never-attempted items — it's a refresher
  // track, not an exploration one. But on a cold start (zero lifetime
  // attempts) the refresher filter leaves the queue empty, which reads
  // as "broken". Relax it until the user has practiced at least once.
  const userHasAttempted = attemptsRows.length > 0;
  const scopeAllows = (skillId: string) => previewSkillScope.inScope(skillId);
  const difficultyAllows = (difficulty: string) =>
    allowedDifficulties === null || allowedDifficulties.has(difficulty);
  const filteredQueueItems = mappedQueueItems.filter(
    (row) =>
      scopeAllows(row.skillId)
      && difficultyAllows(row.difficulty)
      && (allowGenerated || row.source !== "generated")
      && (emphasis !== "foundations" || row.round > 0 || !userHasAttempted),
  );
  const sourceForSort = filteredQueueItems;

  const compareDueDate = (
    a: (typeof mappedQueueItems)[number],
    b: (typeof mappedQueueItems)[number],
  ) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return 0;
  };

  const queueItems = [...sourceForSort].sort((a, b) => {
    let primary = 0;
    switch (emphasis) {
      case "weakest_first": {
        const aScore = confidenceBySkillId.get(a.skillId)?.score ?? 0;
        const bScore = confidenceBySkillId.get(b.skillId)?.score ?? 0;
        primary = aScore - bScore;
        break;
      }
      case "hardest_first": {
        const aScore = confidenceBySkillId.get(a.skillId)?.score ?? 0;
        const bScore = confidenceBySkillId.get(b.skillId)?.score ?? 0;
        primary = bScore - aScore;
        if (primary === 0) {
          primary = (difficultyRank[b.difficulty] ?? 2) - (difficultyRank[a.difficulty] ?? 2);
        }
        break;
      }
      case "foundations": {
        // Strongest skills first, easier items first — a warm-up lens.
        const aScore = confidenceBySkillId.get(a.skillId)?.score ?? 0;
        const bScore = confidenceBySkillId.get(b.skillId)?.score ?? 0;
        primary = bScore - aScore;
        if (primary === 0) {
          primary = (difficultyRank[a.difficulty] ?? 2) - (difficultyRank[b.difficulty] ?? 2);
        }
        break;
      }
      case "new_only": {
        const aNew = a.round === 0 ? 0 : 1;
        const bNew = b.round === 0 ? 0 : 1;
        primary = aNew - bNew;
        break;
      }
      case "scheduler":
      default:
        primary = 0;
        break;
    }
    if (primary !== 0) return primary;
    const byDue = compareDueDate(a, b);
    if (byDue !== 0) return byDue;
    return a.itemId.localeCompare(b.itemId);
  });

  const trackAnalytics = computeTrackAnalytics(attemptsRows, historicalItemById, trackById);

  return {
    learnspace: {
      id: learnspace.id,
      name: learnspace.name,
      activeTag: learnspace.activeTag,
      activeTrackId: activeTrack.id,
      activeTrack,
      interviewDate: learnspace.interviewDate,
      dueTodayCount,
      overdueCount,
    },
    tracks: availableTracks,
    trackAnalytics,
    skills: [...confidenceRows]
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }
        return left.skillId.localeCompare(right.skillId);
      })
      .map((row) => ({
        skillId: row.skillId,
        name: skillById.get(row.skillId)?.name ?? row.skillId,
        score: row.score,
        totalAttempts: row.totalAttempts,
        trend: row.trend,
        dueDate: useItemQueue
          ? (earliestDueBySkill.get(row.skillId) ?? null)
          : (queueBySkillId.get(row.skillId)?.dueDate ?? null),
        lastOutcome: (queueBySkillId.get(row.skillId)?.lastOutcome as PracticeOutcome | null) ?? null,
        totalProblems: totalItemsBySkill.get(row.skillId) ?? 0,
        completedProblems: completedItemsBySkill.get(row.skillId)?.size ?? 0,
      })),
    queueItems,
    recentAttempts: [...attemptsRows]
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .map((attempt) => {
        const item = historicalItemById.get(attempt.itemId);
        const lineage = lineageByArtifactId.get(attempt.itemId);
        const selectionContext = attempt.selectionContext as {
          trackId?: unknown;
          selectionReason?: {
            schedulerIds?: unknown;
            selectionSource?: unknown;
            generated?: unknown;
            generatedFromArtifactId?: unknown;
            trackSnapshot?: { name?: unknown } | null;
          };
        } | null;
        const reason = selectionContext?.selectionReason;
        const trackId = typeof selectionContext?.trackId === "string"
          ? selectionContext.trackId
          : typeof reason?.trackSnapshot === "object" && reason.trackSnapshot && "id" in reason.trackSnapshot && typeof reason.trackSnapshot.id === "string"
            ? reason.trackSnapshot.id
            : null;
        const schedulerIds = Array.isArray(reason?.schedulerIds)
          ? reason.schedulerIds.filter((id): id is string => typeof id === "string")
          : [];
        const trackName = typeof reason?.trackSnapshot?.name === "string"
          ? reason.trackSnapshot.name
          : trackId ? trackById.get(trackId)?.name ?? null : null;
        return {
          attemptId: attempt.id,
          itemTitle: item?.title ?? attempt.itemId,
          outcome: (attempt.outcome as PracticeOutcome | null) ?? null,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
          primarySkillId: item?.skillIds?.[0] ?? "unknown-skill",
          trackId,
          trackName,
          schedulerIds,
          selectionSource: typeof reason?.selectionSource === "string" ? reason.selectionSource : null,
          generated: item?.source === "generated" || reason?.generated === true,
          generatedFromArtifactId: typeof reason?.generatedFromArtifactId === "string"
            ? reason.generatedFromArtifactId
            : lineage?.parentArtifactId ?? null,
          itemSource: item?.source ?? "unknown",
          itemStatus: item?.status ?? "missing",
          generatedForSkillId: lineage?.generatedForSkillId ?? null,
          generatedForTrackId: lineage?.generatedForTrackId ?? null,
        };
      }),
    estimatedMinutes: computeEstimatedMinutes(attemptsRows),
    insightsSummary: computeInsightsSummary(confidenceRows, db, learnspaceId, userId),
  };
}

function computeInsightsSummary(
  confidenceRows: Array<{ skillId: string; score: number; totalAttempts: number; trend: string | null }>,
  db: AppDatabase,
  learnspaceId: string,
  userId: string,
): ProgressSummary["insightsSummary"] {
  const practiced = confidenceRows.filter((r) => r.totalAttempts > 0);

  let strongestSkillId: string | null = null;
  let weakestSkillId: string | null = null;
  let highScore = -1;
  let lowScore = Infinity;

  for (const row of practiced) {
    if (row.score > highScore) {
      highScore = row.score;
      strongestSkillId = row.skillId;
    }
    if (row.score < lowScore) {
      lowScore = row.score;
      weakestSkillId = row.skillId;
    }
  }

  // If all practiced skills have the same score, don't claim a strongest/weakest
  if (strongestSkillId === weakestSkillId && practiced.length > 1) {
    strongestSkillId = null;
    weakestSkillId = null;
  }
  if (practiced.length === 0) {
    strongestSkillId = null;
    weakestSkillId = null;
  }

  // Find the skill where the user relies most heavily on coach guidance
  let mostGuidanceNeededSkillId: string | null = null;
  let highestHelpLevel = 0;
  for (const row of practiced) {
    try {
      const memory = loadCoachMemorySnapshot(db, row.skillId, learnspaceId, userId);
      if (memory.coachingPatterns.avgHelpLevel > highestHelpLevel) {
        highestHelpLevel = memory.coachingPatterns.avgHelpLevel;
        mostGuidanceNeededSkillId = row.skillId;
      }
    } catch {
      // Skip skills with broken memory data
    }
  }
  // Only surface if the help level is meaningful
  if (highestHelpLevel < 0.2) {
    mostGuidanceNeededSkillId = null;
  }

  const improvingSkillCount = confidenceRows.filter((r) => r.trend === "improving").length;
  const decliningSkillCount = confidenceRows.filter((r) => r.trend === "declining").length;

  return {
    strongestSkillId,
    weakestSkillId,
    mostGuidanceNeededSkillId,
    improvingSkillCount,
    decliningSkillCount,
  };
}

function computeTrackAnalytics(
  attemptsRows: Array<{
    completedAt: string | null;
    itemId: string;
    selectionContext: Record<string, unknown> | null;
  }>,
  itemById: Map<string, { source: string }>,
  trackById: Map<string, LearnspaceTrackSummary>,
): ProgressSummary["trackAnalytics"] {
  const aggregates = new Map<string, {
    trackId: string | null;
    trackName: string | null;
    completedAttempts: number;
    generatedAttempts: number;
    lastAttemptAt: string | null;
  }>();

  for (const attempt of attemptsRows) {
    const selectionContext = attempt.selectionContext as {
      trackId?: unknown;
      selectionReason?: {
        generated?: unknown;
        trackSnapshot?: { id?: unknown; name?: unknown } | null;
      };
    } | null;
    const reason = selectionContext?.selectionReason;
    const snapshot = reason?.trackSnapshot;
    const trackId = typeof selectionContext?.trackId === "string"
      ? selectionContext.trackId
      : typeof snapshot?.id === "string"
        ? snapshot.id
        : null;
    const key = trackId ?? "__unknown__";
    const current = aggregates.get(key) ?? {
      trackId,
      trackName: typeof snapshot?.name === "string"
        ? snapshot.name
        : trackId ? trackById.get(trackId)?.name ?? null : null,
      completedAttempts: 0,
      generatedAttempts: 0,
      lastAttemptAt: null,
    };

    current.completedAttempts += 1;
    if (reason?.generated === true || itemById.get(attempt.itemId)?.source === "generated") {
      current.generatedAttempts += 1;
    }
    if (attempt.completedAt && (!current.lastAttemptAt || attempt.completedAt > current.lastAttemptAt)) {
      current.lastAttemptAt = attempt.completedAt;
    }
    aggregates.set(key, current);
  }

  return [...aggregates.values()].sort((left, right) => {
    if (left.lastAttemptAt && right.lastAttemptAt) {
      return right.lastAttemptAt.localeCompare(left.lastAttemptAt);
    }
    if (left.lastAttemptAt) return -1;
    if (right.lastAttemptAt) return 1;
    return (left.trackName ?? "").localeCompare(right.trackName ?? "");
  });
}

function computeEstimatedMinutes(completedAttempts: { startedAt: string; completedAt: string | null }[]): number | null {
  const withDurations = completedAttempts
    .filter((a) => a.completedAt !== null)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 10);

  if (withDurations.length === 0) return null;

  let totalMs = 0;
  for (const a of withDurations) {
    totalMs += new Date(a.completedAt!).getTime() - new Date(a.startedAt).getTime();
  }

  return Math.round(totalMs / withDurations.length / 60000);
}
