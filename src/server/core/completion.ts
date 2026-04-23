import { and, eq, or } from "drizzle-orm";
import type { EvaluationService } from "../runtime-services.js";
import {
  buildAttemptCoachingSummary,
  loadCoachMemorySnapshot,
} from "../ai/coach-memory.js";
import { isCoachingMetadata } from "../ai/coach-metadata.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import type { AppDatabase } from "../persistence/db.js";
import type { ExecutionResult } from "../execution/executor.js";
import type {
  AttemptCoachingSummary,
  AttemptContext,
  AttemptFeatures,
  CoachingMetadata,
  PracticeOutcome,
  StructuredEvaluation,
} from "./types.js";
import type { ProtocolStep } from "../learnspaces/config-types.js";
import type { SessionStepDrafts } from "./sessions.js";
import { deriveMaxIntervalDays, updateSM2 } from "./sm2.js";
import { getSessionDetail, SessionNotFoundError, type SessionDetail } from "./sessions.js";
import { loadAttemptBlueprintForSession } from "../runtime/attempt-blueprint.js";
import { loadSecondaryEvidence, type SecondaryEvidence } from "./secondary-evidence.js";
import { reduceTrackRuntimeState } from "../tracks/reducer.js";
import { buildEvidenceRecordFromCompletion, persistEvidenceRecord } from "../tracks/evidence.js";
import {
  ensureTrackRuntimeState,
  recordPlannerDecisionEvent,
  recordTrackTransitionEvents,
  saveTrackRuntimeState,
} from "../tracks/runtime-state.js";
import { listLearnspaceTracks } from "../tracks/service.js";
import type { SessionPlanV2 } from "../tracks/types.js";
import {
  attempts,
  itemQueue,
  learnspaces,
  queue,
  sessions,
  skillConfidence,
  type Attempt,
  type Learnspace,
  type QueueRow,
  type Session,
  type SkillConfidence,
} from "../persistence/schema.js";

export interface CompletionResult {
  sessionId: string;
  attemptId: string;
  outcome: PracticeOutcome;
  modelOutcome: Exclude<PracticeOutcome, "abandoned">;
  finalOutcome: PracticeOutcome;
  appliedOverrides: Array<{
    rule: "tests_failed" | "solution_revealed" | "step_completion_rate" | "help_level_threshold" | "execution_required";
    reason: string;
  }>;
  evaluation: StructuredEvaluation;
  primarySkill: {
    skillId: string;
    score: number;
    trend: string | null;
    nextDueDate: string | null;
  };
}

export interface StepCompletionSnapshot {
  stepId: string;
  content: string;
  updatedAt: string;
}

export interface CompletionDependencies {
  db: AppDatabase;
  now: () => Date;
  evaluationService: EvaluationService;
}

export interface CompleteSessionInput {
  sessionId: string;
}

export class SessionCompletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionCompletionError";
  }
}

export class MissingPrimaryQueueRowError extends SessionCompletionError {
  constructor(skillId: string) {
    super(`Missing queue row for primary skill: ${skillId}`);
    this.name = "MissingPrimaryQueueRowError";
  }
}

function toIsoString(now: () => Date): string {
  return now().toISOString();
}

function getPrimarySkillId(item: { id: string; skillIds: string[] }): string {
  const primarySkillId = item.skillIds[0];

  if (!primarySkillId) {
    throw new SessionCompletionError(`Item ${item.id} does not have a primary skill`);
  }

  return primarySkillId;
}

function findAttemptBySessionId(db: AppDatabase, sessionId: string): Attempt {
  const attempt = db
    .select()
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId))
    .get();

  if (!attempt) {
    throw new SessionNotFoundError(sessionId);
  }

  return attempt;
}

function findSessionRowById(db: AppDatabase, sessionId: string): Session {
  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();

  if (!session) {
    throw new SessionNotFoundError(sessionId);
  }

  return session;
}

function findLearnspaceById(db: AppDatabase, learnspaceId: string): Learnspace {
  const learnspace = db
    .select()
    .from(learnspaces)
    .where(eq(learnspaces.id, learnspaceId))
    .get();

  if (!learnspace) {
    throw new SessionCompletionError(`Unknown learnspace: ${learnspaceId}`);
  }

  return learnspace;
}

