import { eq } from "drizzle-orm";
import { createTestDatabase } from "../persistence/db.js";
import { config as codingInterviewConfig, seedItems } from "../learnspaces/coding-interview-patterns.js";
import { loadAttemptBlueprintForSession } from "../runtime/attempt-blueprint.js";
import {
  SessionNotFoundError,
  abandonSession,
  createSession,
  getCoachRuntimeState,
  getSessionDetail,
  saveCoachRuntimeState,
  saveSessionStep,
} from "./sessions.js";
import type { CoachRuntimeState } from "./sessions.js";
import {
  attempts,
  items,
  learnspaces,
  queue,
  sessions,
  skills,
  users,
} from "../persistence/schema.js";

function createNow(isoString: string): () => Date {
  return () => new Date(isoString);
}

function seedPracticeContext() {
  const db = createTestDatabase();
  const userId = "user-1";
  const learnspaceId = "coding-interview-patterns";
  const skillId = "arrays_and_hashing";
  const itemId = "item-two-sum";
  const queueId = "queue-arrays-and-hashing";
  const createdAt = "2026-04-08T00:00:00.000Z";
  const item = seedItems[0];
  const skill = codingInterviewConfig.skills.find((entry) => entry.id === skillId);

  if (!item || !skill) {
    throw new Error("Expected built-in learnspace fixtures to exist for session tests");
  }

  db.insert(users)
    .values({
      id: userId,
      displayName: "Local User",
      activeLearnspaceId: learnspaceId,
      createdAt,
      updatedAt: createdAt,
    })
    .run();

  db.insert(learnspaces)
    .values({
      id: learnspaceId,
      userId,
      name: codingInterviewConfig.name,
      config: codingInterviewConfig as unknown as Record<string, unknown>,
      activeTag: null,
      interviewDate: "2026-05-10T00:00:00.000Z",
      createdAt,
      updatedAt: createdAt,
    })
    .run();

  db.insert(skills)
    .values({
      id: skillId,
      learnspaceId,
      name: skill.name,
      category: skill.category,
      createdAt,
    })
    .run();

  db.insert(items)
    .values({
      id: itemId,
      learnspaceId,
      title: item.title,
      content: {
        prompt: item.prompt,
        function_name: item.function_name,
        reference_solution: item.reference_solution,
      },
      skillIds: item.skill_ids,
      tags: item.tags,
      difficulty: item.difficulty,
      source: "seed",
      createdAt,
    })
    .run();

  db.insert(queue)
    .values({
      id: queueId,
      learnspaceId,
      userId,
      skillId,
      intervalDays: 6,
      easeFactor: 2.5,
      dueDate: "2026-04-09T00:00:00.000Z",
      round: 2,
      lastOutcome: "clean",
      skipCount: 0,
      createdAt,
      updatedAt: createdAt,
    })
    .run();

  return { db, userId, learnspaceId, itemId, queueId };
}

