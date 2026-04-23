import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { AppDatabase } from "../persistence/db.js";
import { learnspaces, trackRuntimeState, tracks, type Learnspace, type NewTrack, type Track } from "../persistence/schema.js";
import { findLearnspaceRecord } from "../learnspaces/runtime.js";
import type { SessionTypeId } from "../families/types.js";
import { TRACK_PRESETS } from "./types.js";
import type {
  LearnspaceTrackSummary,
  ResolvedTrackContext,
  TrackPresetId,
  TrackProgramV2,
  TrackQueueStrategy,
  TrackSource,
  TrackSpecV2,
  TrackStatus,
} from "./types.js";
import { lowerPolicy } from "./policy/lower.js";
import { validatePolicy } from "./policy/validator.js";
import { buildDomainCatalogFromDb } from "./policy/runtime-catalog.js";
import { POLICY_COMPILER_VERSION } from "./policy/compiler-version.js";
import type {
  PolicyDomainId,
  PolicyExplanation,
  PolicyOutcome,
  TrackPolicy,
} from "./policy/types.js";

interface TrackPresetDefinition {
  slug: TrackPresetId;
  name: string;
  goal: string;
}

const SYSTEM_TRACK_PRESETS: readonly TrackPresetDefinition[] = [
  {
    slug: "recommended",
    name: "Recommended",
    goal: "Follow the current scheduler and keep reviews honest.",
  },
  {
    slug: "explore",
    name: "Explore",
    goal: "Open new ground and favor unseen material over review pressure.",
  },
  {
    slug: "weakest_pattern",
    name: "Weakest Pattern",
    goal: "Repair weak skills first and rebuild consistency.",
  },
  {
    slug: "foundations",
    name: "Foundations",
    goal: "Ease back in with familiar patterns and easier problems.",
  },
] as const;

function buildSystemTrackId(learnspaceId: string, preset: TrackPresetId): string {
  return `track-${learnspaceId}-${preset}`;
}

function slugifyTrackName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "custom-track";
}

function normalizeTrackName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Track name is required");
  }
  return trimmed.slice(0, 120);
}

function normalizeTrackGoal(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Track goal is required");
  }
  return trimmed.slice(0, 500);
}

function buildPresetDifficultyPolicy(preset: TrackPresetId): TrackSpecV2["difficultyPolicy"] {
  if (preset === "foundations") {
    return {
      defaultTarget: { mode: "fixed", targetBand: "easy" },
      regressionAllowed: true,
    };
  }
  if (preset === "weakest_pattern" || preset === "explore") {
    return {
      defaultTarget: { mode: "range", minBand: "easy", maxBand: "medium" },
      regressionAllowed: preset === "weakest_pattern",
    };
  }
  return {
    defaultTarget: { mode: "adaptive", targetBand: "medium" },
    regressionAllowed: false,
  };
}

function buildPresetBlendPolicy(preset: TrackPresetId): TrackSpecV2["blendPolicy"] {
  if (preset === "explore") {
    return {
      entries: [
        { kind: "new_material", weight: 0.8 },
        { kind: "due_review", weight: 0.2 },
      ],
    };
  }
  if (preset === "weakest_pattern") {
    return {
      entries: [
        { kind: "due_review", weight: 0.7 },
        { kind: "drill", weight: 0.3 },
      ],
    };
  }
  if (preset === "foundations") {
    return {
      entries: [
        { kind: "due_review", weight: 0.7 },
        { kind: "recall", weight: 0.3 },
      ],
    };
  }
  return {
    entries: [
      { kind: "due_review", weight: 0.7 },
      { kind: "new_material", weight: 0.3 },
    ],
  };
}

function buildPresetGenerationPolicy(preset: TrackPresetId): TrackSpecV2["generationPolicy"] {
  const allowGeneration = preset === "recommended" || preset === "weakest_pattern";
  return {
    allowGeneration,
    allowedArtifactKinds: allowGeneration ? ["problem"] : [],
    styleTarget: preset === "recommended"
      ? { dimensions: [{ id: "company_style", value: "enabled", weight: 1 }] }
      : null,
  };
}