function findQueueRow(
  db: AppDatabase,
  input: {
    learnspaceId: string;
    userId: string;
    skillId: string;
  },
): QueueRow | undefined {
  return db
    .select()
    .from(queue)
    .all()
    .find(
      (row) =>
        row.learnspaceId === input.learnspaceId &&
        row.userId === input.userId &&
        row.skillId === input.skillId,
    );
}

function normalizeExecutionResult(value: Record<string, unknown> | null | undefined): ExecutionResult | null {
  if (!value) {
    return null;
  }

  return {
    passed: typeof value.passed === "number" ? value.passed : 0,
    failed: typeof value.failed === "number" ? value.failed : 0,
    errors: Array.isArray(value.errors)
      ? value.errors.filter((error): error is string => typeof error === "string")
      : [],
  };
}

function normalizeCoachingTranscript(
  value: unknown[] | null | undefined,
): AttemptContext["coachingTranscript"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).role !== "string" ||
      typeof (entry as Record<string, unknown>).content !== "string"
    ) {
      return [];
    }

    const role = (entry as Record<string, unknown>).role;
    if (role !== "user" && role !== "assistant") {
      return [];
    }

    const metadata = isCoachingMetadata((entry as Record<string, unknown>).metadata)
      ? (entry as Record<string, unknown>).metadata as CoachingMetadata
      : null;

    return [{
      role,
      content: (entry as Record<string, unknown>).content as string,
      metadata,
    }];
  });
}

function buildAttemptContext(input: {
  attempt: Attempt;
  session: Session;
  sessionDetail: SessionDetail;
  blueprint: ReturnType<typeof loadAttemptBlueprintForSession>;
  coachingSummary: AttemptCoachingSummary;
  attemptFeatures: AttemptFeatures;
  testResults: ExecutionResult | null;
  evaluationStrictness: SessionPlanV2["evaluationStrictness"];
}): AttemptContext {
  const primarySkillId = input.blueprint.item.skillIds[0] ?? "unknown-skill";
  const skillsById = new Map(input.blueprint.config.skills.map((skill) => [skill.id, skill]));

  return {
    attemptId: input.attempt.id,
    sessionId: input.sessionDetail.sessionId,
    learnspaceId: input.sessionDetail.learnspaceId,
    itemId: input.sessionDetail.itemId,
    evaluationPromptTemplate: input.blueprint.config.evaluation_prompt,
    itemTitle: input.blueprint.item.title,
    itemContent: input.blueprint.item.content,
    referenceSolution:
      typeof input.blueprint.item.content.reference_solution === "string"
        ? input.blueprint.item.content.reference_solution
        : null,
    protocolSteps: input.blueprint.config.protocol_steps.map((step) => ({
      id: step.id,
      label: step.label,
      instruction: step.instruction,
      agentPrompt: step.agent_prompt,
      editor: step.editor,
    })),
    primarySkill: {
      id: primarySkillId,
      name: skillsById.get(primarySkillId)?.name ?? primarySkillId,
    },
    secondarySkills: input.blueprint.item.skillIds.slice(1).map((skillId) => ({
      id: skillId,
      name: skillsById.get(skillId)?.name ?? skillId,
    })),
    stepDrafts: input.sessionDetail.stepDrafts,
    testResults: input.testResults,
    coachingTranscript: normalizeCoachingTranscript(input.session.messages),
    coachingSummary: input.coachingSummary,
    attemptFeatures: input.attemptFeatures,
    executionRequired: input.attemptFeatures.execution_required,
    evaluationStrictness: input.evaluationStrictness,
  };
}

function ensureConfidenceRow(
  db: AppDatabase,
  input: {
    learnspaceId: string;
    userId: string;
    skillId: string;
  },
): SkillConfidence {
  const existing = db
    .select()
    .from(skillConfidence)
    .all()
    .find(
      (row) =>
        row.learnspaceId === input.learnspaceId &&
        row.userId === input.userId &&
        row.skillId === input.skillId,
    );

  if (existing) {
    return existing;
  }

  db.insert(skillConfidence)
    .values({
      learnspaceId: input.learnspaceId,
      userId: input.userId,
      skillId: input.skillId,
      score: 0,
      totalAttempts: 0,
      cleanSolves: 0,
      assistedSolves: 0,
      failedAttempts: 0,
      lastPracticedAt: null,
      trend: null,
    })
    .run();

  const inserted = db
    .select()
    .from(skillConfidence)
    .all()
    .find(
      (row) =>
        row.learnspaceId === input.learnspaceId &&
        row.userId === input.userId &&
        row.skillId === input.skillId,
    );

  if (!inserted) {
    throw new SessionCompletionError(`Unable to create confidence row for skill: ${input.skillId}`);
  }

  return inserted;
}

