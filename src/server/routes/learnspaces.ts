import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../persistence/db.js";
import { activateLearnspace, getLearnspaceById, getDefaultUser } from "../core/bootstrap.js";
import { learnspaces } from "../persistence/schema.js";
import { resolveLearnspaceRuntime } from "../learnspaces/runtime.js";
import { activateTrack, ensureSystemTracks, getActiveTrack, listLearnspaceTracks } from "../tracks/service.js";
import { resolvePolicyDomainForLearnspace } from "../tracks/policy/types.js";

export interface LearnspaceDependencies {
  db: AppDatabase;
  now: () => Date;
}

function describePolicyTrackCapability(learnspaceId: string) {
  const domainId = resolvePolicyDomainForLearnspace(learnspaceId);
  if (domainId) {
    return {
      supported: true,
      domainId,
    };
  }
  return {
    supported: false,
    reason: `Custom policy tracks are not available for learnspace "${learnspaceId}" yet.`,
  };
}

function toLearnspaceSummary(db: AppDatabase, userId: string, learnspace: typeof learnspaces.$inferSelect) {
  const runtime = resolveLearnspaceRuntime(learnspace);
  const activeTrack = getActiveTrack(db, { userId, learnspace });
  return {
    id: learnspace.id,
    name: learnspace.name,
    description: (learnspace.config as Record<string, unknown> | null)?.description ?? "",
    familyId: runtime.familyId,
    schedulerId: runtime.schedulerId,
    activeTrackId: activeTrack.id,
    activeTrack,
    policyTracks: describePolicyTrackCapability(learnspace.id),
  };
}

function toLearnspaceDetail(db: AppDatabase, userId: string, learnspace: typeof learnspaces.$inferSelect) {
  const runtime = resolveLearnspaceRuntime(learnspace);
  const activeTrack = getActiveTrack(db, { userId, learnspace });
  const tracks = listLearnspaceTracks(db, userId, learnspace.id);
  return {
    id: learnspace.id,
    name: learnspace.name,
    activeTag: learnspace.activeTag,
    activeTrackId: activeTrack.id,
    activeTrack,
    tracks,
    interviewDate: learnspace.interviewDate,
    familyId: runtime.familyId,
    schedulerId: runtime.schedulerId,
    policyTracks: describePolicyTrackCapability(learnspace.id),
    // Family is a capability envelope — not the runtime contract. The
    // runtime contract is pinned per-attempt in AttemptBlueprint. This
    // payload advertises the allowed bounds the UI can describe a
    // learnspace with, not the actual behavior of any attempt.
    family: {
      id: runtime.family.id,
      label: runtime.family.label,
      description: runtime.family.description,
      archetypes: [...runtime.family.archetypes],
      moduleIds: [...runtime.family.moduleIds],
      artifactKinds: [...runtime.family.artifactKinds],
      protocolStepIds: [...runtime.family.protocolStepIds],
      validatorKinds: [...runtime.family.validatorKinds],
      schedulerIds: [...runtime.family.schedulerIds],
    },
    config: learnspace.config,
  };
}

interface InvalidLearnspaceEntry {
  id: string;
  name: string;
  error: string;
}

function describeResolutionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function trySummarizeLearnspace(
  db: AppDatabase,
  userId: string,
  learnspace: typeof learnspaces.$inferSelect,
  now: () => Date,
):
  | { ok: true; summary: ReturnType<typeof toLearnspaceSummary> }
  | { ok: false; invalid: InvalidLearnspaceEntry } {
  try {
    resolveLearnspaceRuntime(learnspace);
    ensureSystemTracks(db, { userId, learnspaceId: learnspace.id, now });
    return { ok: true, summary: toLearnspaceSummary(db, userId, learnspace) };
  } catch (error) {
    return {
      ok: false,
      invalid: {
        id: learnspace.id,
        name: learnspace.name,
        error: describeResolutionError(error),
      },
    };
  }
}

function buildValidatedLearnspaceSummary(
  db: AppDatabase,
  userId: string,
  learnspace: typeof learnspaces.$inferSelect,
  now: () => Date,
) {
  resolveLearnspaceRuntime(learnspace);
  ensureSystemTracks(db, { userId, learnspaceId: learnspace.id, now });
  return toLearnspaceSummary(db, userId, learnspace);
}

function buildValidatedLearnspaceDetail(
  db: AppDatabase,
  userId: string,
  learnspace: typeof learnspaces.$inferSelect,
  now: () => Date,
) {
  resolveLearnspaceRuntime(learnspace);
  ensureSystemTracks(db, { userId, learnspaceId: learnspace.id, now });
  return toLearnspaceDetail(db, userId, learnspace);
}