function buildPresetEvaluationPolicy(preset: TrackPresetId): TrackSpecV2["evaluationPolicy"] {
  return {
    mode: preset === "foundations" || preset === "explore" ? "learning" : "balanced",
  };
}

function buildSystemTrackV2Spec(
  userId: string,
  learnspaceId: string,
  preset: TrackPresetDefinition,
): TrackSpecV2 {
  const trackId = buildSystemTrackId(learnspaceId, preset.slug);
  const base: Omit<TrackSpecV2, "archetype" | "phases"> = {
    version: "2" as const,
    id: trackId,
    learnspaceId,
    userId,
    name: preset.name,
    goal: preset.goal,
    explanation: preset.goal,
    timeframe: null,
    successCriteria: [],
    constraints: [],
    preferences: [],
    scopePolicy: {
      mode: "learnspace",
      refs: [{ dimension: "learnspace", value: learnspaceId }],
    },
    difficultyPolicy: buildPresetDifficultyPolicy(preset.slug),
    blendPolicy: buildPresetBlendPolicy(preset.slug),
    pacingPolicy: {},
    generationPolicy: buildPresetGenerationPolicy(preset.slug),
    evaluationPolicy: buildPresetEvaluationPolicy(preset.slug),
    coveragePolicy: {},
    interventionPolicy: {
      enabled: preset.slug === "weakest_pattern" || preset.slug === "foundations",
      allowedKinds: preset.slug === "weakest_pattern"
        ? ["repair_drill", "focus_rehab"]
        : preset.slug === "foundations"
          ? ["confidence_rebuild"]
          : [],
    },
    schedulePolicy: {},
  };

  switch (preset.slug) {
    case "explore":
      return {
        ...base,
        archetype: "curriculum_progression",
        phases: [{
          id: "explore-main",
          label: "Explore",
          objective: "Open new ground while keeping some review alive.",
        }],
      };
    case "weakest_pattern":
      return {
        ...base,
        archetype: "weakness_rehab",
        phases: [{
          id: "rehab-main",
          label: "Repair",
          objective: "Focus on weak or failure-prone areas first.",
        }],
      };
    case "foundations":
      return {
        ...base,
        archetype: "foundations_rebuild",
        phases: [{
          id: "foundations-warmup",
          label: "Warmup",
          objective: "Rebuild rhythm with easier work before ramping up.",
        }],
      };
    case "recommended":
    default:
      return {
        ...base,
        archetype: "maintenance",
        phases: [{
          id: "recommended-main",
          label: "Maintain",
          objective: "Follow the current scheduler and keep reviews honest.",
        }],
      };
  }
}

function buildSystemTrackV2Program(
  learnspaceId: string,
  preset: TrackPresetDefinition,
): TrackProgramV2 {
  const trackId = buildSystemTrackId(learnspaceId, preset.slug);
  if (preset.slug === "foundations") {
    return {
      version: "2",
      entryNodeId: `${trackId}:warmup`,
      nodes: [
        {
          id: `${trackId}:warmup`,
          label: "Warmup",
          type: "phase",
          objective: "Ease back in with familiar patterns and easier problems.",
          phaseId: "foundations-warmup",
          plannerConfig: {
            sessionType: "untimed_solve",
            queueStrategy: "foundations",
            difficultyTarget: { mode: "fixed", targetBand: "easy" },
            generationAllowed: false,
            evaluationStrictness: "learning",
          },
        },
        {
          id: `${trackId}:steady`,
          label: "Steady Foundations",
          type: "steady_state",
          objective: "Continue in a gentle refresher mode.",
          plannerConfig: {
            sessionType: "untimed_solve",
            queueStrategy: "foundations",
            difficultyTarget: { mode: "range", minBand: "easy", maxBand: "medium" },
            generationAllowed: false,
            evaluationStrictness: "learning",
          },
        },
      ],
      transitions: [
        {
          id: `${trackId}:warmup-to-steady`,
          fromNodeId: `${trackId}:warmup`,
          toNodeId: `${trackId}:steady`,
          when: [{ kind: "clean_solve_count_reached", params: { count: 1 } }],
          priority: 1,
        },
      ],
      globalPolicies: [],
      safetyGuards: [],
    };
  }

  return {
    version: "2",
    entryNodeId: `${trackId}:main`,
    nodes: [
      {
        id: `${trackId}:main`,
        label: preset.name,
        type: "steady_state",
        objective: preset.goal,
        plannerConfig: {
          sessionType:
            preset.slug === "weakest_pattern"
              ? "review_drill"
              : "timed_solve",
          queueStrategy:
            preset.slug === "explore"
              ? "new_only"
              : preset.slug === "weakest_pattern"
                ? "weakest_first"
                : "scheduler",
          difficultyTarget:
            preset.slug === "explore" || preset.slug === "weakest_pattern"
              ? { mode: "range", minBand: "easy", maxBand: "medium" }
              : { mode: "adaptive", targetBand: "medium" },
          generationAllowed: buildPresetGenerationPolicy(preset.slug).allowGeneration,
          evaluationStrictness: buildPresetEvaluationPolicy(preset.slug).mode,
        },
      },
    ],
    transitions: [],
    globalPolicies: [],
    safetyGuards: [],
  };
}

