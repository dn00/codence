import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../persistence/db.js";
import {
  bootstrapDefaultLearnspace,
  getLearnspaceById,
  setLearnspaceActiveTag,
} from "../core/bootstrap.js";

export interface OnboardingResponse {
  userId: string;
  learnspaceId: string;
  activeTag: string | null;
  llmConfigured: boolean;
  coachConfigured: boolean;
  completionConfigured: boolean;
}

export interface OnboardingDependencies {
  db: AppDatabase;
  now: () => Date;
  coachConfigured: boolean;
  completionConfigured: boolean;
}

export function registerOnboardingRoute(
  app: FastifyInstance,
  dependencies: OnboardingDependencies,
): void {
  app.post("/api/onboarding", async (request, reply): Promise<OnboardingResponse | void> => {
    const body = (request.body ?? {}) as { activeTag?: unknown };
    const bootstrap = bootstrapDefaultLearnspace(dependencies);
    const learnspace = getLearnspaceById(dependencies.db, bootstrap.learnspaceId);

    if (!learnspace) {
      reply.code(500).send({ error: "Unable to bootstrap built-in learnspace" });
      return;
    }

    const config = learnspace.config as unknown as { tags: string[] };
    if (body.activeTag !== undefined && body.activeTag !== null) {
      if (typeof body.activeTag !== "string" || !config.tags.includes(body.activeTag)) {
        reply.code(400).send({ error: "Unsupported activeTag" });
        return;
      }
    }

    const updatedLearnspace = setLearnspaceActiveTag(
      dependencies,
      bootstrap.learnspaceId,
      body.activeTag === undefined ? learnspace.activeTag : (body.activeTag as string | null),
    );

    const { coachConfigured, completionConfigured } = dependencies;

    return {
      userId: bootstrap.userId,
      learnspaceId: bootstrap.learnspaceId,
      activeTag: updatedLearnspace.activeTag,
      llmConfigured: completionConfigured || coachConfigured,
      coachConfigured,
      completionConfigured,
    };
  });
}