describe("session lifecycle helpers", () => {
  test("AC-1 creates linked sessions and attempts rows for a new practice attempt", () => {
    const { db, userId, learnspaceId, itemId } = seedPracticeContext();
    const now = createNow("2026-04-08T12:00:00.000Z");

    const detail = createSession({ db, now }, { userId, learnspaceId, itemId });

    const sessionRow = db.select().from(queue).where(eq(queue.skillId, "arrays_and_hashing")).get();
    const persistedSession = db
      .select()
      .from(learnspaces)
      .where(eq(learnspaces.id, learnspaceId))
      .get();
    const attemptRow = db
      .select()
      .from(attempts)
      .where(eq(attempts.id, detail.attemptId))
      .get();

    expect(detail).toEqual({
      sessionId: expect.any(String),
      attemptId: expect.any(String),
      learnspaceId,
      itemId,
      item: expect.objectContaining({ id: itemId, title: expect.any(String) }),
      status: "created",
      currentStep: null,
      stepDrafts: {},
      trackSnapshot: null,
      startedAt: "2026-04-08T12:00:00.000Z",
      completedAt: null,
    });
    expect(sessionRow?.intervalDays).toBe(6);
    expect(persistedSession?.id).toBe(learnspaceId);
    expect(attemptRow).toEqual(
      expect.objectContaining({
        id: detail.attemptId,
        sessionId: detail.sessionId,
        learnspaceId,
        userId,
        itemId,
        blueprintId: "protocol_solve:code_problem",
        blueprintVersion: 1,
        blueprintSnapshot: expect.objectContaining({
          blueprintId: "protocol_solve:code_problem",
          archetype: "protocol_solve",
          familyId: "dsa",
          schedulerId: "sm5",
          learnspaceId,
        }),
        startedAt: "2026-04-08T12:00:00.000Z",
        completedAt: null,
        outcome: null,
      }),
    );
    const sessionBlueprint = db
      .select()
      .from(sessions)
      .where(eq(sessions.id, detail.sessionId))
      .get();
    expect(sessionBlueprint).toEqual(
      expect.objectContaining({
        blueprintId: "protocol_solve:code_problem",
        blueprintVersion: 1,
        blueprintSnapshot: expect.objectContaining({
          blueprintId: "protocol_solve:code_problem",
          archetype: "protocol_solve",
          familyId: "dsa",
          schedulerId: "sm5",
          learnspaceId,
        }),
      }),
    );
  });
  test("AC-2 persists per-step drafts and moves created sessions into in_progress", () => {
    const { db, userId, learnspaceId, itemId } = seedPracticeContext();
    const detail = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId },
    );

    const updated = saveSessionStep(
      { db, now: createNow("2026-04-08T12:05:00.000Z") },
      {
        sessionId: detail.sessionId,
        stepId: "understanding",
        content: "Restate constraints before coding.",
      },
    );

    expect(updated.status).toBe("in_progress");
    expect(updated.currentStep).toBe("understanding");
    expect(updated.stepDrafts).toEqual({
      understanding: {
        content: "Restate constraints before coding.",
        updatedAt: "2026-04-08T12:05:00.000Z",
      },
    });
  });
  test("AC-3 returns persisted session detail including current step and saved drafts", () => {
    const { db, userId, learnspaceId, itemId } = seedPracticeContext();
    const created = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId },
    );

    saveSessionStep(
      { db, now: createNow("2026-04-08T12:05:00.000Z") },
      {
        sessionId: created.sessionId,
        stepId: "understanding",
        content: "Clarify the input constraints.",
      },
    );

    saveSessionStep(
      { db, now: createNow("2026-04-08T12:07:00.000Z") },
      {
        sessionId: created.sessionId,
        stepId: "approach",
        content: "Use a hash map to store seen values.",
      },
    );

    expect(getSessionDetail({ db }, { sessionId: created.sessionId })).toEqual({
      sessionId: created.sessionId,
      attemptId: created.attemptId,
      learnspaceId,
      itemId,
      item: expect.objectContaining({ id: itemId, title: expect.any(String) }),
      status: "in_progress",
      currentStep: "approach",
      stepDrafts: {
        understanding: {
          content: "Clarify the input constraints.",
          updatedAt: "2026-04-08T12:05:00.000Z",
        },
        approach: {
          content: "Use a hash map to store seen values.",
          updatedAt: "2026-04-08T12:07:00.000Z",
        },
      },
      trackSnapshot: null,
      startedAt: "2026-04-08T12:00:00.000Z",
      completedAt: null,
    });
  });
  test("AC-4 abandons stale or superseded sessions without mutating SM-2 queue state", () => {
    const { db, userId, learnspaceId, itemId, queueId } = seedPracticeContext();
    const created = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId },
    );

    saveSessionStep(
      { db, now: createNow("2026-04-08T12:05:00.000Z") },
      {
        sessionId: created.sessionId,
        stepId: "code",
        content: "def two_sum(nums, target): pass",
      },
    );

    const queueBefore = db.select().from(queue).where(eq(queue.id, queueId)).get();

    const abandoned = abandonSession(
      { db, now: createNow("2026-04-09T13:00:00.000Z") },
      { sessionId: created.sessionId },
    );

    const queueAfter = db.select().from(queue).where(eq(queue.id, queueId)).get();
    const attemptRow = db
      .select()
      .from(attempts)
      .where(eq(attempts.id, created.attemptId))
      .get();

    expect(abandoned.status).toBe("abandoned");
    expect(abandoned.completedAt).toBe("2026-04-09T13:00:00.000Z");
    expect(attemptRow?.outcome).toBe("abandoned");
    expect(attemptRow?.completedAt).toBe("2026-04-09T13:00:00.000Z");
    expect(queueAfter).toEqual(
      expect.objectContaining({
        id: queueId,
        intervalDays: queueBefore?.intervalDays,
        easeFactor: queueBefore?.easeFactor,
        round: queueBefore?.round,
      }),
    );
  });
  test("EC-1 preserves later step drafts when an earlier step is edited again", () => {
    const { db, userId, learnspaceId, itemId } = seedPracticeContext();
    const created = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId },
    );

    saveSessionStep(
      { db, now: createNow("2026-04-08T12:05:00.000Z") },
      {
        sessionId: created.sessionId,
        stepId: "understanding",
        content: "Initial understanding draft.",
      },
    );

    saveSessionStep(
      { db, now: createNow("2026-04-08T12:08:00.000Z") },
      {
        sessionId: created.sessionId,
        stepId: "code",
        content: "def two_sum(nums, target): return []",
      },
    );

    const updated = saveSessionStep(
      { db, now: createNow("2026-04-08T12:10:00.000Z") },
      {
        sessionId: created.sessionId,
        stepId: "understanding",
        content: "Revised understanding draft.",
      },
    );

    expect(updated.currentStep).toBe("understanding");
    expect(updated.stepDrafts).toEqual({
      understanding: {
        content: "Revised understanding draft.",
        updatedAt: "2026-04-08T12:10:00.000Z",
      },
      code: {
        content: "def two_sum(nums, target): return []",
        updatedAt: "2026-04-08T12:08:00.000Z",
      },
    });
  });
  test("ERR-1 throws a domain error for unknown session ids", () => {
    const { db } = seedPracticeContext();

    expect(() => getSessionDetail({ db }, { sessionId: "missing-session" })).toThrow(
      SessionNotFoundError,
    );
    expect(() => getSessionDetail({ db }, { sessionId: "missing-session" })).toThrow(
      "Unknown session: missing-session",
    );
  });
});