// Blends the primary row's integer counters with secondary evidence walked
// from the attempts table. Primary is full-weight; secondary is 0.5-weight.
// Recency bonus uses the most recent of primary.lastPracticedAt and
// secondary.lastPracticedAt so a freshly-used secondary skill still gets
// the bonus even if it has never been primary.
function calculateBlendedConfidenceScore(
  primary: SkillConfidence,
  secondary: SecondaryEvidence,
  asOf: string,
): number {
  const primaryNumerator = primary.cleanSolves * 2 + primary.assistedSolves;
  const primaryDenominator = primary.totalAttempts * 2;

  const secondaryNumerator = (secondary.cleanCount * 2 + secondary.assistedCount) * 0.5;
  const secondaryDenominator = secondary.totalCount * 2 * 0.5;

  const denominator = Math.max(primaryDenominator + secondaryDenominator, 1);
  const numerator = primaryNumerator + secondaryNumerator;
  const base = (numerator / denominator) * 10;

  const primaryLast = primary.lastPracticedAt
    ? new Date(primary.lastPracticedAt).getTime()
    : 0;
  const secondaryLast = secondary.lastPracticedAt
    ? new Date(secondary.lastPracticedAt).getTime()
    : 0;
  const mostRecent = Math.max(primaryLast, secondaryLast);
  const asOfTime = new Date(asOf).getTime();
  const recencyBonus =
    mostRecent > 0 && asOfTime - mostRecent <= 7 * 24 * 60 * 60 * 1000 ? 0.5 : 0;

  return Math.min(10, base + recencyBonus);
}

// Primary skill write path: bumps integer counters, stamps lastPracticedAt,
// and recomputes the blended confidence score. Only called for the attempt's
// primary skill (skillIds[0]). Secondary skills are updated via
// cascadeBlendedScoreOnly, which never touches counters or lastPracticedAt.
function updatePrimaryConfidenceRow(
  db: AppDatabase,
  row: SkillConfidence,
  input: {
    outcome: PracticeOutcome;
    completedAt: string;
  },
): SkillConfidence {
  const next = {
    totalAttempts: row.totalAttempts + 1,
    cleanSolves: row.cleanSolves,
    assistedSolves: row.assistedSolves,
    failedAttempts: row.failedAttempts,
    lastPracticedAt: input.completedAt,
    trend: row.trend,
    score: row.score,
  };

  if (input.outcome === "clean") {
    next.cleanSolves += 1;
  } else if (input.outcome === "assisted") {
    next.assistedSolves += 1;
  } else if (input.outcome === "failed") {
    next.failedAttempts += 1;
  }

  const secondary = loadSecondaryEvidence(db, row.skillId, row.learnspaceId, row.userId);
  next.score = calculateBlendedConfidenceScore(
    {
      ...row,
      ...next,
    },
    secondary,
    input.completedAt,
  );

  db.update(skillConfidence)
    .set(next)
    .where(
      and(
        eq(skillConfidence.learnspaceId, row.learnspaceId),
        eq(skillConfidence.userId, row.userId),
        eq(skillConfidence.skillId, row.skillId),
      ),
    )
    .run();

  const updated = db
    .select()
    .from(skillConfidence)
    .all()
    .find(
      (current) =>
        current.learnspaceId === row.learnspaceId &&
        current.userId === row.userId &&
        current.skillId === row.skillId,
    );

  if (!updated) {
    throw new SessionCompletionError(`Unable to update confidence row for skill: ${row.skillId}`);
  }

  return updated;
}

// Cascades a re-blended score to a skill's confidence row without touching
// integer counters, lastPracticedAt, or trend. Used on completion to
// propagate the newly-recorded attempt's secondary evidence into every
// secondary skill referenced by the item.
function cascadeBlendedScoreOnly(
  db: AppDatabase,
  row: SkillConfidence,
  asOf: string,
): void {
  const secondary = loadSecondaryEvidence(db, row.skillId, row.learnspaceId, row.userId);
  const blendedScore = calculateBlendedConfidenceScore(row, secondary, asOf);

  if (blendedScore === row.score) {
    return;
  }

  db.update(skillConfidence)
    .set({ score: blendedScore })
    .where(
      and(
        eq(skillConfidence.learnspaceId, row.learnspaceId),
        eq(skillConfidence.userId, row.userId),
        eq(skillConfidence.skillId, row.skillId),
      ),
    )
    .run();
}

