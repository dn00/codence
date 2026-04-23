import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "../persistence/db.js";
import { attempts, items, learnspaces, sessions, skills } from "../persistence/schema.js";
import type { SessionStatus } from "./types.js";
import { resolveAttemptBlueprint, toPinnedBlueprint } from "../runtime/attempt-blueprint.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import { buildTrackSnapshot, type TrackSnapshot } from "../tracks/service.js";

export interface SessionStepDraft {
  content: string;
  updatedAt: string;
}

export type SessionStepDrafts = Record<string, SessionStepDraft>;

export interface SessionItemDetail {
  id: string;
  title: string;
  difficulty: string;
  skillIds: string[];
  content: Record<string, unknown>;
}

export interface SessionDetail {
  sessionId: string;
  attemptId: string;
  learnspaceId: string;
  itemId: string;
  item: SessionItemDetail | null;
  status: SessionStatus;
  currentStep: string | null;
  stepDrafts: SessionStepDrafts;
  trackSnapshot: TrackSnapshot | null;
  startedAt: string;
  completedAt: string | null;
}

export interface SessionDependencies {
  db: AppDatabase;
}

export interface TimedSessionDependencies extends SessionDependencies {
  now: () => Date;
}

export interface CreateSessionInput {
  userId: string;
  learnspaceId: string;
  itemId: string;
  selectionContext?: Record<string, unknown>;
}

export interface SessionStepInput {
  sessionId: string;
  stepId: string;
  content: string;
}

export interface SessionIdInput {
  sessionId: string;
}

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Unknown session: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

function toTimestamp(now: () => Date): string {
  return now().toISOString();
}

function normalizeStepDrafts(value: Record<string, unknown> | null | undefined): SessionStepDrafts {
  if (!value) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([stepId, draft]) => {
      const typedDraft = draft as Partial<SessionStepDraft> | undefined;

      return [
        stepId,
        {
          content: typedDraft?.content ?? "",
          updatedAt: typedDraft?.updatedAt ?? "",
        },
      ];
    }),
  );
}

function requireSession(db: AppDatabase, sessionId: string) {
  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();

  if (!session) {
    throw new SessionNotFoundError(sessionId);
  }

  return session;
}

function requireAttemptForSession(db: AppDatabase, sessionId: string) {
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

function toSessionDetail(db: AppDatabase, sessionId: string): SessionDetail {
  const session = requireSession(db, sessionId);
  const attempt = requireAttemptForSession(db, sessionId);
  const item = db.select().from(items).where(eq(items.id, session.itemId)).get();

  return {
    sessionId: session.id,
    attemptId: attempt.id,
    learnspaceId: session.learnspaceId,
    itemId: session.itemId,
    item: item ? { id: item.id, title: item.title, difficulty: item.difficulty, skillIds: item.skillIds ?? [], content: item.content ?? {} } : null,
    status: session.status as SessionStatus,
    currentStep: session.currentStep,
    stepDrafts: normalizeStepDrafts(session.stepInteractions),
    trackSnapshot: (session.trackSnapshot as TrackSnapshot | null) ?? null,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
}

export function createSession(
  { db, now }: TimedSessionDependencies,
  { userId, learnspaceId, itemId, selectionContext }: CreateSessionInput,
): SessionDetail {
  const sessionId = randomUUID();
  const attemptId = randomUUID();
  const startedAt = toTimestamp(now);
  const learnspace = db.select().from(learnspaces).where(eq(learnspaces.id, learnspaceId)).get();
  const item = db.select().from(items).where(eq(items.id, itemId)).get();

  if (!learnspace) {
    throw new Error(`Unknown learnspace: ${learnspaceId}`);
  }
  if (!item) {
    throw new Error(`Unknown item: ${itemId}`);
  }

  const blueprint = resolveAttemptBlueprint({
    learnspaceId,
    learnspaceConfig: learnspace.config as unknown as LearnspaceConfig,
    item,
  });
  const pinnedSnapshot = toPinnedBlueprint(blueprint) as unknown as Record<string, unknown>;

  // Snapshot the driving track so session history survives catalog
  // edits/deletes. Pointer (selectionContext.trackId) kept as-is for
  // selection audit; this is the canonical display source.
  const trackIdFromContext = typeof selectionContext?.trackId === "string"
    ? selectionContext.trackId
    : null;
  const trackSnapshot: TrackSnapshot | null = trackIdFromContext
    ? buildTrackSnapshot(db, userId, learnspaceId, trackIdFromContext, now)
    : null;

  // Snapshot the item + its skills so attempts survive catalog deletes.
  const itemSnapshot = {
    id: item.id,
    title: item.title,
    difficulty: item.difficulty,
    source: item.source,
    status: item.status,
    content: item.content,
    skillIds: item.skillIds ?? [],
    tags: item.tags ?? [],
    snapshottedAt: startedAt,
  };
  const itemSkillIds = item.skillIds ?? [];
  const skillSnapshots = itemSkillIds.length > 0
    ? db.select().from(skills).all()
        .filter((row) => row.learnspaceId === learnspaceId && itemSkillIds.includes(row.id))
        .map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          categoryId: row.categoryId,
        }))
    : [];

  db.transaction((tx) => {
    tx.insert(sessions)
      .values({
        id: sessionId,
        learnspaceId,
        userId,
        itemId,
        blueprintId: blueprint.blueprintId,
        blueprintVersion: blueprint.blueprintVersion,
        blueprintSnapshot: pinnedSnapshot,
        status: "created",
        currentStep: null,
        stepInteractions: {},
        messages: [],
        selectionContext: selectionContext ?? null,
        trackSnapshot,
        startedAt,
        completedAt: null,
      })
      .run();

    tx.insert(attempts)
      .values({
        id: attemptId,
        learnspaceId,
        userId,
        itemId,
        sessionId,
        blueprintId: blueprint.blueprintId,
        blueprintVersion: blueprint.blueprintVersion,
        blueprintSnapshot: pinnedSnapshot,
        outcome: null,
        selectionContext: selectionContext ?? null,
        workSnapshot: null,
        itemSnapshot,
        skillSnapshots,
        startedAt,
        completedAt: null,
      })
      .run();
  });

  return toSessionDetail(db, sessionId);
}