function buildSystemTrackV2Template(
  userId: string,
  learnspaceId: string,
  preset: TrackPresetDefinition,
): {
  source: TrackSource;
  status: TrackStatus;
  spec: TrackSpecV2;
  program: TrackProgramV2;
} {
  return {
    source: "system_template",
    status: "active",
    spec: buildSystemTrackV2Spec(userId, learnspaceId, preset),
    program: buildSystemTrackV2Program(learnspaceId, preset),
  };
}

function toTrackSummary(track: Track): LearnspaceTrackSummary {
  let spec = track.spec ?? null;
  let program = track.program ?? null;
  let source = track.source ?? null;
  let status = track.status ?? null;
  if (!spec || !program || !source || !status) {
    try {
      const fallback = buildSystemTrackV2Template(track.userId, track.learnspaceId, buildPresetDefinition(track.slug as TrackPresetId));
      spec = spec ?? fallback.spec;
      program = program ?? fallback.program;
      source = source ?? fallback.source;
      status = status ?? fallback.status;
    } catch {
      // Leave as-is for non-system/custom rows without V2 data.
    }
  }
  return {
    id: track.id,
    learnspaceId: track.learnspaceId,
    slug: track.slug,
    name: track.name,
    goal: track.goal,
    isSystem: track.isSystem,
    source: source ?? undefined,
    status: status ?? undefined,
    spec,
    program,
    policy: track.policy ?? null,
    policyOutcome: track.policyOutcome ?? null,
    policyExplanation: track.policyExplanation ?? null,
    policyCompilerVersion: track.policyCompilerVersion ?? null,
  };
}

function buildPresetDefinition(preset: TrackPresetId): TrackPresetDefinition {
  const definition = SYSTEM_TRACK_PRESETS.find((candidate) => candidate.slug === preset);
  if (!definition) {
    throw new Error(`Unsupported track preset: ${preset}`);
  }
  return definition;
}

function buildVirtualTrack(learnspaceId: string, preset: TrackPresetId): LearnspaceTrackSummary {
  const definition = buildPresetDefinition(preset);
  const template = buildSystemTrackV2Template("system", learnspaceId, definition);

  return {
    id: buildSystemTrackId(learnspaceId, preset),
    learnspaceId,
    slug: definition.slug,
    name: definition.name,
    goal: definition.goal,
    isSystem: true,
    source: template.source,
    status: template.status,
    spec: template.spec,
    program: template.program,
  };
}

