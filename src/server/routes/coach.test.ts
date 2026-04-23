import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { vi } from "vitest";
import * as coachMemory from "../ai/coach-memory.js";
import { createApp } from "../index.js";
import { createDatabase } from "../persistence/db.js";
import { sessions } from "../persistence/schema.js";
import {
  createStubCoachRuntime,
  createUnconfiguredCoachRuntime,
  type CoachRuntime,
  type CoachRuntimeTurnResult,
} from "../ai/coach-runtime.js";
import { flattenSystemPrompt, type SystemPrompt } from "../ai/llm-adapter.js";
import type { CoachRuntimeState } from "../core/sessions.js";
import type { CoachSessionSummary } from "../ai/coaching-prompt.js";
import type { SessionMessage } from "../core/types.js";

async function createClientDist() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "codence-client-"));
  await writeFile(path.join(dir, "index.html"), "<!doctype html><html><body></body></html>", "utf8");
  return dir;
}

async function createTempDbPath(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "codence-db-"));
  return path.join(dir, "codence.sqlite");
}

async function setupApp(coachRuntime?: CoachRuntime) {
  const clientDistDir = await createClientDist();
  const dbPath = await createTempDbPath();

  const app = await createApp({
    clientDistDir,
    dbPath,
    now: () => new Date("2026-04-08T12:00:00.000Z"),
    services: { coachRuntime: coachRuntime ?? createStubCoachRuntime() },
  });

  await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
  const queueNext = await app.inject({ method: "POST", url: "/api/queue/next" });
  const session = queueNext.json().session;

  return { app, session, clientDistDir, dbPath };
}

async function cleanup(app: Awaited<ReturnType<typeof createApp>>, dbPath: string, clientDistDir: string) {
  await app.close();
  await rm(path.dirname(dbPath), { recursive: true, force: true });
  await rm(clientDistDir, { recursive: true, force: true });
}

function parseSSE(body: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  const blocks = body.split("\n\n").filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) event = line.slice(7);
      if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (event && data) {
      try { events.push({ event, data: JSON.parse(data) }); } catch { events.push({ event, data }); }
    }
  }
  return events;
}