export function registerLearnspaceRoutes(
  app: FastifyInstance,
  dependencies: LearnspaceDependencies,
): void {
  app.get("/api/learnspaces", async () => {
    const user = getDefaultUser(dependencies.db);
    const all = dependencies.db.select().from(learnspaces).all();
    // Seeding system tracks for the active learnspace is best-effort.
    // A broken active learnspace must not take down the whole list.
    try {
      ensureSystemTracks(dependencies.db, {
        userId: user.id,
        learnspaceId: user.activeLearnspaceId ?? all[0]?.id ?? "coding-interview-patterns",
        now: dependencies.now,
      });
    } catch {
      // Intentional: the per-row loop below will still try each row
      // individually and report failures via `invalidLearnspaces`.
    }

    const valid: Array<ReturnType<typeof toLearnspaceSummary>> = [];
    const invalid: InvalidLearnspaceEntry[] = [];
    for (const learnspace of all) {
      const result = trySummarizeLearnspace(
        dependencies.db,
        user.id,
        learnspace,
        dependencies.now,
      );
      if (result.ok) {
        valid.push(result.summary);
      } else {
        invalid.push(result.invalid);
      }
    }

    return {
      activeId: user.activeLearnspaceId,
      learnspaces: valid,
      ...(invalid.length > 0 ? { invalidLearnspaces: invalid } : {}),
    };
  });

  app.post("/api/learnspaces/:id/switch", async (request, reply) => {
    const params = request.params as { id: string };
    const user = getDefaultUser(dependencies.db);
    const ls = getLearnspaceById(dependencies.db, params.id);
    if (!ls) {
      reply.code(404).send({ error: "Learnspace not found" });
      return;
    }
    try {
      const summary = buildValidatedLearnspaceSummary(
        dependencies.db,
        user.id,
        ls,
        dependencies.now,
      );
      activateLearnspace(dependencies, params.id);
      reply.send(summary);
    } catch (error) {
      reply.code(422).send({
        error: describeResolutionError(error),
        learnspaceId: ls.id,
      });
    }
  });

  app.get("/api/learnspaces/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const user = getDefaultUser(dependencies.db);
    const learnspace = getLearnspaceById(dependencies.db, params.id);

    if (!learnspace) {
      reply.code(404).send({ error: "Learnspace not found" });
      return;
    }

    try {
      reply.send(
        buildValidatedLearnspaceDetail(
          dependencies.db,
          user.id,
          learnspace,
          dependencies.now,
        ),
      );
    } catch (error) {
      reply.code(422).send({
        error: describeResolutionError(error),
        learnspaceId: learnspace.id,
      });
    }
  });

  app.post("/api/learnspaces/:id/activate", async (request, reply) => {
    const params = request.params as { id: string };
    const user = getDefaultUser(dependencies.db);
    const learnspace = getLearnspaceById(dependencies.db, params.id);

    if (!learnspace) {
      reply.code(404).send({ error: "Learnspace not found" });
      return;
    }

    try {
      const detail = buildValidatedLearnspaceDetail(
        dependencies.db,
        user.id,
        learnspace,
        dependencies.now,
      );
      activateLearnspace(dependencies, params.id);
      reply.send(detail);
    } catch (error) {
      reply.code(422).send({
        error: describeResolutionError(error),
        learnspaceId: learnspace.id,
      });
    }
  });

  app.get("/api/learnspaces/:id/tracks", async (request, reply) => {
    const params = request.params as { id: string };
    const user = getDefaultUser(dependencies.db);
    const learnspace = getLearnspaceById(dependencies.db, params.id);

    if (!learnspace) {
      reply.code(404).send({ error: "Learnspace not found" });
      return;
    }

    try {
      resolveLearnspaceRuntime(learnspace);
      const tracks = ensureSystemTracks(dependencies.db, {
        userId: user.id,
        learnspaceId: learnspace.id,
        now: dependencies.now,
      });

      reply.send({
        learnspaceId: learnspace.id,
        activeTrackId: getActiveTrack(dependencies.db, { userId: user.id, learnspace }).id,
        tracks,
      });
    } catch (error) {
      reply.code(422).send({
        error: describeResolutionError(error),
        learnspaceId: learnspace.id,
      });
    }
  });

  app.post("/api/tracks/:id/activate", async (request, reply) => {
    const params = request.params as { id: string };
    const user = getDefaultUser(dependencies.db);
    const activeLearnspace = getLearnspaceById(dependencies.db, user.activeLearnspaceId ?? "");

    if (!activeLearnspace) {
      reply.code(404).send({ error: "Active learnspace not found" });
      return;
    }

    try {
      const activeTrack = activateTrack(dependencies.db, {
        userId: user.id,
        learnspaceId: activeLearnspace.id,
        trackId: params.id,
        now: dependencies.now,
      });

      reply.send({
        learnspaceId: activeLearnspace.id,
        activeTrackId: activeTrack.id,
        activeTrack,
        tracks: listLearnspaceTracks(dependencies.db, user.id, activeLearnspace.id),
      });
    } catch (error) {
      reply.code(404).send({ error: error instanceof Error ? error.message : "Track not found" });
    }
  });
}