function listStoredTracks(db: AppDatabase, userId: string, learnspaceId: string): Track[] {
  return db
    .select()
    .from(tracks)
    .all()
    .filter((track) => track.userId === userId && track.learnspaceId === learnspaceId)
    .sort((left, right) => {
      if (left.isSystem !== right.isSystem) {
        return left.isSystem ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
}

export function listLearnspaceTracks(db: AppDatabase, userId: string, learnspaceId: string): LearnspaceTrackSummary[] {
  const stored = listStoredTracks(db, userId, learnspaceId).filter(
    (track) => track.status !== "archived",
  );
  if (stored.length > 0) {
    return stored.map(toTrackSummary);
  }

  return TRACK_PRESETS.map((mode) => buildVirtualTrack(learnspaceId, mode));
}

export function ensureSystemTracks(
  db: AppDatabase,
  {
    userId,
    learnspaceId,
    now,
  }: {
    userId: string;
    learnspaceId: string;
    now: () => Date;
  },
): LearnspaceTrackSummary[] {
  const timestamp = now().toISOString();

  // Clean up orphaned system tracks whose slug is no longer part of the
  // current preset list (e.g., a preset that was removed in code). User
  // authored tracks (isSystem === false) are never touched.
  const validSystemSlugs = new Set<string>(SYSTEM_TRACK_PRESETS.map((preset) => preset.slug));
  const existingStored = listStoredTracks(db, userId, learnspaceId);
  for (const track of existingStored) {
    if (track.isSystem && !validSystemSlugs.has(track.slug)) {
      db.delete(tracks).where(eq(tracks.id, track.id)).run();
    }
  }

  const stored = listStoredTracks(db, userId, learnspaceId);
  const storedBySlug = new Map(stored.map((track) => [track.slug, track]));

  for (const preset of SYSTEM_TRACK_PRESETS) {
    const template = buildSystemTrackV2Template(userId, learnspaceId, preset);
    const existing = storedBySlug.get(preset.slug);
    if (existing) {
      db.update(tracks)
        .set({
          name: preset.name,
          goal: preset.goal,
          source: template.source,
          status: template.status,
          spec: template.spec,
          program: template.program,
          isSystem: true,
          updatedAt: timestamp,
        })
        .where(eq(tracks.id, existing.id))
        .run();
      continue;
    }

    const trackRow: NewTrack = {
      id: buildSystemTrackId(learnspaceId, preset.slug),
      userId,
      learnspaceId,
      slug: preset.slug,
      name: preset.name,
      goal: preset.goal,
      source: template.source,
      status: template.status,
      spec: template.spec,
      program: template.program,
      isSystem: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.insert(tracks).values(trackRow).run();
  }

  const learnspace = findLearnspaceRecord(db, learnspaceId);
  const defaultTrackId = buildSystemTrackId(learnspaceId, "recommended");
  const knownTrackIds = new Set(
    [
      ...TRACK_PRESETS.map((mode) => buildSystemTrackId(learnspaceId, mode)),
      ...listStoredTracks(db, userId, learnspaceId)
        .filter((track) => track.status !== "archived")
        .map((track) => track.id),
    ],
  );
  const activeTrackId = learnspace.activeTrackId && knownTrackIds.has(learnspace.activeTrackId)
    ? learnspace.activeTrackId
    : defaultTrackId;
  if (!learnspace.activeTrackId || !knownTrackIds.has(learnspace.activeTrackId)) {
    db.update(learnspaces)
      .set({
        activeTrackId,
        updatedAt: timestamp,
      })
      .where(eq(learnspaces.id, learnspaceId))
      .run();
  }

  return listLearnspaceTracks(db, userId, learnspaceId);
}

export interface CreateUserTrackFromPolicyInput {
  userId: string;
  learnspaceId: string;
  name: string;
  goal: string;
  policy: TrackPolicy;
  domainId: PolicyDomainId;
  outcome: PolicyOutcome;
  explanation?: PolicyExplanation | null;
  compilerVersion?: string;
  status?: TrackStatus;
  now: () => Date;
}

export interface UpdateUserTrackFromPolicyInput extends CreateUserTrackFromPolicyInput {
  trackId: string;
}

function rejectAsError(unsupportedFields: string[], reason: string): Error {
  const err = new Error(reason);
  (err as Error & { unsupportedFields?: string[] }).unsupportedFields = unsupportedFields;
  return err;
}

function recompilePolicyForTrack(
  db: AppDatabase,
  input: {
    policy: TrackPolicy;
    domainId: PolicyDomainId;
    trackId: string;
    userId: string;
    learnspaceId: string;
    name: string;
    goal: string;
    now: () => Date;
  },
): { policy: TrackPolicy; spec: TrackSpecV2; program: TrackProgramV2; explanation: PolicyExplanation } {
  const catalog = buildDomainCatalogFromDb(db, input.learnspaceId, input.domainId, input.learnspaceId);
  const validation = validatePolicy(input.policy, input.domainId, catalog);
  if (!validation.valid) {
    throw new Error(`Policy failed server-side validation: ${validation.errors.join("; ")}`);
  }
  const lowered = lowerPolicy({
    policy: validation.normalized,
    trackId: input.trackId,
    userId: input.userId,
    learnspaceId: input.learnspaceId,
    name: input.name,
    goal: input.goal,
    now: input.now,
  });
  if (!lowered.ok) {
    throw rejectAsError(
      lowered.unsupportedFields,
      `Policy could not be lowered: ${lowered.reason}`,
    );
  }
  return {
    policy: validation.normalized,
    spec: lowered.spec,
    program: lowered.program,
    explanation: lowered.explanation,
  };
}

export function createUserTrackFromPolicy(
  db: AppDatabase,
  input: CreateUserTrackFromPolicyInput,
): LearnspaceTrackSummary {
  const name = normalizeTrackName(input.name);
  const goal = normalizeTrackGoal(input.goal);
  const timestamp = input.now().toISOString();
  const trackId = `track-${input.learnspaceId}-custom-${randomUUID()}`;
  const compiled = recompilePolicyForTrack(db, {
    policy: input.policy,
    domainId: input.domainId,
    trackId,
    userId: input.userId,
    learnspaceId: input.learnspaceId,
    name,
    goal,
    now: input.now,
  });

  const mergedExplanation: PolicyExplanation = {
    ...compiled.explanation,
    ...(input.explanation ?? {}),
  };

  const row: NewTrack = {
    id: trackId,
    userId: input.userId,
    learnspaceId: input.learnspaceId,
    slug: `${slugifyTrackName(name)}-${trackId.slice(-8)}`,
    name,
    goal,
    source: "llm_drafted",
    status: input.status ?? "active",
    spec: compiled.spec,
    program: compiled.program,
    policy: compiled.policy,
    policyOutcome: input.outcome,
    policyExplanation: Object.keys(mergedExplanation).length > 0 ? mergedExplanation : null,
    policyCompilerVersion: input.compilerVersion ?? POLICY_COMPILER_VERSION,
    isSystem: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.insert(tracks).values(row).run();

  if (row.status === "active") {
    db.update(learnspaces)
      .set({
        activeTrackId: trackId,
        updatedAt: timestamp,
      })
      .where(eq(learnspaces.id, input.learnspaceId))
      .run();
  }

  return toTrackSummary(db.select().from(tracks).where(eq(tracks.id, trackId)).get()!);
}

export function updateUserTrackFromPolicy(
  db: AppDatabase,
  input: UpdateUserTrackFromPolicyInput,
): LearnspaceTrackSummary {
  const existing = db.select().from(tracks)
    .where(and(eq(tracks.id, input.trackId), eq(tracks.userId, input.userId), eq(tracks.learnspaceId, input.learnspaceId)))
    .get();
  if (!existing) {
    throw new Error(`Unknown track: ${input.trackId}`);
  }
  if (existing.isSystem) {
    throw new Error("System tracks cannot be edited");
  }
  if (existing.status === "archived") {
    throw new Error("Archived tracks cannot be edited");
  }

  const name = normalizeTrackName(input.name);
  const goal = normalizeTrackGoal(input.goal);
  const timestamp = input.now().toISOString();

  const compiled = recompilePolicyForTrack(db, {
    policy: input.policy,
    domainId: input.domainId,
    trackId: existing.id,
    userId: input.userId,
    learnspaceId: input.learnspaceId,
    name,
    goal,
    now: input.now,
  });

  const mergedExplanation: PolicyExplanation = {
    ...compiled.explanation,
    ...(input.explanation ?? {}),
  };

  db.update(tracks)
    .set({
      name,
      goal,
      spec: compiled.spec,
      program: compiled.program,
      policy: compiled.policy,
      policyOutcome: input.outcome,
      policyExplanation: Object.keys(mergedExplanation).length > 0 ? mergedExplanation : null,
      policyCompilerVersion: input.compilerVersion ?? POLICY_COMPILER_VERSION,
      updatedAt: timestamp,
    })
    .where(eq(tracks.id, existing.id))
    .run();

  // Invalidate runtime cursor/planner position. Durable mastery (skill
  // confidence, attempts, SM-5 state) lives elsewhere and is untouched.
  db.delete(trackRuntimeState).where(eq(trackRuntimeState.trackId, existing.id)).run();

  return toTrackSummary(db.select().from(tracks).where(eq(tracks.id, existing.id)).get()!);
}

export function archiveUserTrack(
  db: AppDatabase,
  input: {
    userId: string;
    learnspaceId: string;
    trackId: string;
    now: () => Date;
  },
): LearnspaceTrackSummary {
  const existing = db.select().from(tracks)
    .where(and(eq(tracks.id, input.trackId), eq(tracks.userId, input.userId), eq(tracks.learnspaceId, input.learnspaceId)))
    .get();
  if (!existing) {
    throw new Error(`Unknown track: ${input.trackId}`);
  }
  if (existing.isSystem) {
    throw new Error("System tracks cannot be archived");
  }

  const timestamp = input.now().toISOString();
  db.update(tracks)
    .set({
      status: "archived",
      updatedAt: timestamp,
    })
    .where(eq(tracks.id, existing.id))
    .run();

  const learnspace = findLearnspaceRecord(db, input.learnspaceId);
  if (learnspace.activeTrackId === existing.id) {
    db.update(learnspaces)
      .set({
        activeTrackId: buildSystemTrackId(input.learnspaceId, "recommended"),
        updatedAt: timestamp,
      })
      .where(eq(learnspaces.id, input.learnspaceId))
      .run();
  }

  return toTrackSummary(db.select().from(tracks).where(eq(tracks.id, existing.id)).get()!);
}

/**
 * Hard delete a user-authored track. History rows (sessions, attempts)
 * keep their `trackSnapshot` so past practice still renders — see
 * TRACK-CRUD-SNAPSHOT-PLAN. System tracks are immutable. Computed
 * runtime state cascades; selection events keep their trackId pointer
 * as an audit breadcrumb (dangling is fine — attempts have the real
 * snapshot).
 */
export function deleteUserTrack(
  db: AppDatabase,
  input: {
    userId: string;
    learnspaceId: string;
    trackId: string;
    now: () => Date;
  },
): void {
  const existing = db.select().from(tracks)
    .where(and(eq(tracks.id, input.trackId), eq(tracks.userId, input.userId), eq(tracks.learnspaceId, input.learnspaceId)))
    .get();
  if (!existing) {
    throw new Error(`Unknown track: ${input.trackId}`);
  }
  if (existing.isSystem) {
    throw new Error("System tracks cannot be deleted");
  }

  const timestamp = input.now().toISOString();

  // If the deleted track is the active one, reassign to the recommended
  // system preset (same rule archive uses).
  const learnspace = findLearnspaceRecord(db, input.learnspaceId);
  if (learnspace.activeTrackId === existing.id) {
    db.update(learnspaces)
      .set({
        activeTrackId: buildSystemTrackId(input.learnspaceId, "recommended"),
        updatedAt: timestamp,
      })
      .where(eq(learnspaces.id, input.learnspaceId))
      .run();
  }

  // Cascade computed state. History rows (sessions/attempts) are NOT
  // touched — their trackSnapshot carries the display data forward.
  db.delete(trackRuntimeState).where(eq(trackRuntimeState.trackId, existing.id)).run();
  db.delete(tracks).where(eq(tracks.id, existing.id)).run();
}

export interface TrackSnapshot {
  id: string;
  name: string;
  goal: string;
  slug: string;
  isSystem: boolean;
  spec: Record<string, unknown> | null;
  program: Record<string, unknown> | null;
  policy: Record<string, unknown> | null;
  snapshottedAt: string;
}

/**
 * Captures the current state of a track so the session/attempt row that
 * references it can render later even after the catalog row is edited
 * or deleted. Returns `null` when the track id resolves to nothing
 * (stale pointer from a deleted track; caller should skip snapshotting).
 */
export function buildTrackSnapshot(
  db: AppDatabase,
  userId: string,
  learnspaceId: string,
  trackId: string,
  now: () => Date,
): TrackSnapshot | null {
  const tracks = listLearnspaceTracks(db, userId, learnspaceId);
  const track = tracks.find((t) => t.id === trackId);
  if (!track) return null;
  return {
    id: track.id,
    name: track.name,
    goal: track.goal,
    slug: track.slug,
    isSystem: track.isSystem,
    spec: track.spec ? (track.spec as unknown as Record<string, unknown>) : null,
    program: track.program ? (track.program as unknown as Record<string, unknown>) : null,
    policy: track.policy ? (track.policy as unknown as Record<string, unknown>) : null,
    snapshottedAt: now().toISOString(),
  };
}

export function getActiveTrack(
  db: AppDatabase,
  {
    userId,
    learnspace,
  }: {
    userId: string;
    learnspace: Learnspace;
  },
): LearnspaceTrackSummary {
  const availableTracks = listLearnspaceTracks(db, userId, learnspace.id);
  if (learnspace.activeTrackId) {
    const active = availableTracks.find((track) => track.id === learnspace.activeTrackId);
    if (active) {
      return active;
    }
  }

  return availableTracks.find((track) => track.slug === "recommended") ?? availableTracks[0];
}

export function resolveTrackContext(
  db: AppDatabase,
  {
    userId,
    learnspaceId,
    trackId,
  }: {
    userId: string;
    learnspaceId: string;
    trackId?: string;
  },
): ResolvedTrackContext {
  const learnspace = findLearnspaceRecord(db, learnspaceId);
  const availableTracks = listLearnspaceTracks(db, userId, learnspaceId);

  if (trackId) {
    const explicitTrack = availableTracks.find((track) => track.id === trackId);
    if (!explicitTrack) {
      throw new Error(`Unknown track: ${trackId}`);
    }
    return {
      track: explicitTrack,
      source: "explicit_track",
    };
  }

  const activeTrack = getActiveTrack(db, { userId, learnspace });
  if (learnspace.activeTrackId) {
    return {
      track: activeTrack,
      source: "active_track",
    };
  }

  return {
    track: activeTrack,
    source: "default_track",
  };
}

export function resolveRequestedTrackId(
  db: AppDatabase,
  {
    userId,
    learnspaceId,
    trackId,
    preset,
  }: {
    userId: string;
    learnspaceId: string;
    trackId?: string;
    preset?: TrackPresetId;
  },
): string | undefined {
  if (trackId) return trackId;
  if (!preset) return undefined;

  const availableTracks = listLearnspaceTracks(db, userId, learnspaceId);
  return availableTracks.find((track) => track.slug === preset)?.id
    ?? buildVirtualTrack(learnspaceId, preset).id;
}

export function isValidTrackPreset(value: unknown): value is TrackPresetId {
  return typeof value === "string" && TRACK_PRESETS.includes(value as TrackPresetId);
}

export function activateTrack(
  db: AppDatabase,
  {
    userId,
    learnspaceId,
    trackId,
    now,
  }: {
    userId: string;
    learnspaceId: string;
    trackId: string;
    now: () => Date;
  },
): LearnspaceTrackSummary {
  const storedTrack = db
    .select()
    .from(tracks)
    .where(and(eq(tracks.id, trackId), eq(tracks.userId, userId), eq(tracks.learnspaceId, learnspaceId)))
    .get();

  if (!storedTrack) {
    throw new Error(`Unknown track: ${trackId}`);
  }

  db.update(learnspaces)
    .set({
      activeTrackId: trackId,
      updatedAt: now().toISOString(),
    })
    .where(eq(learnspaces.id, learnspaceId))
    .run();

  return toTrackSummary(storedTrack);
}