describe("coach runtime state persistence", () => {
  function makeRuntimeState(overrides: Partial<CoachRuntimeState> = {}): CoachRuntimeState {
    return {
      backend: "claude-code",
      runtimeSessionId: "claude-session-abc",
      startedAt: "2026-04-08T12:00:00.000Z",
      lastUsedAt: "2026-04-08T12:00:00.000Z",
      ...overrides,
    };
  }

  test("AC-1 persists coach runtime state on the session row", () => {
    const { db, userId, learnspaceId, itemId } = seedPracticeContext();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId },
    );

    const state = makeRuntimeState();
    saveCoachRuntimeState(db, { sessionId: session.sessionId, state });

    const persisted = getCoachRuntimeState(db, session.sessionId);
    expect(persisted).toEqual({
      backend: "claude-code",
      runtimeSessionId: "claude-session-abc",
      startedAt: "2026-04-08T12:00:00.000Z",
      lastUsedAt: "2026-04-08T12:00:00.000Z",
    });
  });

  test("AC-2 refreshes lastUsedAt while preserving the provider session id", () => {
    const { db, userId, learnspaceId, itemId } = seedPracticeContext();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId },
    );

    saveCoachRuntimeState(db, {
      sessionId: session.sessionId,
      state: makeRuntimeState({
        lastUsedAt: "2026-04-08T12:00:00.000Z",
      }),
    });

    // Later turn updates lastUsedAt
    saveCoachRuntimeState(db, {
      sessionId: session.sessionId,
      state: makeRuntimeState({
        lastUsedAt: "2026-04-08T12:15:00.000Z",
      }),
    });

    const persisted = getCoachRuntimeState(db, session.sessionId);
    expect(persisted).toEqual(expect.objectContaining({
      runtimeSessionId: "claude-session-abc",
      lastUsedAt: "2026-04-08T12:15:00.000Z",
    }));
  });

  test("AC-3 clears runtime state without deleting transcript history", () => {
    const { db, userId, learnspaceId, itemId } = seedPracticeContext();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId },
    );

    // Persist some messages on the session
    db.update(sessions)
      .set({
        messages: [
          { role: "user", content: "Help me", createdAt: "2026-04-08T12:01:00.000Z" },
          { role: "assistant", content: "Sure!", createdAt: "2026-04-08T12:01:01.000Z" },
        ],
      })
      .where(eq(sessions.id, session.sessionId))
      .run();

    saveCoachRuntimeState(db, {
      sessionId: session.sessionId,
      state: makeRuntimeState(),
    });

    // Clear runtime state
    saveCoachRuntimeState(db, {
      sessionId: session.sessionId,
      state: null,
    });

    const runtimeState = getCoachRuntimeState(db, session.sessionId);
    expect(runtimeState).toBeNull();

    // Transcript must still be intact
    const row = db.select().from(sessions).where(eq(sessions.id, session.sessionId)).get();
    const messages = row?.messages as Array<{ role: string; content: string }>;
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe("Help me");
  });

  test("EC-1 runtime-state helpers no-op for sessions with no coaching runtime", () => {
    const { db, userId, learnspaceId, itemId } = seedPracticeContext();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId },
    );

    // Never saved any runtime state — getCoachRuntimeState should return null
    const state = getCoachRuntimeState(db, session.sessionId);
    expect(state).toBeNull();

    // Clearing null state should not throw
    expect(() =>
      saveCoachRuntimeState(db, { sessionId: session.sessionId, state: null }),
    ).not.toThrow();
  });

  test("ERR-1 runtime-state helpers reuse SessionNotFoundError for unknown sessions", () => {
    const { db } = seedPracticeContext();

    expect(() => getCoachRuntimeState(db, "nonexistent-session")).toThrow(
      SessionNotFoundError,
    );
    expect(() => getCoachRuntimeState(db, "nonexistent-session")).toThrow(
      "Unknown session: nonexistent-session",
    );

    expect(() =>
      saveCoachRuntimeState(db, {
        sessionId: "nonexistent-session",
        state: makeRuntimeState(),
      }),
    ).toThrow(SessionNotFoundError);
  });
});

