import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ExecutionAdapter } from "../execution/executor.js";
import { prepareExecutionInput } from "../execution/executor.js";
import { getSessionDetail, SessionNotFoundError } from "../core/sessions.js";
import type { AppDatabase } from "../persistence/db.js";
import { attempts } from "../persistence/schema.js";
import { loadAttemptBlueprintForSession } from "../runtime/attempt-blueprint.js";

export interface ExecuteRouteDependencies {
  db: AppDatabase;
  now: () => Date;
  executionAdapter: ExecutionAdapter;
}

export function registerExecuteRoute(
  app: FastifyInstance,
  dependencies: ExecuteRouteDependencies,
): void {
  app.post("/api/sessions/:id/execute", async (request, reply) => {
    const params = request.params as { id: string };
    const body = (request.body ?? {}) as { code?: unknown };

    if (typeof body.code !== "string" || body.code.trim().length === 0) {
      reply.code(400).send({ error: "Request body must include a non-empty code string" });
      return;
    }

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

    // Execution must read the pinned attempt contract so later learnspace
    // edits do not reinterpret historical or in-flight sessions.
    const blueprint = loadAttemptBlueprintForSession(dependencies.db, params.id);
    const learnspaceConfig = blueprint.config;

    if (!learnspaceConfig.executor) {
      reply.code(409).send({ error: "Learnspace does not define an executor" });
      return;
    }

    const attempt = dependencies.db
      .select()
      .from(attempts)
      .where(eq(attempts.sessionId, sessionDetail.sessionId))
      .get();

    if (!attempt) {
      reply.code(404).send({ error: "Attempt not found for session" });
      return;
    }

    const prepared = prepareExecutionInput(learnspaceConfig, blueprint.item.content);
    const result = await dependencies.executionAdapter.execute(body.code, prepared.testHarness);

    dependencies.db
      .update(attempts)
      .set({ testResults: result as unknown as Record<string, unknown> })
      .where(eq(attempts.id, attempt.id))
      .run();

    reply.send(result);
  });
}
