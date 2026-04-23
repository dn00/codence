import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../persistence/db.js";
import type { CompletionLLM } from "../ai/llm-adapter.js";
import type { CoachRuntime } from "../ai/coach-runtime.js";
import type { ExecutionAdapter } from "../execution/executor.js";
import { startNextQueueSession, skipCurrentSessionAndSelectNext } from "../core/queue.js";
import { getActiveLearnspace, getDefaultUser } from "../core/bootstrap.js";
import { getCoachRuntimeState, saveCoachRuntimeState } from "../core/sessions.js";

export interface QueueRouteDependencies {
  db: AppDatabase;
  now: () => Date;
  completionLLM: CompletionLLM;
  coachRuntime: CoachRuntime;
  executionAdapter: ExecutionAdapter;
}

export function registerQueueRoutes(
  app: FastifyInstance,
  dependencies: QueueRouteDependencies,
): void {
  app.post("/api/queue/next", async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const targetSkillId = typeof body.targetSkillId === "string" ? body.targetSkillId.trim() || undefined : undefined;
    const targetItemId = typeof body.targetItemId === "string" ? body.targetItemId.trim() || undefined : undefined;
    const trackId = typeof body.trackId === "string" ? body.trackId.trim() || undefined : undefined;
    const forceGenerated = body.forceGenerated === true;

    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);
    const result = await startNextQueueSession(dependencies, {
      userId: user.id,
      learnspaceId: learnspace.id,
      trackId,
      targetSkillId,
      targetItemId,
      forceGenerated,
    });

    if (result.type === "empty") {
      reply.code(409).send({ error: result.message });
      return;
    }

    reply.send({
      session: result.session,
      selection: result.selection,
    });
  });

  app.post("/api/sessions/:id/skip", async (request, reply) => {
    const params = request.params as { id: string };
    const skipBody = (request.body ?? {}) as Record<string, unknown>;
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);
    const resolvedTrackId = typeof skipBody.trackId === "string" ? skipBody.trackId.trim() || undefined : undefined;

    // Release coach runtime session and clear persisted state (best-effort)
    let skipRuntimeSessionId: string | null = null;
    try {
      const runtimeState = getCoachRuntimeState(dependencies.db, params.id);
      skipRuntimeSessionId = runtimeState?.runtimeSessionId ?? null;
    } catch { /* session may not exist yet */ }
    dependencies.coachRuntime.releaseSession({
      appSessionId: params.id,
      runtimeSessionId: skipRuntimeSessionId,
    }).catch(() => {});
    try {
      saveCoachRuntimeState(dependencies.db, { sessionId: params.id, state: null });
    } catch { /* best-effort */ }
    const result = await skipCurrentSessionAndSelectNext(dependencies, {
      sessionId: params.id,
      trackId: resolvedTrackId,
    });

    if (result.type === "empty") {
      reply.code(409).send({ error: result.message });
      return;
    }

    reply.send({
      session: result.session,
      selection: result.selection,
    });
  });
}