describe("attempt blueprint pinning across live learnspace drift", () => {
  test("loadAttemptBlueprintForSession returns the pinned runtime contract after live config drifts", () => {
    const { db, userId, learnspaceId, itemId } = seedPracticeContext();
    const now = createNow("2026-04-14T12:00:00.000Z");

    const detail = createSession({ db, now }, { userId, learnspaceId, itemId });

    const originalEvaluationPrompt = codingInterviewConfig.evaluation_prompt;
    const originalCoachingPersona = codingInterviewConfig.coaching_persona;
    const originalProtocolSteps = codingInterviewConfig.protocol_steps;

    // Drift the live learnspace config AFTER the session was pinned. The
    // pinned blueprint should still reflect the values that existed at
    // session creation time.
    const driftedConfig = {
      ...codingInterviewConfig,
      evaluation_prompt: "DRIFTED evaluation prompt",
      coaching_persona: "DRIFTED coach persona",
      protocol_steps: [
        {
          id: "drifted_only_step",
          label: "Drifted",
          instruction: "This step did not exist when the session was created",
          agent_prompt: "",
          editor: "text" as const,
          layout: "inline" as const,
        },
      ],
    };
    db.update(learnspaces)
      .set({
        config: driftedConfig as unknown as Record<string, unknown>,
        updatedAt: "2026-04-14T13:00:00.000Z",
      })
      .where(eq(learnspaces.id, learnspaceId))
      .run();

    const loaded = loadAttemptBlueprintForSession(db, detail.sessionId);

    // Contract fields must reflect the pinned snapshot, not the drifted
    // live config. This is the whole point of the pin.
    expect(loaded.config.evaluation_prompt).toBe(originalEvaluationPrompt);
    expect(loaded.config.coaching_persona).toBe(originalCoachingPersona);
    expect(loaded.config.protocol_steps.map((step) => step.id)).toEqual(
      originalProtocolSteps.map((step) => step.id),
    );

    // The blueprint identity should match the one that was pinned at
    // creation time — the load path should not re-resolve from live config.
    expect(loaded.blueprintId).toBe("protocol_solve:code_problem");
    expect(loaded.requiresExecution).toBe(true);

    // The attempt row should carry the same pinned snapshot as the session.
    const pinnedOnAttempt = db
      .select()
      .from(attempts)
      .where(eq(attempts.sessionId, detail.sessionId))
      .get();
    expect(pinnedOnAttempt?.blueprintId).toBe("protocol_solve:code_problem");
    expect(pinnedOnAttempt?.blueprintSnapshot).toBeTruthy();
  });

  test("stored pinned snapshot omits generator-only and cosmetic config fields", () => {
    const { db, userId, learnspaceId, itemId } = seedPracticeContext();
    const now = createNow("2026-04-14T12:00:00.000Z");

    const detail = createSession({ db, now }, { userId, learnspaceId, itemId });

    const sessionRow = db
      .select()
      .from(sessions)
      .where(eq(sessions.id, detail.sessionId))
      .get();
    const snapshot = sessionRow?.blueprintSnapshot as Record<string, unknown> | null;
    expect(snapshot).toBeTruthy();

    const pinnedConfig = (snapshot as Record<string, unknown>).pinnedConfig as
      | Record<string, unknown>
      | undefined;
    expect(pinnedConfig).toBeTruthy();

    // Runtime-contract fields must be pinned.
    expect(pinnedConfig).toHaveProperty("protocol_steps");
    expect(pinnedConfig).toHaveProperty("evaluation_prompt");
    expect(pinnedConfig).toHaveProperty("coaching_persona");
    expect(pinnedConfig).toHaveProperty("executor");
    expect(pinnedConfig).toHaveProperty("test_harness_template");

    // Non-runtime fields must not bloat the snapshot.
    expect(pinnedConfig).not.toHaveProperty("variant_prompt");
    expect(pinnedConfig).not.toHaveProperty("item_schema");
    expect(pinnedConfig).not.toHaveProperty("tag_weights");
    expect(pinnedConfig).not.toHaveProperty("skills");
    expect(pinnedConfig).not.toHaveProperty("skill_progression");
    expect(pinnedConfig).not.toHaveProperty("tags");
    expect(pinnedConfig).not.toHaveProperty("labels");
  });
});