function addDays(isoString: string, days: number): string {
  return new Date(new Date(isoString).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

// Outcome override thresholds (spec §6 — calibrate with real usage data)
const HELP_LEVEL_THRESHOLD = 0.7;
const STEP_COMPLETION_THRESHOLD = 0.3;

function computeAttemptFeatures(
  coachingSummary: AttemptCoachingSummary,
  stepDrafts: SessionStepDrafts,
  protocolSteps: ProtocolStep[],
  testResults: ExecutionResult | null,
  executionRequired: boolean,
): AttemptFeatures {
  const filledSteps = protocolSteps.filter(
    (s) => (stepDrafts[s.id]?.content ?? "").trim().length > 0,
  );

  return {
    solution_revealed: coachingSummary.full_solution_turns > 0,
    total_help_level: coachingSummary.avg_help_level,
    coach_turns: coachingSummary.coach_turns,
    tests_passed: testResults
      ? testResults.failed === 0 && testResults.errors.length === 0
      : null,
    execution_required: executionRequired,
    execution_present: testResults !== null,
    step_completion_rate:
      protocolSteps.length > 0 ? filledSteps.length / protocolSteps.length : 0,
  };
}

export async function completeSessionAttempt(
  { db, now, evaluationService }: CompletionDependencies,
  { sessionId }: CompleteSessionInput,
): Promise<CompletionResult> {
  if (!evaluationService) {
    throw new SessionCompletionError("Codence evaluation service is not configured");
  }

  let sessionDetail: SessionDetail;
  try {
    sessionDetail = getSessionDetail({ db }, { sessionId });
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      throw new SessionCompletionError(error.message);
    }
    throw error;
  }

  if (sessionDetail.status !== "created" && sessionDetail.status !== "in_progress") {
    throw new SessionCompletionError("Only active sessions can be completed");
  }

  const attempt = findAttemptBySessionId(db, sessionId);
  const session = findSessionRowById(db, sessionId);
  const learnspace = findLearnspaceById(db, sessionDetail.learnspaceId);
  // Completion/evaluation are anchored on the pinned attempt contract.
  // New runtime work should extend this path, not re-read broad mutable
  // learnspace config directly.
  const blueprint = loadAttemptBlueprintForSession(db, sessionId);
  const primarySkillId = getPrimarySkillId({
    id: blueprint.item.id,
    skillIds: blueprint.item.skillIds,
  });
  const primaryQueueRow = findQueueRow(db, {
    learnspaceId: sessionDetail.learnspaceId,
    userId: attempt.userId,
    skillId: primarySkillId,
  });

  if (!primaryQueueRow) {
    throw new MissingPrimaryQueueRowError(primarySkillId);
  }

  const learnspaceConfig = blueprint.config as LearnspaceConfig;
  const testResults = normalizeExecutionResult(attempt.testResults);
  const coachingSummary = buildAttemptCoachingSummary(session.messages);
  const selectionContext = session.selectionContext as {
    trackId?: unknown;
    sessionPlan?: unknown;
  } | null;
  const sessionPlan = (selectionContext?.sessionPlan ?? null) as SessionPlanV2 | null;
  const evaluationStrictness = sessionPlan?.evaluationStrictness ?? "balanced";
  const attemptFeatures = computeAttemptFeatures(
    coachingSummary,
    sessionDetail.stepDrafts,
    learnspaceConfig.protocol_steps,
    testResults,
    blueprint.requiresExecution,
  );
  const attemptContext = buildAttemptContext({
    attempt,
    session,
    sessionDetail,
    blueprint,
    coachingSummary,
    attemptFeatures,
    testResults,
    evaluationStrictness,
  });
  const evaluation = await evaluationService.evaluateAttempt(attemptContext);

  // Apply outcome overrides (spec §6) in precedence order
  let finalOutcome: PracticeOutcome = evaluation.outcome;
  const appliedOverrides: CompletionResult["appliedOverrides"] = [];

  // Override 1: tests failed → "failed"
  if (testResults && (testResults.failed > 0 || testResults.errors.length > 0)) {
    finalOutcome = "failed";
    appliedOverrides.push({
      rule: "tests_failed",
      reason: `Execution reported ${testResults.failed} failed tests and ${testResults.errors.length} runtime errors.`,
    });
  }

  // Override 2: gave_full_solution → "failed"
  if (attemptFeatures.solution_revealed) {
    finalOutcome = "failed";
    appliedOverrides.push({
      rule: "solution_revealed",
      reason: "Coach metadata indicates the full solution was revealed during the attempt.",
    });
  }

  // Override 3: step completion rate below threshold → "failed"
  if (attemptFeatures.step_completion_rate < STEP_COMPLETION_THRESHOLD) {
    finalOutcome = "failed";
    appliedOverrides.push({
      rule: "step_completion_rate",
      reason: `Only ${Math.round(attemptFeatures.step_completion_rate * 100)}% of protocol steps contained saved work.`,
    });
  }

  // Override 4: high help_level → cap at "assisted" (only downgrades "clean")
  if (
    attemptFeatures.total_help_level > HELP_LEVEL_THRESHOLD &&
    finalOutcome === "clean"
  ) {
    finalOutcome = "assisted";
    appliedOverrides.push({
      rule: "help_level_threshold",
      reason: `Average help level ${attemptFeatures.total_help_level.toFixed(2)} exceeded threshold ${HELP_LEVEL_THRESHOLD.toFixed(2)}.`,
    });
  }

  // Override 5: DSA code sessions with an executor require a run before "clean".
  if (
    attemptFeatures.execution_required &&
    !attemptFeatures.execution_present &&
    finalOutcome === "clean"
  ) {
    finalOutcome = "assisted";
    appliedOverrides.push({
      rule: "execution_required",
      reason: "A runnable code attempt must be executed before it can be recorded as a clean solve.",
    });
  }

  const completedAt = toIsoString(now);
  const nextState = updateSM2(
    {
      intervalDays: primaryQueueRow.intervalDays,
      easeFactor: primaryQueueRow.easeFactor,
      round: primaryQueueRow.round,
    },
    finalOutcome,
    deriveMaxIntervalDays(learnspace.interviewDate, { now }),
  );
  const nextDueDate = addDays(completedAt, nextState.intervalDays);
  const primaryConfidenceRow = ensureConfidenceRow(db, {
    learnspaceId: sessionDetail.learnspaceId,
    userId: attempt.userId,
    skillId: primarySkillId,
  });
  const itemQueueRow = db.select().from(itemQueue).all().find(
    (row) => row.itemId === blueprint.item.id && row.userId === attempt.userId && row.learnspaceId === sessionDetail.learnspaceId,
  );
  const trackId = typeof selectionContext?.trackId === "string" ? selectionContext.trackId : null;

  // Full completion transaction: claim the session up front, then keep the
  // attempt, queue, confidence, evidence, and track-runtime writes in the
  // same unit so completion cannot leave the system half-advanced.
  const finalPrimary = db.transaction((tx): SkillConfidence => {
    const claimed = tx.update(sessions)
      .set({
        status: "completed",
        completedAt,
      })
      .where(
        and(
          eq(sessions.id, sessionId),
          or(eq(sessions.status, "created"), eq(sessions.status, "in_progress")),
        ),
      )
      .run();
    if (claimed.changes === 0) {
      throw new SessionCompletionError("Session already completed (concurrent completion)");
    }

    tx.update(attempts)
      .set({
        modelOutcome: evaluation.outcome,
        outcome: finalOutcome,
        appliedOverrides: appliedOverrides as unknown as Record<string, unknown>[],
        workSnapshot: sessionDetail.stepDrafts,
        structuredEvaluation: evaluation as unknown as Record<string, unknown>,
        evaluationSource: evaluation.evaluation_source,
        retryRecovered: evaluation.retry_recovered,
        stubReason: evaluation.stub_reason ?? null,
        coachingMetadata: coachingSummary as unknown as Record<string, unknown>,
        attemptFeatures: attemptFeatures as unknown as Record<string, unknown>,
        completedAt,
      })
      .where(eq(attempts.id, attempt.id))
      .run();

    tx.update(queue)
      .set({
        intervalDays: nextState.intervalDays,
        easeFactor: nextState.easeFactor,
        round: nextState.round,
        dueDate: nextDueDate,
        scheduledDate: nextDueDate,
        lastOutcome: finalOutcome,
        skipCount: finalOutcome === "clean" || finalOutcome === "assisted" ? 0 : primaryQueueRow.skipCount,
        updatedAt: completedAt,
      })
      .where(eq(queue.id, primaryQueueRow.id))
      .run();

    if (itemQueueRow) {
      const itemNextState = updateSM2(
        { intervalDays: itemQueueRow.intervalDays, easeFactor: itemQueueRow.easeFactor, round: itemQueueRow.round },
        finalOutcome,
        deriveMaxIntervalDays(learnspace.interviewDate, { now }),
      );
      const itemNextDueDate = addDays(completedAt, itemNextState.intervalDays);
      tx.update(itemQueue)
        .set({
          intervalDays: itemNextState.intervalDays,
          easeFactor: itemNextState.easeFactor,
          round: itemNextState.round,
          dueDate: itemNextDueDate,
          scheduledDate: itemNextDueDate,
          lastOutcome: finalOutcome,
          skipCount: finalOutcome === "clean" || finalOutcome === "assisted" ? 0 : itemQueueRow.skipCount,
          updatedAt: completedAt,
        })
        .where(eq(itemQueue.id, itemQueueRow.id))
        .run();
    }

    let refreshedPrimary = updatePrimaryConfidenceRow(tx, primaryConfidenceRow, {
      outcome: finalOutcome,
      completedAt,
    });
    const primarySnapshot = loadCoachMemorySnapshot(
      tx,
      primarySkillId,
      sessionDetail.learnspaceId,
      attempt.userId,
    );
    if (primarySnapshot.trend !== refreshedPrimary.trend) {
      tx.update(skillConfidence)
        .set({ trend: primarySnapshot.trend })
        .where(
          and(
            eq(skillConfidence.learnspaceId, sessionDetail.learnspaceId),
            eq(skillConfidence.userId, attempt.userId),
            eq(skillConfidence.skillId, primarySkillId),
          ),
        )
        .run();
      refreshedPrimary = {
        ...refreshedPrimary,
        trend: primarySnapshot.trend,
      };
    }

    for (const skillId of blueprint.item.skillIds.slice(1)) {
      const secondaryRow = ensureConfidenceRow(tx, {
        learnspaceId: sessionDetail.learnspaceId,
        userId: attempt.userId,
        skillId,
      });

      cascadeBlendedScoreOnly(tx, secondaryRow, completedAt);
    }

    if (trackId && sessionPlan) {
      const track = listLearnspaceTracks(tx, attempt.userId, sessionDetail.learnspaceId)
        .find((candidate) => candidate.id === trackId);
      if (track) {
        const evidence = buildEvidenceRecordFromCompletion({
          userId: attempt.userId,
          learnspaceId: sessionDetail.learnspaceId,
          trackId,
          artifactId: blueprint.item.id,
          sessionId,
          attemptId: attempt.id,
          observedAt: completedAt,
          outcome: finalOutcome,
          evaluation,
          attemptFeatures,
          primarySkillId,
        });
        persistEvidenceRecord(tx, evidence);
        const priorState = ensureTrackRuntimeState(tx, {
          track,
          learnspaceId: sessionDetail.learnspaceId,
          userId: attempt.userId,
          now,
        });
        const reduced = reduceTrackRuntimeState(track, {
          trackId,
          priorState,
          sessionPlan,
          completion: {
            sessionId,
            outcome: finalOutcome,
            completedAt,
          },
          evidence: [evidence],
          manualOverride: null,
        });
        saveTrackRuntimeState(tx, {
          trackId,
          learnspaceId: sessionDetail.learnspaceId,
          userId: attempt.userId,
          state: reduced.nextState,
        });
        recordTrackTransitionEvents(tx, {
          trackId,
          learnspaceId: sessionDetail.learnspaceId,
          userId: attempt.userId,
          events: reduced.transitionEvents,
        });
        for (const event of reduced.plannerAuditEvents) {
          recordPlannerDecisionEvent(tx, {
            trackId,
            learnspaceId: sessionDetail.learnspaceId,
            userId: attempt.userId,
            sessionId,
            event,
          });
        }
      }
    }
    return refreshedPrimary;
  });

  return {
    sessionId: sessionDetail.sessionId,
    attemptId: attempt.id,
    outcome: finalOutcome,
    modelOutcome: evaluation.outcome,
    finalOutcome,
    appliedOverrides,
    evaluation,
    primarySkill: {
      skillId: primarySkillId,
      score: finalPrimary.score,
      trend: finalPrimary.trend,
      nextDueDate,
    },
  };
}