export function saveSessionStep(
  { db, now }: TimedSessionDependencies,
  { sessionId, stepId, content }: SessionStepInput,
): SessionDetail {
  const session = requireSession(db, sessionId);
  const stepDrafts = normalizeStepDrafts(session.stepInteractions);

  stepDrafts[stepId] = {
    content,
    updatedAt: toTimestamp(now),
  };

  db.update(sessions)
    .set({
      currentStep: stepId,
      stepInteractions: stepDrafts,
      status:
        session.status === "created" && content.trim().length > 0
          ? "in_progress"
          : session.status,
    })
    .where(eq(sessions.id, sessionId))
    .run();

  return toSessionDetail(db, sessionId);
}

export function getSessionDetail(
  { db }: SessionDependencies,
  { sessionId }: SessionIdInput,
): SessionDetail {
  return toSessionDetail(db, sessionId);
}

export interface CoachRuntimeState {
  backend: string;
  runtimeSessionId: string;
  startedAt: string;
  lastUsedAt: string;
  summary?: import("../ai/coaching-prompt.js").CoachSessionSummary | null;
}

export function saveCoachRuntimeState(
  db: AppDatabase,
  input: { sessionId: string; state: CoachRuntimeState | null },
): void {
  requireSession(db, input.sessionId);
  db.update(sessions)
    .set({ coachRuntimeState: input.state })
    .where(eq(sessions.id, input.sessionId))
    .run();
}

export function getCoachRuntimeState(
  db: AppDatabase,
  sessionId: string,
): CoachRuntimeState | null {
  const session = requireSession(db, sessionId);
  return (session.coachRuntimeState as CoachRuntimeState | null) ?? null;
}

export function abandonSession(
  { db, now }: TimedSessionDependencies,
  { sessionId }: SessionIdInput,
): SessionDetail {
  requireSession(db, sessionId);
  const attempt = requireAttemptForSession(db, sessionId);
  const completedAt = toTimestamp(now);

  db.transaction((tx) => {
    tx.update(sessions)
      .set({
        status: "abandoned",
        completedAt,
      })
      .where(eq(sessions.id, sessionId))
      .run();

    tx.update(attempts)
      .set({
        outcome: "abandoned",
        completedAt,
      })
      .where(eq(attempts.id, attempt.id))
      .run();
  });

  return toSessionDetail(db, sessionId);
}
