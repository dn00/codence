import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  createEmptyCoachMemorySnapshot,
  loadCoachMemorySnapshot,
} from "../ai/coach-memory.js";
import {
  CoachRuntimeUnavailableError,
  type CoachRuntime,
} from "../ai/coach-runtime.js";
import { cleanupExpiredCoachSessions } from "../ai/coach-runtime-cleanup.js";
import { incrementExpiredSessions, incrementResumedTurns } from "../ai/runtime-diagnostics.js";
import { assembleCoachingPrompt, buildCoachSessionSummary } from "../ai/coaching-prompt.js";
import { assessTurn } from "../ai/coach-policy.js";
import { normalizeCoachingMetadata } from "../ai/coach-metadata.js";
import {
  getCoachRuntimeState,
  getSessionDetail,
  saveCoachRuntimeState,
  SessionNotFoundError,
  type CoachRuntimeState,
} from "../core/sessions.js";
import type { AppDatabase } from "../persistence/db.js";
import type { SessionMessage } from "../core/types.js";
import { attempts, items, learnspaces, sessions } from "../persistence/schema.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import { loadAttemptBlueprintForSession } from "../runtime/attempt-blueprint.js";

/** Default idle TTL for coach runtime sessions: 30 minutes. */
const COACH_IDLE_TTL_MS = 30 * 60 * 1000;

export interface CoachRouteDependencies {
  db: AppDatabase;
  now: () => Date;
  coachRuntime: CoachRuntime;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function registerCoachRoute(
  app: FastifyInstance,
  dependencies: CoachRouteDependencies,
): void {
  app.post("/api/sessions/:id/coach", async (request, reply) => {
    const params = request.params as { id: string };
    const body = (request.body ?? {}) as { message?: unknown; currentStepId?: unknown };

    if (typeof body.message !== "string" || body.message.trim().length === 0) {
      reply.code(400).send({ error: "Request body must include a non-empty message" });
      return;
    }
    if (typeof body.currentStepId !== "string" || body.currentStepId.trim().length === 0) {
      reply.code(400).send({ error: "Request body must include currentStepId" });
      return;
    }

    // Opportunistic cleanup of expired coach runtime sessions (best-effort, no-throw)
    try {
      const allSessions = dependencies.db.select().from(sessions).all();
      const withRuntime = allSessions
        .filter((s): s is typeof s & { coachRuntimeState: CoachRuntimeState } =>
          s.coachRuntimeState != null && s.id !== params.id)
        .map((s) => ({ sessionId: s.id, coachRuntimeState: s.coachRuntimeState }));
      if (withRuntime.length > 0) {
        cleanupExpiredCoachSessions({
          sessions: withRuntime,
          now: dependencies.now(),
          idleTtlMs: COACH_IDLE_TTL_MS,
          coachRuntime: dependencies.coachRuntime,
          saveCoachRuntimeState: (sessionId, state) =>
            saveCoachRuntimeState(dependencies.db, { sessionId, state }),
        }).then((count) => { if (count > 0) incrementExpiredSessions(count); }).catch(() => {});
      }
    } catch { /* best-effort */ }

    let sessionDetail;
    try {
      sessionDetail = getSessionDetail({ db: dependencies.db }, { sessionId: params.id });
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        reply.code(404).send({ error: "Session not found" });
        return;
      }
      throw error;
    }

    if (sessionDetail.status !== "created" && sessionDetail.status !== "in_progress") {
      reply.code(409).send({ error: "Session is not active" });
      return;
    }

    // Session-time coaching must execute against the pinned attempt
    // contract, not ad hoc reads from mutable live learnspace config.
    const blueprint = loadAttemptBlueprintForSession(dependencies.db, params.id);
    const learnspaceConfig = blueprint.config as LearnspaceConfig;

    // Load conversation history from session
    const sessionRow = dependencies.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, params.id))
      .get();
    const existingMessages: SessionMessage[] = Array.isArray(sessionRow?.messages)
      ? (sessionRow!.messages as SessionMessage[])
      : [];

    // Load coach memory
    const primarySkillId = blueprint.item.skillIds.length > 0
      ? blueprint.item.skillIds[0]
      : null;
    const attempt = dependencies.db
      .select()
      .from(attempts)
      .where(eq(attempts.sessionId, params.id))
      .get();
    let coachMemory = createEmptyCoachMemorySnapshot(primarySkillId ?? "unknown-skill");
    if (primarySkillId) {
      try {
        coachMemory = loadCoachMemorySnapshot(
          dependencies.db,
          primarySkillId,
          sessionDetail.learnspaceId,
          attempt?.userId ?? "local-user",
        );
      } catch {
        coachMemory = createEmptyCoachMemorySnapshot(primarySkillId);
      }
    }

