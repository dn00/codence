import type { FastifyInstance } from "fastify";
import type { EvaluationService } from "../runtime-services.js";
import type { CoachRuntime } from "../ai/coach-runtime.js";
import { completeSessionAttempt, MissingPrimaryQueueRowError, SessionCompletionError } from "../core/completion.js";
import type { AppDatabase } from "../persistence/db.js";
import {
  abandonSession,
  getCoachRuntimeState,
  getSessionDetail,
  saveCoachRuntimeState,
  saveSessionStep,
  SessionNotFoundError,
} from "../core/sessions.js";

export interface SessionRouteDependencies {
  db: AppDatabase;
  now: () => Date;
  evaluationService: EvaluationService;
  coachRuntime: CoachRuntime;
}

export function registerSessionRoutes(
  app: FastifyInstance,
  dependencies: SessionRouteDependencies,
): void {
  app.get("/api/sessions/:id", async (request, reply) => {
    const params = request.params as { id: string };

    try {
      reply.send(getSessionDetail({ db: dependencies.db }, { sessionId: params.id }));
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        reply.code(404).send({ error: "Session not found" });
        return;
      }
      throw error;
    }
  });

  app.patch("/api/sessions/:id/step", async (request, reply) => {
    const params = request.params as { id: string };
    const body = (request.body ?? {}) as { stepId?: unknown; content?: unknown };

    if (typeof body.stepId !== "string" || body.stepId.trim().length === 0 || typeof body.content !== "string") {
      reply.code(400).send({ error: "Invalid session step payload" });
      return;
    }

    try {
      reply.send(
        saveSessionStep(dependencies, {
          sessionId: params.id,
          stepId: body.stepId,
          content: body.content,
        }),
      );
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        reply.code(404).send({ error: "Session not found" });
        return;
      }
      throw error;
    }
  });

  app.post("/api/sessions/:id/abandon", async (request, reply) => {
    const params = request.params as { id: string };

    try {
      // Release coach runtime session and clear persisted state (best-effort)
      const runtimeState = getCoachRuntimeState(dependencies.db, params.id);
      dependencies.coachRuntime
        .releaseSession({
          appSessionId: params.id,
          runtimeSessionId: runtimeState?.runtimeSessionId ?? null,
        })
        .catch(() => {});
      saveCoachRuntimeState(dependencies.db, { sessionId: params.id, state: null });

      const result = abandonSession(dependencies, { sessionId: params.id });
      reply.send(result);
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        reply.code(404).send({ error: "Session not found" });
        return;
      }
      throw error;
    }
  });

  app.post("/api/sessions/:id/complete", async (request, reply) => {
    const params = request.params as { id: string };

    try {
      const result = await completeSessionAttempt(dependencies, { sessionId: params.id });
      // Release coach runtime session and clear persisted state (best-effort)
      const runtimeState = getCoachRuntimeState(dependencies.db, params.id);
      dependencies.coachRuntime.releaseSession({
        appSessionId: params.id,
        runtimeSessionId: runtimeState?.runtimeSessionId ?? null,
      }).catch(() => {});
      saveCoachRuntimeState(dependencies.db, { sessionId: params.id, state: null });
      reply.send(result);
    } catch (error) {
      if (error instanceof MissingPrimaryQueueRowError) {
        reply.code(409).send({ error: error.message });
        return;
      }
      if (error instanceof SessionCompletionError) {
        if (error.message === "Session not found" || error.message.startsWith("Unknown session:")) {
          reply.code(404).send({ error: "Session not found" });
          return;
        }
        reply.code(409).send({ error: error.message });
        return;
      }
      throw error;
    }
  });
}
