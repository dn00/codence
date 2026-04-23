import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AppDatabase } from "../persistence/db.js";
import {
  artifactLineage,
  attempts,
  itemQueue,
  items,
  queue,
  skillConfidence,
  skills,
  tracks,
} from "../persistence/schema.js";
import { getActiveLearnspace, getDefaultUser } from "../core/bootstrap.js";
import { getProgressSummary } from "../core/queue.js";
import {
  archiveUserTrack,
  createUserTrackFromPolicy,
  deleteUserTrack,
  ensureSystemTracks,
  listLearnspaceTracks,
  updateUserTrackFromPolicy,
} from "../tracks/service.js";
import type { CompletionLLM } from "../ai/llm-adapter.js";
import { createPolicyCompiler, createLruPolicyCache, PolicyCompilerError, type PolicyCompiler } from "../tracks/policy/compiler.js";
import {
  resolvePolicyDomainForLearnspace,
  type PolicyExplanation,
  type TrackPolicy,
} from "../tracks/policy/types.js";
import type { PolicyPromptTurn } from "../tracks/policy/prompt.js";
import { buildDomainCatalogFromDb } from "../tracks/policy/runtime-catalog.js";

export interface LibraryRouteDependencies {
  db: AppDatabase;
  now: () => Date;
  completionLLM?: CompletionLLM;
  // True when a real (not-unconfigured-stub) completion backend is
  // wired. Lets the interpret route return 503 with a clear message
  // instead of letting the stub adapter throw a 502-wrapped AdapterError.
  completionConfigured?: boolean;
}

type Difficulty = "easy" | "medium" | "hard";

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function serializeItem(item: typeof items.$inferSelect, lineage: typeof artifactLineage.$inferSelect | null = null) {
  return {
    ...item,
    content: item.content ?? {},
    skillIds: item.skillIds ?? [],
    tags: item.tags ?? [],
    lineage,
  };
}

function validateItemInput(body: Record<string, unknown>, allowPartial = false) {
  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  const difficulty = body.difficulty;
  const skillIds = normalizeStringArray(body.skillIds);
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : undefined;
  const tags = normalizeStringArray(body.tags);
  const content = body.content && typeof body.content === "object" && !Array.isArray(body.content)
    ? body.content as Record<string, unknown>
    : undefined;

  if (!allowPartial || title !== undefined) {
    if (!title) throw new Error("Title is required");
  }
  if (!allowPartial || difficulty !== undefined) {
    if (!isDifficulty(difficulty)) throw new Error("Difficulty must be easy, medium, or hard");
  }
  if (!allowPartial || body.skillIds !== undefined) {
    if (skillIds.length === 0) throw new Error("At least one skill is required");
  }
  if (!allowPartial || prompt !== undefined) {
    if (!prompt) throw new Error("Prompt is required");
  }

  return {
    title,
    difficulty: isDifficulty(difficulty) ? difficulty : undefined,
    skillIds: body.skillIds !== undefined ? skillIds : undefined,
    prompt,
    tags: body.tags !== undefined ? tags : undefined,
    content,
  };
}

function ensurePrimaryItemQueue(
  db: AppDatabase,
  {
    itemId,
    learnspaceId,
    userId,
    skillId,
    now,
  }: {
    itemId: string;
    learnspaceId: string;
    userId: string;
    skillId: string;
    now: () => Date;
  },
): void {
  const existing = db
    .select()
    .from(itemQueue)
    .all()
    .find((row) => row.itemId === itemId && row.learnspaceId === learnspaceId && row.userId === userId);

  const timestamp = now().toISOString();
  if (existing) {
    db.update(itemQueue)
      .set({ skillId, updatedAt: timestamp })
      .where(eq(itemQueue.id, existing.id))
      .run();
    return;
  }

  db.insert(itemQueue)
    .values({
      id: `item-queue-${itemId}`,
      learnspaceId,
      userId,
      itemId,
      skillId,
      intervalDays: 1,
      easeFactor: 2.5,
      round: 0,
      dueDate: null,
      lastOutcome: null,
      skipCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
}

// ---------------------------------------------------------------------------
// Policy interpret helpers
// ---------------------------------------------------------------------------
function parsePolicyPromptTurns(value: unknown): PolicyPromptTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: PolicyPromptTurn[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const role = record.role;
    const content = record.content;
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim().length > 0) {
      turns.push({ role, content });
    }
  }
  return turns;
}

function asPolicyObject(value: unknown): TrackPolicy | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as TrackPolicy : null;
}