describe("coach route", () => {
  test("streams text deltas as SSE events", async () => {
    const { app, session, clientDistDir, dbPath } = await setupApp(
      createStubCoachRuntime([{
        text: "Try using a hash map.",
        metadata: { help_level: 0.3, information_revealed: ["pattern_name"], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false },
        runtimeSessionId: "runtime-1",
        backend: "stub",
      }]),
    );

    try {
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "Help me?", currentStepId: "understanding" },
      });

      expect(response.headers["content-type"]).toBe("text/event-stream");
      const events = parseSSE(response.body);
      const deltas = events.filter(e => e.event === "delta");
      expect(deltas.length).toBeGreaterThanOrEqual(1);
      expect((deltas[0].data as { text: string }).text).toBe("Try using a hash map.");
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("streams metadata as final SSE event", async () => {
    const { app, session, clientDistDir, dbPath } = await setupApp(
      createStubCoachRuntime([{
        text: "Good question.",
        metadata: { help_level: 0.2, information_revealed: [], user_appears_stuck: false, user_understanding: "solid", notable_mistake: null, gave_full_solution: false },
        runtimeSessionId: "runtime-1",
        backend: "stub",
      }]),
    );

    try {
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "Is this right?", currentStepId: "understanding" },
      });

      const events = parseSSE(response.body);
      const metaEvents = events.filter(e => e.event === "metadata");
      expect(metaEvents.length).toBe(1);
      expect((metaEvents[0].data as { help_level: number }).help_level).toBe(0.2);
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("persists user and assistant messages on session", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { coachRuntime: createStubCoachRuntime() },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
      const qn = await app.inject({ method: "POST", url: "/api/queue/next" });
      const sess = qn.json().session;

      await app.inject({
        method: "POST",
        url: `/api/sessions/${sess.sessionId}/coach`,
        payload: { message: "I need help", currentStepId: "understanding" },
      });

      const db = createDatabase(dbPath);
      const sessionRow = db.select().from(sessions).where(eq(sessions.id, sess.sessionId)).get();
      const messages = (sessionRow?.messages ?? []) as SessionMessage[];
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(expect.objectContaining({ role: "user", content: "I need help" }));
      expect(messages[1]).toEqual(expect.objectContaining({ role: "assistant" }));
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("persists the app-decided coachAction on assistant messages", async () => {
    const { app, session, clientDistDir, dbPath } = await setupApp(
      createStubCoachRuntime([{
        text: "Binary search runs in logarithmic time.",
        metadata: { help_level: 0.2, information_revealed: [], user_appears_stuck: false, user_understanding: "solid", notable_mistake: null, gave_full_solution: false },
        runtimeSessionId: "runtime-1",
        backend: "stub",
      }]),
    );

    try {
      await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: {
          message: "What is the time complexity of binary search?",
          currentStepId: "understanding",
        },
      });

      const db = createDatabase(dbPath);
      const sessionRow = db.select().from(sessions).where(eq(sessions.id, session.sessionId)).get();
      const messages = (sessionRow?.messages ?? []) as Array<Record<string, unknown>>;
      const assistant = [...messages].reverse().find((message: Record<string, unknown>) => message.role === "assistant");

      expect(assistant?.coachAction).toBe("answer_direct_question");
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("threads the app-decided coach action into the runtime prompt", async () => {
    const sendTurnSpy = vi.fn<(input: unknown) => Promise<CoachRuntimeTurnResult>>();
    sendTurnSpy.mockResolvedValue({
      text: "Can you say a little more?",
      metadata: { help_level: 0.1, information_revealed: [], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false },
      runtimeSessionId: "runtime-1",
      backend: "stub",
    });
    const coachRuntime: CoachRuntime = {
      sendTurn: sendTurnSpy,
      async releaseSession() {},
    };
    const { app, session, clientDistDir, dbPath } = await setupApp(coachRuntime);

    try {
      await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "ok", currentStepId: "understanding" },
      });

      const sentInput = sendTurnSpy.mock.calls[0][0] as { systemPrompt: SystemPrompt };
      expect(flattenSystemPrompt(sentInput.systemPrompt)).toContain(
        "App-decided coaching action: ask_for_specificity",
      );
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("drops malformed runtime metadata instead of persisting it", async () => {
    const malformedRuntime = createStubCoachRuntime([{
      text: "This is still useful.",
      metadata: { help_level: "high" } as unknown as CoachRuntimeTurnResult["metadata"],
      runtimeSessionId: "runtime-1",
      backend: "stub",
    }]);
    const { app, session, clientDistDir, dbPath } = await setupApp(malformedRuntime);

    try {
      await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "Help", currentStepId: "understanding" },
      });

      const db = createDatabase(dbPath);
      const sessionRow = db.select().from(sessions).where(eq(sessions.id, session.sessionId)).get();
      const messages = (sessionRow?.messages ?? []) as Array<Record<string, unknown>>;
      const assistant = [...messages].reverse().find((message: Record<string, unknown>) => message.role === "assistant");

      expect(assistant).toEqual(expect.objectContaining({
        role: "assistant",
        coachAction: "ask_for_specificity",
      }));
      expect(assistant).not.toHaveProperty("metadata");
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("transitions session to in_progress on first coach call", async () => {
    const { app, session, clientDistDir, dbPath } = await setupApp();

    try {
      expect(session.status).toBe("created");

      await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "Hello", currentStepId: "understanding" },
      });

      const detail = await app.inject({
        method: "GET",
        url: `/api/sessions/${session.sessionId}`,
      });
      expect(detail.json().status).toBe("in_progress");
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("ERR-1 missing coach runtime surfaces a coach-specific configuration error", async () => {
    const { app, session, clientDistDir, dbPath } = await setupApp(createUnconfiguredCoachRuntime());

    try {
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "Help", currentStepId: "understanding" },
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ error: "Coach runtime is not configured" });
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("rejects completed or abandoned sessions", async () => {
    const { app, session, clientDistDir, dbPath } = await setupApp();

    try {
      await app.inject({ method: "POST", url: `/api/sessions/${session.sessionId}/complete` });

      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "More help", currentStepId: "understanding" },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: "Session is not active" });
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("handles missing tool_use event gracefully", async () => {
    const { app, session, clientDistDir, dbPath } = await setupApp(
      createStubCoachRuntime([{ text: "Just text, no metadata.", metadata: null, runtimeSessionId: "runtime-1", backend: "stub" }]),
    );

    try {
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "Help", currentStepId: "understanding" },
      });

      const events = parseSSE(response.body);
      expect(events.some(e => e.event === "delta")).toBe(true);
      expect(events.some(e => e.event === "done")).toBe(true);
      expect(events.filter(e => e.event === "metadata").length).toBe(0);
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("rejects empty user message", async () => {
    const { app, session, clientDistDir, dbPath } = await setupApp();

    try {
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "", currentStepId: "understanding" },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("returns 404 for nonexistent session", async () => {
    const { app, clientDistDir, dbPath } = await setupApp();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/sessions/nonexistent/coach",
        payload: { message: "Help", currentStepId: "understanding" },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Session not found" });
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("handles adapter error mid-stream gracefully", async () => {
    const failingRuntime: CoachRuntime = {
      async sendTurn() { throw new Error("Network failure"); },
      async releaseSession() {},
    };
    const { app, session, clientDistDir, dbPath } = await setupApp(failingRuntime);

    try {
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "Help", currentStepId: "understanding" },
      });

      expect(response.statusCode).toBe(500);
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("AC-1 coach route resumes and persists claude runtime state across turns", async () => {
    const turnResults: CoachRuntimeTurnResult[] = [
      {
        text: "First turn response.",
        metadata: { help_level: 0.2, information_revealed: [], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false },
        runtimeSessionId: "claude-session-xyz",
        backend: "claude-code",
      },
      {
        text: "Second turn response.",
        metadata: { help_level: 0.3, information_revealed: [], user_appears_stuck: false, user_understanding: "solid", notable_mistake: null, gave_full_solution: false },
        runtimeSessionId: "claude-session-xyz",
        backend: "claude-code",
      },
    ];
    const sendTurnSpy = vi.fn<(input: unknown) => Promise<CoachRuntimeTurnResult>>();
    sendTurnSpy
      .mockResolvedValueOnce(turnResults[0])
      .mockResolvedValueOnce(turnResults[1]);
    const coachRuntime: CoachRuntime = {
      sendTurn: sendTurnSpy,
      async releaseSession() {},
    };
    const { app, session, clientDistDir, dbPath } = await setupApp(coachRuntime);

    try {
      // First turn
      await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "First question", currentStepId: "understanding" },
      });

      // Verify runtime state was persisted
      const db1 = createDatabase(dbPath);
      const row1 = db1.select().from(sessions).where(eq(sessions.id, session.sessionId)).get();
      const state1 = row1?.coachRuntimeState as CoachRuntimeState | null;
      expect(state1).toBeTruthy();
      expect(state1!.runtimeSessionId).toBe("claude-session-xyz");
      expect(state1!.backend).toBe("claude-code");

      // Second turn — should pass existingRuntimeSessionId
      await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "Follow up", currentStepId: "understanding" },
      });

      // Verify the second call received the stored runtime session ID
      const secondCallInput = sendTurnSpy.mock.calls[1][0] as { existingRuntimeSessionId: string | null; isFirstTurn: boolean };
      expect(secondCallInput.existingRuntimeSessionId).toBe("claude-session-xyz");
      expect(secondCallInput.isFirstTurn).toBe(false);

      // Verify state was refreshed
      const db2 = createDatabase(dbPath);
      const row2 = db2.select().from(sessions).where(eq(sessions.id, session.sessionId)).get();
      const state2 = row2?.coachRuntimeState as CoachRuntimeState | null;
      expect(state2!.runtimeSessionId).toBe("claude-session-xyz");
      expect(state2!.lastUsedAt).toBeDefined();
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("ERR-1 coach route returns 503 when coach runtime is not configured", async () => {
    const { app, session, clientDistDir, dbPath } = await setupApp(createUnconfiguredCoachRuntime());

    try {
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "Help", currentStepId: "understanding" },
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ error: "Coach runtime is not configured" });
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("coach route persists deterministic session summaries after successful turns", async () => {
    const turnResults: CoachRuntimeTurnResult[] = [
      {
        text: "Think about edge cases.",
        metadata: { help_level: 0.3, information_revealed: ["edge_case_hint"], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false },
        runtimeSessionId: "rt-1",
        backend: "stub",
      },
      {
        text: "Good, now consider duplicates.",
        metadata: { help_level: 0.4, information_revealed: ["duplicate_hint"], user_appears_stuck: false, user_understanding: "solid", notable_mistake: "off_by_one", gave_full_solution: false },
        runtimeSessionId: "rt-1",
        backend: "stub",
      },
      {
        text: "Almost there.",
        metadata: { help_level: 0.2, information_revealed: [], user_appears_stuck: false, user_understanding: "solid", notable_mistake: null, gave_full_solution: false },
        runtimeSessionId: "rt-1",
        backend: "stub",
      },
    ];
    const { app, session, clientDistDir, dbPath } = await setupApp(
      createStubCoachRuntime(turnResults),
    );

    try {
      // Send 3 coach turns
      for (const msg of ["q1", "q2", "q3"]) {
        await app.inject({
          method: "POST",
          url: `/api/sessions/${session.sessionId}/coach`,
          payload: { message: msg, currentStepId: "understanding" },
        });
      }

      // Verify summary was persisted on runtime state
      const db = createDatabase(dbPath);
      const row = db.select().from(sessions).where(eq(sessions.id, session.sessionId)).get();
      const runtimeState = row?.coachRuntimeState as CoachRuntimeState & { summary?: CoachSessionSummary } | null;

      expect(runtimeState).toBeTruthy();
      expect(runtimeState!.summary).toBeTruthy();
      expect(runtimeState!.summary!.turnCount).toBe(3);
      expect(runtimeState!.summary!.currentStepId).toBe("understanding");
      expect(runtimeState!.summary!.revealedInformation).toContain("edge_case_hint");
      expect(runtimeState!.summary!.revealedInformation).toContain("duplicate_hint");
      expect(runtimeState!.summary!.openWeakpoints).toContain("off_by_one");
      expect(typeof runtimeState!.summary!.conversationSummary).toBe("string");
      expect(runtimeState!.summary!.conversationSummary.length).toBeGreaterThan(0);
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("runtime state without summary still threads conversation history via priorHistory", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const sendTurnSpy = vi.fn<(input: unknown) => Promise<CoachRuntimeTurnResult>>();
    sendTurnSpy.mockResolvedValue({
      text: "Fallback response.",
      metadata: { help_level: 0.2, information_revealed: [], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false },
      runtimeSessionId: "rt-1",
      backend: "stub",
    });
    const coachRuntime: CoachRuntime = {
      sendTurn: sendTurnSpy,
      async releaseSession() {},
    };
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { coachRuntime },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
      const qn = await app.inject({ method: "POST", url: "/api/queue/next" });
      const sess = qn.json().session;

      // Manually persist runtime state WITHOUT summary (simulating old/migrated data)
      const db = createDatabase(dbPath);
      db.update(sessions)
        .set({
          coachRuntimeState: {
            backend: "stub",
            runtimeSessionId: "rt-1",
            startedAt: "2026-04-08T12:00:00Z",
            lastUsedAt: "2026-04-08T12:00:00Z",
            // NOTE: no summary field
          },
          messages: [
            { role: "user", content: "old msg 1", createdAt: "t1" },
            { role: "assistant", content: "old resp 1", createdAt: "t2" },
            { role: "user", content: "old msg 2", createdAt: "t3" },
            { role: "assistant", content: "old resp 2", createdAt: "t4" },
            { role: "user", content: "old msg 3", createdAt: "t5" },
            { role: "assistant", content: "old resp 3", createdAt: "t6" },
          ],
        })
        .where(eq(sessions.id, sess.sessionId))
        .run();

      // Send a turn — should succeed using full-context fallback
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${sess.sessionId}/coach`,
        payload: { message: "Another question", currentStepId: "understanding" },
      });

      expect(response.statusCode).toBe(200);
      const events = parseSSE(response.body);
      expect(events.some(e => e.event === "delta")).toBe(true);

      // Conversation history is threaded through priorHistory, not the system prompt.
      const sentInput = sendTurnSpy.mock.calls[0][0] as {
        systemPrompt: SystemPrompt;
        priorHistory: ReadonlyArray<{ role: string; content: string }>;
      };
      expect(sentInput.priorHistory).toEqual([
        { role: "user", content: "old msg 1" },
        { role: "assistant", content: "old resp 1" },
        { role: "user", content: "old msg 2" },
        { role: "assistant", content: "old resp 2" },
        { role: "user", content: "old msg 3" },
        { role: "assistant", content: "old resp 3" },
      ]);
      // And definitely NOT baked into the system prompt.
      expect(flattenSystemPrompt(sentInput.systemPrompt)).not.toContain("Previous conversation");
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("runtime state without summary still derives a fallback session summary for coach policy", async () => {
    const sendTurnSpy = vi.fn<(input: unknown) => Promise<CoachRuntimeTurnResult>>();
    sendTurnSpy.mockResolvedValue({
      text: "Here is a hint.",
      metadata: { help_level: 0.3, information_revealed: [], user_appears_stuck: false, user_understanding: "partial", notable_mistake: "stuck_on_approach", gave_full_solution: false },
      runtimeSessionId: "rt-legacy",
      backend: "stub",
    });
    const coachRuntime: CoachRuntime = {
      sendTurn: sendTurnSpy,
      async releaseSession() {},
    };
    const { app, session, clientDistDir, dbPath } = await setupApp(coachRuntime);

    try {
      const db = createDatabase(dbPath);
      db.update(sessions)
        .set({
          coachRuntimeState: {
            backend: "stub",
            runtimeSessionId: "rt-legacy",
            startedAt: "2026-04-08T12:00:00Z",
            lastUsedAt: "2026-04-08T12:00:00Z",
          },
          messages: [
            {
              role: "user",
              content: "first try",
              createdAt: "t1",
            },
            {
              role: "assistant",
              content: "first response",
              createdAt: "t2",
              metadata: {
                help_level: 0.4,
                information_revealed: [],
                user_appears_stuck: false,
                user_understanding: "partial",
                notable_mistake: "stuck_on_approach",
                gave_full_solution: false,
              },
            },
            {
              role: "user",
              content: "second try",
              createdAt: "t3",
            },
            {
              role: "assistant",
              content: "second response",
              createdAt: "t4",
              metadata: {
                help_level: 0.5,
                information_revealed: [],
                user_appears_stuck: false,
                user_understanding: "partial",
                notable_mistake: "stuck_on_approach",
                gave_full_solution: false,
              },
            },
            {
              role: "user",
              content: "third try",
              createdAt: "t5",
            },
            {
              role: "assistant",
              content: "third response",
              createdAt: "t6",
              metadata: {
                help_level: 0.6,
                information_revealed: [],
                user_appears_stuck: false,
                user_understanding: "partial",
                notable_mistake: "stuck_on_approach",
                gave_full_solution: false,
              },
            },
          ],
        })
        .where(eq(sessions.id, session.sessionId))
        .run();

      await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "I see what you mean about that", currentStepId: "understanding" },
      });

      const sessionRow = db.select().from(sessions).where(eq(sessions.id, session.sessionId)).get();
      const messages = (sessionRow?.messages ?? []) as Array<Record<string, unknown>>;
      const assistant = [...messages].reverse().find((message: Record<string, unknown>) => message.role === "assistant");
      expect(assistant?.coachAction).toBe("give_hint");
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("AC-3 coach route persists chosen coachAction on assistant messages", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { coachRuntime: createStubCoachRuntime() },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
      const qn = await app.inject({ method: "POST", url: "/api/queue/next" });
      const sess = qn.json().session;

      // First, do a normal coach turn to populate the session
      await app.inject({
        method: "POST",
        url: `/api/sessions/${sess.sessionId}/coach`,
        payload: { message: "I need help with this", currentStepId: "understanding" },
      });

      // Manually add an assistant message with coachAction to verify the shape is storable
      // and doesn't break existing readers (simulates future Task 004 wiring)
      const db = createDatabase(dbPath);
      const sessionRow = db.select().from(sessions).where(eq(sessions.id, sess.sessionId)).get();
      const existingMessages = (sessionRow?.messages ?? []) as Array<Record<string, unknown>>;

      const messageWithAction = {
        role: "assistant",
        content: "Try thinking about edge cases.",
        createdAt: "2026-04-08T12:01:00.000Z",
        metadata: { help_level: 0.3, information_revealed: [], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false },
        coachAction: "give_hint",
      };

      db.update(sessions)
        .set({ messages: [...existingMessages, messageWithAction] })
        .where(eq(sessions.id, sess.sessionId))
        .run();

      // Verify the message was persisted with coachAction intact
      const updatedRow = db.select().from(sessions).where(eq(sessions.id, sess.sessionId)).get();
      const messages = (updatedRow?.messages ?? []) as Array<Record<string, unknown>>;
      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.coachAction).toBe("give_hint");
      expect(lastMsg.content).toBe("Try thinking about edge cases.");
      expect(lastMsg.metadata).toBeDefined();

      // Verify a subsequent coach turn still works (existing readers not broken)
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${sess.sessionId}/coach`,
        payload: { message: "What about duplicates?", currentStepId: "understanding" },
      });
      expect(response.statusCode).toBe(200);
    } finally {
      await cleanup(app, dbPath, clientDistDir);
    }
  });

  test("ERR-1 coach route falls back to empty memory snapshot when memory loading fails", async () => {
    const snapshotSpy = vi
      .spyOn(coachMemory, "loadCoachMemorySnapshot")
      .mockImplementation(() => {
        throw new Error("snapshot failed");
      });
    const { app, session, clientDistDir, dbPath } = await setupApp(
      createStubCoachRuntime([
        {
          text: "Try checking the invariant first.",
          metadata: {
            help_level: 0.2,
            information_revealed: ["pattern_hint"],
            user_appears_stuck: false,
            user_understanding: "partial",
            notable_mistake: null,
            gave_full_solution: false,
          },
          runtimeSessionId: "runtime-1",
          backend: "stub",
        },
      ]),
    );

    try {
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${session.sessionId}/coach`,
        payload: { message: "Where should I start?", currentStepId: "understanding" },
      });

      const events = parseSSE(response.body);
      expect(response.statusCode).toBe(200);
      expect(snapshotSpy).toHaveBeenCalled();
      expect(events.some((event) => event.event === "delta")).toBe(true);
      expect(events.some((event) => event.event === "done")).toBe(true);
    } finally {
      snapshotSpy.mockRestore();
      await cleanup(app, dbPath, clientDistDir);
    }
  });
});
