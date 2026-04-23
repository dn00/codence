import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AppDatabase } from "../persistence/db.js";
import { getProgressSummary } from "../core/queue.js";
import { getActiveLearnspace, getDefaultUser } from "../core/bootstrap.js";
import { getSkillDrilldown } from "../core/drilldown.js";
import { skillConfidence, items, itemQueue, queue } from "../persistence/schema.js";

export interface ProgressRouteDependencies {
  db: AppDatabase;
  now: () => Date;
}

export function registerProgressRoute(
  app: FastifyInstance,
  dependencies: ProgressRouteDependencies,
): void {
  app.get("/api/progress", async (_request, reply) => {
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);

    reply.send(
      getProgressSummary(dependencies, {
        userId: user.id,
        learnspaceId: learnspace.id,
      }),
    );
  });

  app.get(
    "/api/skills/:skillId/drilldown",
    async (request: FastifyRequest<{ Params: { skillId: string } }>, reply) => {
      const { skillId } = request.params;
      const user = getDefaultUser(dependencies.db);
      const learnspace = getActiveLearnspace(dependencies.db);

      const result = getSkillDrilldown(dependencies.db, {
        skillId,
        userId: user.id,
        learnspaceId: learnspace.id,
      });

      if (!result) {
        reply.status(404).send({ error: "Skill not found" });
        return;
      }

      reply.send(result);
    },
  );

  app.post(
    "/api/skills/:skillId/reset",
    async (request: FastifyRequest<{ Params: { skillId: string } }>, reply) => {
      const { skillId } = request.params;
      const user = getDefaultUser(dependencies.db);
      const learnspace = getActiveLearnspace(dependencies.db);

      // Reset confidence to zero
      const existing = dependencies.db
        .select()
        .from(skillConfidence)
        .all()
        .find(
          (row) =>
            row.skillId === skillId &&
            row.userId === user.id &&
            row.learnspaceId === learnspace.id,
        );

      if (!existing) {
        reply.status(404).send({ error: "Skill not found" });
        return;
      }

      // Find items for this skill
      const skillItems = dependencies.db.select().from(items).all()
        .filter((item) => item.learnspaceId === learnspace.id && (item.skillIds ?? []).includes(skillId));
      const itemIds = new Set(skillItems.map((i) => i.id));

      // M3: reset projections only. Sessions, attempts, and selection events are
      // immutable history and must survive local mastery resets.

      // Reset confidence
      dependencies.db
        .update(skillConfidence)
        .set({
          score: 0,
          totalAttempts: 0,
          cleanSolves: 0,
          assistedSolves: 0,
          failedAttempts: 0,
          lastPracticedAt: null,
          trend: null,
        })
        .where(
          and(
            eq(skillConfidence.learnspaceId, learnspace.id),
            eq(skillConfidence.userId, user.id),
            eq(skillConfidence.skillId, skillId),
          ),
        )
        .run();

      // Reset queue entry
      const queueRow = dependencies.db.select().from(queue).all()
        .find((q) => q.skillId === skillId && q.userId === user.id && q.learnspaceId === learnspace.id);
      if (queueRow) {
        dependencies.db
          .update(queue)
          .set({
            intervalDays: 1,
            easeFactor: 2.5,
            dueDate: null,
            scheduledDate: null,
            round: 0,
            lastOutcome: null,
            skipCount: 0,
            updatedAt: dependencies.now().toISOString(),
          })
          .where(eq(queue.id, queueRow.id))
          .run();
      }

      for (const itemId of itemIds) {
        const itemQueueRow = dependencies.db.select().from(itemQueue).all()
          .find((q) => q.itemId === itemId && q.userId === user.id && q.learnspaceId === learnspace.id);
        if (!itemQueueRow) continue;
        dependencies.db
          .update(itemQueue)
          .set({
            intervalDays: 1,
            easeFactor: 2.5,
            dueDate: null,
            scheduledDate: null,
            round: 0,
            lastOutcome: null,
            skipCount: 0,
            updatedAt: dependencies.now().toISOString(),
          })
          .where(eq(itemQueue.id, itemQueueRow.id))
          .run();
      }

      reply.send({ ok: true });
    },
  );
}
