import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "../persistence/db.js";
import {
  plannerDecisionEvents,
  trackRuntimeState,
  trackTransitionEvents,
} from "../persistence/schema.js";
import type {
  LearnspaceTrackSummary,
  PlannerAuditEvent,
  TrackRuntimeStateV2,
  TrackTransitionEvent,
} from "./types.js";

export function createInitialTrackRuntimeState(
  track: LearnspaceTrackSummary,
  now: () => Date,
): TrackRuntimeStateV2 {
  const timestamp = now().toISOString();
  const activeNodeId = track.program?.entryNodeId ?? `${track.id}:main`;
  return {
    version: "2",
    trackId: track.id,
    activeNodeId,
    phaseEnteredAt: timestamp,
    nodeProgress: {},
    activeInterventions: [],
    temporaryOverrides: [],
    recurringState: [],
    coverageState: {},
    recentSessionHistory: [],
    lastPlannerDecision: null,
    manualPins: [],
    status: "active",
    updatedAt: timestamp,
  };
}

export function getTrackRuntimeState(
  db: AppDatabase,
  trackId: string,
): TrackRuntimeStateV2 | null {
  const row = db.select().from(trackRuntimeState).where(eq(trackRuntimeState.trackId, trackId)).get();
  return row?.state ?? null;
}

export function saveTrackRuntimeState(
  db: AppDatabase,
  input: {
    trackId: string;
    learnspaceId: string;
    userId: string;
    state: TrackRuntimeStateV2;
  },
): void {
  const existing = db.select().from(trackRuntimeState).where(eq(trackRuntimeState.trackId, input.trackId)).get();
  if (existing) {
    db.update(trackRuntimeState)
      .set({
        state: input.state,
        updatedAt: input.state.updatedAt,
      })
      .where(eq(trackRuntimeState.trackId, input.trackId))
      .run();
    return;
  }

  db.insert(trackRuntimeState)
    .values({
      trackId: input.trackId,
      learnspaceId: input.learnspaceId,
      userId: input.userId,
      state: input.state,
      updatedAt: input.state.updatedAt,
    })
    .run();
}

export function ensureTrackRuntimeState(
  db: AppDatabase,
  input: {
    track: LearnspaceTrackSummary;
    learnspaceId: string;
    userId: string;
    now: () => Date;
  },
): TrackRuntimeStateV2 {
  const existing = getTrackRuntimeState(db, input.track.id);
  if (existing) return existing;

  const initial = createInitialTrackRuntimeState(input.track, input.now);
  saveTrackRuntimeState(db, {
    trackId: input.track.id,
    learnspaceId: input.learnspaceId,
    userId: input.userId,
    state: initial,
  });
  return initial;
}

export function recordTrackTransitionEvents(
  db: AppDatabase,
  input: {
    trackId: string;
    learnspaceId: string;
    userId: string;
    events: TrackTransitionEvent[];
  },
): void {
  for (const event of input.events) {
    db.insert(trackTransitionEvents)
      .values({
        id: `track-transition-${randomUUID()}`,
        trackId: input.trackId,
        learnspaceId: input.learnspaceId,
        userId: input.userId,
        event,
        createdAt: event.createdAt,
      })
      .run();
  }
}

export function recordPlannerDecisionEvent(
  db: AppDatabase,
  input: {
    trackId: string;
    learnspaceId: string;
    userId: string;
    sessionId?: string | null;
    event: PlannerAuditEvent;
  },
): void {
  db.insert(plannerDecisionEvents)
    .values({
      id: `planner-decision-${randomUUID()}`,
      trackId: input.trackId,
      learnspaceId: input.learnspaceId,
      userId: input.userId,
      sessionId: input.sessionId ?? null,
      event: input.event,
      createdAt: input.event.createdAt,
    })
    .run();
}