function asPolicyExplanation(value: unknown): PolicyExplanation | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as PolicyExplanation : null;
}

function extractPolicyCreatePayload(body: Record<string, unknown>): {
  policy: TrackPolicy;
  outcome: "compiled" | "repaired";
  explanation: PolicyExplanation | null;
  compilerVersion?: string;
} | null {
  const policy = asPolicyObject(body.policy);
  if (!policy) return null;
  const outcomeValue = body.policyOutcome;
  const outcome = outcomeValue === "compiled" || outcomeValue === "repaired" ? outcomeValue : "compiled";
  return {
    policy,
    outcome,
    explanation: asPolicyExplanation(body.policyExplanation),
    compilerVersion: typeof body.compilerVersion === "string" ? body.compilerVersion : undefined,
  };
}

export function registerLibraryRoutes(
  app: FastifyInstance,
  dependencies: LibraryRouteDependencies,
): void {
  const policyCompiler: PolicyCompiler | null = dependencies.completionLLM && dependencies.completionConfigured !== false
    ? createPolicyCompiler({
        completionLLM: dependencies.completionLLM,
        cache: createLruPolicyCache(),
      })
    : null;
  app.get("/api/items", async (request, reply) => {
    const query = (request.query ?? {}) as Record<string, string | undefined>;
    const learnspace = getActiveLearnspace(dependencies.db);
    const lineageByArtifactId = new Map(
      dependencies.db.select().from(artifactLineage).all().map((lineage) => [lineage.artifactId, lineage]),
    );

    const filtered = dependencies.db.select().from(items).all()
      .filter((item) => item.learnspaceId === (query.learnspaceId ?? learnspace.id))
      .filter((item) => query.status ? item.status === query.status : true)
      .filter((item) => query.difficulty ? item.difficulty === query.difficulty : true)
      .filter((item) => query.source ? item.source === query.source : true)
      .filter((item) => query.skillId ? (item.skillIds ?? []).includes(query.skillId) : true)
      .sort((left, right) => left.title.localeCompare(right.title));

    reply.send({
      items: filtered.map((item) => serializeItem(item, lineageByArtifactId.get(item.id) ?? null)),
    });
  });

  app.post("/api/items", async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply) => {
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);
    let input: ReturnType<typeof validateItemInput>;
    try {
      input = validateItemInput(request.body ?? {});
    } catch (error) {
      reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid item" });
      return;
    }

    const knownSkillIds = new Set(
      dependencies.db.select().from(skills).all()
        .filter((skill) => skill.learnspaceId === learnspace.id)
        .map((skill) => skill.id),
    );
    const unknownSkill = input.skillIds?.find((skillId) => !knownSkillIds.has(skillId));
    if (unknownSkill) {
      reply.code(400).send({ error: `Unknown skill: ${unknownSkill}` });
      return;
    }

    const timestamp = dependencies.now().toISOString();
    const itemId = `custom-${randomUUID()}`;
    const itemContent = {
      ...(input.content ?? {}),
      prompt: input.prompt,
    };

    dependencies.db.insert(items)
      .values({
        id: itemId,
        learnspaceId: learnspace.id,
        slug: `${slugify(input.title!)}-${itemId.slice(-8)}`,
        title: input.title!,
        content: itemContent,
        skillIds: input.skillIds!,
        tags: input.tags ?? [],
        difficulty: input.difficulty!,
        source: "custom",
        status: "active",
        parentItemId: null,
        createdAt: timestamp,
        retiredAt: null,
      })
      .run();

    ensurePrimaryItemQueue(dependencies.db, {
      itemId,
      learnspaceId: learnspace.id,
      userId: user.id,
      skillId: input.skillIds![0],
      now: dependencies.now,
    });

    const item = dependencies.db.select().from(items).where(eq(items.id, itemId)).get()!;
    reply.code(201).send({ item: serializeItem(item) });
  });

  app.patch("/api/items/:id", async (request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>, reply) => {
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);
    const current = dependencies.db.select().from(items).where(eq(items.id, request.params.id)).get();

    if (!current || current.learnspaceId !== learnspace.id) {
      reply.code(404).send({ error: "Item not found" });
      return;
    }

    let input: ReturnType<typeof validateItemInput>;
    try {
      input = validateItemInput(request.body ?? {}, true);
    } catch (error) {
      reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid item" });
      return;
    }

    if (input.skillIds) {
      const knownSkillIds = new Set(
        dependencies.db.select().from(skills).all()
          .filter((skill) => skill.learnspaceId === learnspace.id)
          .map((skill) => skill.id),
      );
      const unknownSkill = input.skillIds.find((skillId) => !knownSkillIds.has(skillId));
      if (unknownSkill) {
        reply.code(400).send({ error: `Unknown skill: ${unknownSkill}` });
        return;
      }
    }

    const nextContent = {
      ...(current.content ?? {}),
      ...(input.content ?? {}),
      ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
    };

    dependencies.db.update(items)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
        ...(input.skillIds !== undefined ? { skillIds: input.skillIds } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        content: nextContent,
      })
      .where(eq(items.id, current.id))
      .run();

    const updated = dependencies.db.select().from(items).where(eq(items.id, current.id)).get()!;
    const primarySkillId = (updated.skillIds ?? [])[0];
    if (primarySkillId && updated.status !== "retired") {
      ensurePrimaryItemQueue(dependencies.db, {
        itemId: updated.id,
        learnspaceId: learnspace.id,
        userId: user.id,
        skillId: primarySkillId,
        now: dependencies.now,
      });
    }

    reply.send({ item: serializeItem(updated) });
  });

  app.post("/api/items/:id/retire", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const learnspace = getActiveLearnspace(dependencies.db);
    const item = dependencies.db.select().from(items).where(eq(items.id, request.params.id)).get();

    if (!item || item.learnspaceId !== learnspace.id) {
      reply.code(404).send({ error: "Item not found" });
      return;
    }

    dependencies.db.update(items)
      .set({
        status: "retired",
        retiredAt: dependencies.now().toISOString(),
      })
      .where(eq(items.id, item.id))
      .run();

    const updated = dependencies.db.select().from(items).where(eq(items.id, item.id)).get()!;
    reply.send({ item: serializeItem(updated) });
  });

  app.delete("/api/items/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const learnspace = getActiveLearnspace(dependencies.db);
    const item = dependencies.db.select().from(items).where(eq(items.id, request.params.id)).get();

    if (!item || item.learnspaceId !== learnspace.id) {
      reply.code(404).send({ error: "Item not found" });
      return;
    }

    // Cascade computed state only. Attempts keep their itemSnapshot so
    // history renders post-delete. Lineage rows stay as audit; phase 4
    // of the CRUD plan snapshots the parent so lineage survives.
    dependencies.db.delete(itemQueue).where(eq(itemQueue.itemId, item.id)).run();
    dependencies.db.delete(items).where(eq(items.id, item.id)).run();

    reply.send({ deleted: true, id: item.id });
  });

  app.get("/api/skills", async (_request, reply) => {
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);
    const progress = getProgressSummary(dependencies, {
      userId: user.id,
      learnspaceId: learnspace.id,
    });
    const progressBySkillId = new Map(progress.skills.map((skill) => [skill.skillId, skill]));
    const confidenceBySkillId = new Map(
      dependencies.db.select().from(skillConfidence).all()
        .filter((row) => row.learnspaceId === learnspace.id && row.userId === user.id)
        .map((row) => [row.skillId, row]),
    );

    const rows = dependencies.db.select().from(skills).all()
      .filter((skill) => skill.learnspaceId === learnspace.id)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((skill) => {
        const progressRow = progressBySkillId.get(skill.id);
        const confidence = confidenceBySkillId.get(skill.id);
        return {
          ...skill,
          totalAttempts: confidence?.totalAttempts ?? 0,
          score: confidence?.score ?? 0,
          trend: confidence?.trend ?? null,
          itemCount: progressRow?.totalProblems ?? 0,
          completedProblems: progressRow?.completedProblems ?? 0,
          dueDate: progressRow?.dueDate ?? null,
          lastOutcome: progressRow?.lastOutcome ?? null,
        };
      });

    reply.send({ skills: rows });
  });

  app.delete("/api/skills/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);
    const skillId = request.params.id;
    const skill = dependencies.db.select().from(skills).where(eq(skills.id, skillId)).get();
    if (!skill || skill.learnspaceId !== learnspace.id) {
      reply.code(404).send({ error: "Skill not found" });
      return;
    }

    // Cascade computed state. For items referencing this skill:
    //   - single-skill items → delete the item too (cascades item_queue)
    //   - multi-skill items  → remove skillId from item.skillIds
    // Attempts untouched — skillSnapshots preserve history. Bootstrap
    // will re-seed built-in skills on next startup; for local-only
    // deletions that should stick, edit the seed file.
    const affected = dependencies.db.select().from(items).all()
      .filter((it) => it.learnspaceId === learnspace.id && (it.skillIds ?? []).includes(skillId));
    for (const it of affected) {
      const nextSkillIds = (it.skillIds ?? []).filter((s) => s !== skillId);
      if (nextSkillIds.length === 0) {
        dependencies.db.delete(itemQueue).where(eq(itemQueue.itemId, it.id)).run();
        dependencies.db.delete(items).where(eq(items.id, it.id)).run();
      } else {
        dependencies.db.update(items).set({ skillIds: nextSkillIds }).where(eq(items.id, it.id)).run();
      }
    }

    dependencies.db.delete(skillConfidence).where(
      and(
        eq(skillConfidence.skillId, skillId),
        eq(skillConfidence.learnspaceId, learnspace.id),
        eq(skillConfidence.userId, user.id),
      ),
    ).run();
    dependencies.db.delete(queue).where(
      and(
        eq(queue.skillId, skillId),
        eq(queue.learnspaceId, learnspace.id),
        eq(queue.userId, user.id),
      ),
    ).run();
    dependencies.db.delete(itemQueue).where(
      and(
        eq(itemQueue.skillId, skillId),
        eq(itemQueue.learnspaceId, learnspace.id),
        eq(itemQueue.userId, user.id),
      ),
    ).run();
    dependencies.db.delete(skills).where(eq(skills.id, skillId)).run();

    reply.send({ deleted: true, id: skillId });
  });

  app.post("/api/tracks/interpret", async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply) => {
    const body = request.body ?? {};
    if (!policyCompiler) {
      reply.code(503).send({ error: "LLM provider is not configured." });
      return;
    }

    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    if (!goal) {
      reply.code(400).send({ error: "goal is required" });
      return;
    }
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const skillIds = normalizeStringArray(body.skillIds);
    const priorTurns = parsePolicyPromptTurns(body.priorTurns);

    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);
    const domainId = resolvePolicyDomainForLearnspace(learnspace.id);
    if (!domainId) {
      reply.code(400).send({
        error: `No policy domain mapped for learnspace "${learnspace.id}". Policy-backed tracks only support DSA (coding-interview-patterns) today.`,
      });
      return;
    }

    try {
      const domainCatalog = buildDomainCatalogFromDb(
        dependencies.db,
        learnspace.id,
        domainId,
        learnspace.name,
      );
      const result = await policyCompiler.compile({
        goal,
        name,
        skillIds,
        priorTurns,
        domainId,
        domainCatalog,
        trackId: `preview-${learnspace.id}`,
        userId: user.id,
        learnspaceId: learnspace.id,
        now: dependencies.now,
      });
      reply.send(result);
    } catch (error) {
      if (error instanceof PolicyCompilerError) {
        reply.code(502).send({
          error: "compiler_error",
          stage: error.stage,
          message: error.message,
        });
        return;
      }
      reply.code(500).send({
        error: error instanceof Error ? error.message : "Unknown compiler error",
      });
    }
  });

  app.post("/api/tracks", async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply) => {
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);
    const body = request.body ?? {};

    const policyPayload = extractPolicyCreatePayload(body);
    if (!policyPayload) {
      reply.code(400).send({ error: "Request body must include a policy payload. Call POST /api/tracks/interpret first." });
      return;
    }
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    if (!goal) {
      reply.code(400).send({ error: "goal is required" });
      return;
    }
    const userName = typeof body.name === "string" ? body.name.trim() : "";
    const llmName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const name = userName || llmName || goal.slice(0, 80);
    const domainId = resolvePolicyDomainForLearnspace(learnspace.id);
    if (!domainId) {
      reply.code(400).send({
        error: `No policy domain mapped for learnspace "${learnspace.id}".`,
      });
      return;
    }

    ensureSystemTracks(dependencies.db, {
      userId: user.id,
      learnspaceId: learnspace.id,
      now: dependencies.now,
    });

    try {
      const track = createUserTrackFromPolicy(dependencies.db, {
        userId: user.id,
        learnspaceId: learnspace.id,
        name,
        goal,
        policy: policyPayload.policy,
        domainId,
        outcome: policyPayload.outcome,
        explanation: policyPayload.explanation,
        compilerVersion: policyPayload.compilerVersion,
        status: "active",
        now: dependencies.now,
      });
      reply.code(201).send({
        track,
        activeTrackId: track.id,
        tracks: listLearnspaceTracks(dependencies.db, user.id, learnspace.id),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid policy";
      const unsupported = (error as Error & { unsupportedFields?: string[] }).unsupportedFields;
      reply.code(400).send({
        error: message,
        ...(unsupported ? { unsupportedFields: unsupported } : {}),
      });
    }
  });

  app.patch("/api/tracks/:id", async (request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>, reply) => {
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);
    const body = request.body ?? {};

    const policyPayload = extractPolicyCreatePayload(body);
    if (!policyPayload) {
      reply.code(400).send({ error: "Request body must include a policy payload. Call POST /api/tracks/interpret first." });
      return;
    }
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    if (!goal) {
      reply.code(400).send({ error: "goal is required" });
      return;
    }
    const userName = typeof body.name === "string" ? body.name.trim() : "";
    const llmName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const name = userName || llmName || goal.slice(0, 80);
    const domainId = resolvePolicyDomainForLearnspace(learnspace.id);
    if (!domainId) {
      reply.code(400).send({
        error: `No policy domain mapped for learnspace "${learnspace.id}".`,
      });
      return;
    }
    try {
      const track = updateUserTrackFromPolicy(dependencies.db, {
        trackId: request.params.id,
        userId: user.id,
        learnspaceId: learnspace.id,
        name,
        goal,
        policy: policyPayload.policy,
        domainId,
        outcome: policyPayload.outcome,
        explanation: policyPayload.explanation,
        compilerVersion: policyPayload.compilerVersion,
        now: dependencies.now,
      });
      reply.send({
        track,
        tracks: listLearnspaceTracks(dependencies.db, user.id, learnspace.id),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Track not found";
      const unsupported = (error as Error & { unsupportedFields?: string[] }).unsupportedFields;
      const statusCode = message.includes("System tracks") || message.includes("Archived tracks")
        ? 409
        : message.includes("Unknown track")
          ? 404
          : 400;
      reply.code(statusCode).send({
        error: message,
        ...(unsupported ? { unsupportedFields: unsupported } : {}),
      });
    }
  });

  app.post("/api/tracks/:id/archive", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);

    try {
      const track = archiveUserTrack(dependencies.db, {
        userId: user.id,
        learnspaceId: learnspace.id,
        trackId: request.params.id,
        now: dependencies.now,
      });
      const refreshedLearnspace = getActiveLearnspace(dependencies.db);
      reply.send({
        track,
        activeTrackId: refreshedLearnspace.activeTrackId,
        tracks: listLearnspaceTracks(dependencies.db, user.id, learnspace.id),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Track not found";
      reply.code(message.includes("System tracks") ? 409 : 404).send({ error: message });
    }
  });

  app.delete("/api/tracks/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);

    try {
      deleteUserTrack(dependencies.db, {
        userId: user.id,
        learnspaceId: learnspace.id,
        trackId: request.params.id,
        now: dependencies.now,
      });
      const refreshedLearnspace = getActiveLearnspace(dependencies.db);
      reply.send({
        activeTrackId: refreshedLearnspace.activeTrackId,
        tracks: listLearnspaceTracks(dependencies.db, user.id, learnspace.id),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Track not found";
      reply.code(message.includes("System tracks") ? 409 : 404).send({ error: message });
    }
  });

  app.get("/api/tracks", async (_request, reply) => {
    const user = getDefaultUser(dependencies.db);
    const learnspace = getActiveLearnspace(dependencies.db);
    ensureSystemTracks(dependencies.db, {
      userId: user.id,
      learnspaceId: learnspace.id,
      now: dependencies.now,
    });
    const progress = getProgressSummary(dependencies, {
      userId: user.id,
      learnspaceId: learnspace.id,
    });
    const analyticsByTrackId = new Map(
      progress.trackAnalytics
        .filter((row) => row.trackId !== null)
        .map((row) => [row.trackId!, {
          completedAttempts: row.completedAttempts,
          generatedAttempts: row.generatedAttempts,
          lastAttemptAt: row.lastAttemptAt,
        }]),
    );
    const storedById = new Map(
      dependencies.db.select().from(tracks).all()
        .filter((track) => track.userId === user.id && track.learnspaceId === learnspace.id)
        .map((track) => [track.id, track]),
    );

    reply.send({
      tracks: listLearnspaceTracks(dependencies.db, user.id, learnspace.id).map((track) => {
        const stored = storedById.get(track.id);
        return {
          ...track,
          learnspaceId: learnspace.id,
          userId: stored?.userId,
          createdAt: stored?.createdAt,
          updatedAt: stored?.updatedAt,
          analytics: analyticsByTrackId.get(track.id) ?? {
            completedAttempts: 0,
            generatedAttempts: 0,
            lastAttemptAt: null,
          },
        };
      }),
    });
  });
}