    // Load persisted runtime state for resume
    const existingRuntimeState = getCoachRuntimeState(dependencies.db, params.id);

    const step = learnspaceConfig.protocol_steps.find(
      (currentStep) => currentStep.id === body.currentStepId,
    );
    if (!step) {
      reply.code(400).send({ error: `Invalid step ID: ${String(body.currentStepId)}` });
      return;
    }

    const policySessionSummary = existingRuntimeState?.summary
      ?? (existingMessages.length > 0
        ? buildCoachSessionSummary(
            existingMessages as Array<{ role: string; content: string; createdAt: string; metadata?: Record<string, unknown> | null }>,
            body.currentStepId,
          )
        : null);

    const coachDecision = assessTurn({
      userMessage: body.message,
      currentStepId: body.currentStepId,
      currentStep: step,
      stepDrafts: sessionDetail.stepDrafts,
      coachMemory,
      sessionSummary: policySessionSummary,
    });

    // Assemble prompt. Conversation history is NOT embedded here — it's
    // threaded into the adapter's structured messages[] via priorHistory.
    const itemContent = blueprint.item.content;
    const prompt = assembleCoachingPrompt({
      learnspaceConfig,
      currentStepId: body.currentStepId as string,
      itemTitle: blueprint.item.title,
      itemPrompt: typeof itemContent?.prompt === "string" ? itemContent.prompt : "",
      stepDrafts: sessionDetail.stepDrafts,
      coachMemory,
      coachDecision,
      userMessage: body.message as string,
    });

    // Project persisted transcript into the adapter's priorHistory shape
    // (role + content only). Already metadata-stripped by the persistence layer.
    const priorHistory = existingMessages
      .filter((m): m is SessionMessage & { role: "user" | "assistant" } =>
        m.role === "user" || m.role === "assistant",
      )
      .map((m) => ({ role: m.role, content: m.content }));

    // Call coach runtime
    const isResume = existingRuntimeState?.runtimeSessionId != null;
    let result;
    try {
      result = await dependencies.coachRuntime.sendTurn({
        appSessionId: params.id,
        systemPrompt: prompt.systemBlocks,
        userMessage: prompt.userMessage,
        isFirstTurn: existingMessages.length === 0,
        existingRuntimeSessionId: existingRuntimeState?.runtimeSessionId ?? null,
        priorHistory,
      });
    } catch (error) {
      if (error instanceof CoachRuntimeUnavailableError) {
        reply.code(503).send({ error: error.message });
        return;
      }
      throw error;
    }

    // Track resume diagnostics
    if (isResume) incrementResumedTurns();

    // Persist messages (include metadata on assistant messages for completion overrides)
    const nowStr = dependencies.now().toISOString();
    const userMsg = { role: "user" as const, content: body.message as string, createdAt: nowStr };
    const assistantMsg: Record<string, unknown> = {
      role: "assistant",
      content: result.text,
      createdAt: nowStr,
      coachAction: coachDecision.action,
    };
    const metadata = normalizeCoachingMetadata(result.metadata);
    if (metadata) {
      assistantMsg.metadata = metadata;
    }
    const updatedMessages = [
      ...existingMessages,
      userMsg,
      assistantMsg,
    ];

    // Build deterministic session summary from the full message list
    const sessionSummary = buildCoachSessionSummary(
      updatedMessages as Array<{ role: string; content: string; createdAt: string; metadata?: Record<string, unknown> | null }>,
      body.currentStepId as string,
    );

    // Persist runtime state with summary
    saveCoachRuntimeState(dependencies.db, {
      sessionId: params.id,
      state: {
        backend: result.backend,
        runtimeSessionId: result.runtimeSessionId,
        startedAt: existingRuntimeState?.startedAt ?? nowStr,
        lastUsedAt: nowStr,
        summary: sessionSummary,
      },
    });

    const statusUpdate: Record<string, unknown> = {
      messages: updatedMessages,
    };
    if (sessionDetail.status === "created") {
      statusUpdate.status = "in_progress";
    }

    dependencies.db
      .update(sessions)
      .set(statusUpdate)
      .where(eq(sessions.id, params.id))
      .run();

    // Send SSE response
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    reply.raw.write(sseEvent("delta", { text: result.text }));

    if (result.metadata) {
      reply.raw.write(sseEvent("metadata", result.metadata));
    }

    reply.raw.write(sseEvent("done", {}));
    reply.raw.end();
  });
}
