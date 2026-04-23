import { eq } from "drizzle-orm";
import type { SchedulerId } from "../core/schedulers/types.js";
import type {
  ExecutorConfig,
  LearnspaceConfig,
  ProtocolStep,
} from "../learnspaces/config-types.js";
import { getLearnspaceFamily } from "../families/registry.js";
import type { AttemptArchetype, LearnspaceFamilyId } from "../families/types.js";
import type { AppDatabase } from "../persistence/db.js";
import { attempts, items, learnspaces, sessions, type Attempt, type Item, type Learnspace, type Session } from "../persistence/schema.js";

export type { AttemptArchetype } from "../families/types.js";

// AttemptBlueprint is the runtime contract for a single session/attempt.
// It is resolved once at session creation and pinned on both `sessions` and
// `attempts` so live runtime code (coach/execute/complete) and historical
// interpretation stay stable even if the underlying learnspace config
// changes later. Family is consulted only for validation — the blueprint,
// not the family, is what the runtime executes against.
//
// Two shapes live in this module:
//
// 1. `AttemptBlueprint` — the in-memory shape used by coach/execute/
//    completion. It carries the full `LearnspaceConfig` because the
//    runtime still reads display-only helpers (skill name maps, labels)
//    from it.
// 2. `PinnedBlueprint` — the minimal durable projection written to
//    `sessions.blueprint_snapshot` and `attempts.blueprint_snapshot`.
//    It pins only the runtime-contract fields that must survive a
//    later learnspace config change: protocol steps, prompts, executor,
//    test harness. Display-only fields (skills taxonomy, labels, tags,
//    tag weights, selection thresholds, item schema, generation prompt)
//    are re-read from the live learnspace row on load.
//
// `AttemptArchetype` itself is defined in families/types.ts so that
// families stay the authority on which archetypes are allowed. It is
// re-exported from this module for ergonomic access by callers that
// already depend on the blueprint.

export interface BlueprintItemProjection {
  id: string;
  title: string;
  difficulty: string;
  skillIds: string[];
  tags: string[];
  content: Record<string, unknown>;
}

export interface PinnedBlueprintConfig {
  protocol_steps: ProtocolStep[];
  coaching_persona: string;
  coaching_instruction?: string;
  evaluation_prompt: string;
  executor: ExecutorConfig | null;
  test_harness_template: string;
}

export interface PinnedBlueprint {
  blueprintId: string;
  blueprintVersion: number;
  learnspaceConfigVersion: number | null;
  familyId: LearnspaceFamilyId;
  schedulerId: SchedulerId;
  archetype: AttemptArchetype;
  learnspaceId: string;
  requiresExecution: boolean;
  item: BlueprintItemProjection;
  pinnedConfig: PinnedBlueprintConfig;
}

export interface AttemptBlueprint {
  blueprintId: string;
  blueprintVersion: number;
  learnspaceConfigVersion: number | null;
  familyId: LearnspaceFamilyId;
  schedulerId: SchedulerId;
  archetype: AttemptArchetype;
  learnspaceId: string;
  requiresExecution: boolean;
  item: BlueprintItemProjection;
  config: LearnspaceConfig;
}

const ATTEMPT_BLUEPRINT_VERSION = 1;
const PROTOCOL_SOLVE_BLUEPRINT_ID = "protocol_solve:code_problem";

export function resolveAttemptBlueprint(input: {
  learnspaceId: string;
  learnspaceConfig: LearnspaceConfig;
  item: Item;
}): AttemptBlueprint {
  const familyId = input.learnspaceConfig.familyId;
  const schedulerId = input.learnspaceConfig.schedulerId;

  if (!familyId || !schedulerId) {
    throw new Error(
      `Learnspace "${input.learnspaceId}" does not declare runtime metadata and cannot resolve an attempt blueprint`,
    );
  }

  // Resolve the family and validate that the blueprint's runtime
  // contract is within the family's declared capability envelope.
  // Family is a capability bound, not a runtime contract — the
  // blueprint we pin below is what the runtime actually executes.
  const family = getLearnspaceFamily(familyId);

  const archetype: AttemptArchetype = "protocol_solve";
  if (!family.archetypes.includes(archetype)) {
    throw new Error(
      `Learnspace "${input.learnspaceId}" resolved archetype "${archetype}" is not allowed by family "${familyId}"`,
    );
  }

  if (!family.schedulerIds.includes(schedulerId)) {
    throw new Error(
      `Learnspace "${input.learnspaceId}" declared scheduler "${schedulerId}" is not allowed by family "${familyId}"`,
    );
  }

  const requiresExecution =
    input.learnspaceConfig.executor !== null &&
    input.learnspaceConfig.protocol_steps.some((step) => step.editor === "code");

  if (requiresExecution && !family.validatorKinds.includes("code_executor")) {
    throw new Error(
      `Learnspace "${input.learnspaceId}" requires a code executor but family "${familyId}" does not declare it as an allowed validator kind`,
    );
  }

  return {
    blueprintId: PROTOCOL_SOLVE_BLUEPRINT_ID,
    blueprintVersion: ATTEMPT_BLUEPRINT_VERSION,
    learnspaceConfigVersion:
      typeof input.learnspaceConfig.builtInVersion === "number"
        ? input.learnspaceConfig.builtInVersion
        : null,
    familyId,
    schedulerId,
    archetype,
    learnspaceId: input.learnspaceId,
    requiresExecution,
    item: {
      id: input.item.id,
      title: input.item.title,
      difficulty: input.item.difficulty,
      skillIds: input.item.skillIds ?? [],
      tags: input.item.tags ?? [],
      content: input.item.content ?? {},
    },
    config: input.learnspaceConfig,
  };
}

export function toPinnedBlueprint(blueprint: AttemptBlueprint): PinnedBlueprint {
  const config = blueprint.config;
  return {
    blueprintId: blueprint.blueprintId,
    blueprintVersion: blueprint.blueprintVersion,
    learnspaceConfigVersion: blueprint.learnspaceConfigVersion,
    familyId: blueprint.familyId,
    schedulerId: blueprint.schedulerId,
    archetype: blueprint.archetype,
    learnspaceId: blueprint.learnspaceId,
    requiresExecution: blueprint.requiresExecution,
    item: blueprint.item,
    pinnedConfig: {
      protocol_steps: config.protocol_steps,
      coaching_persona: config.coaching_persona,
      ...(config.coaching_instruction !== undefined
        ? { coaching_instruction: config.coaching_instruction }
        : {}),
      evaluation_prompt: config.evaluation_prompt,
      executor: config.executor,
      test_harness_template: config.test_harness_template,
    },
  };
}

export function fromPinnedBlueprint(
  pinned: PinnedBlueprint,
  liveConfig: LearnspaceConfig,
): AttemptBlueprint {
  const mergedConfig: LearnspaceConfig = {
    ...liveConfig,
    protocol_steps: pinned.pinnedConfig.protocol_steps,
    coaching_persona: pinned.pinnedConfig.coaching_persona,
    coaching_instruction: pinned.pinnedConfig.coaching_instruction,
    evaluation_prompt: pinned.pinnedConfig.evaluation_prompt,
    executor: pinned.pinnedConfig.executor,
    test_harness_template: pinned.pinnedConfig.test_harness_template,
  };

  return {
    blueprintId: pinned.blueprintId,
    blueprintVersion: pinned.blueprintVersion,
    learnspaceConfigVersion: pinned.learnspaceConfigVersion,
    familyId: pinned.familyId,
    schedulerId: pinned.schedulerId,
    archetype: pinned.archetype,
    learnspaceId: pinned.learnspaceId,
    requiresExecution: pinned.requiresExecution,
    item: pinned.item,
    config: mergedConfig,
  };
}

function isPinnedBlueprintConfig(value: unknown): value is PinnedBlueprintConfig {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.protocol_steps) &&
    typeof record.coaching_persona === "string" &&
    typeof record.evaluation_prompt === "string" &&
    typeof record.test_harness_template === "string" &&
    (record.executor === null || typeof record.executor === "object")
  );
}

function isPinnedBlueprint(value: unknown): value is PinnedBlueprint {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const item = record.item as Record<string, unknown> | null;
  // Version gate: exact match only. Snapshots pinned under a different
  // blueprint version may have an incompatible PinnedBlueprint shape.
  // Rejecting them here forces loadAttemptBlueprintForSession to fall
  // through to the legacy resolver (which re-reads live config and
  // re-runs family-bounds validation via resolveAttemptBlueprint).
  return (
    typeof record.blueprintId === "string" &&
    record.blueprintVersion === ATTEMPT_BLUEPRINT_VERSION &&
    typeof record.familyId === "string" &&
    typeof record.schedulerId === "string" &&
    record.archetype === "protocol_solve" &&
    typeof record.learnspaceId === "string" &&
    typeof record.requiresExecution === "boolean" &&
    isPinnedBlueprintConfig(record.pinnedConfig) &&
    typeof item === "object" &&
    item !== null &&
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.difficulty === "string" &&
    Array.isArray(item.skillIds) &&
    Array.isArray(item.tags) &&
    typeof item.content === "object" &&
    item.content !== null
  );
}

export function parsePinnedBlueprint(value: unknown): PinnedBlueprint | null {
  return isPinnedBlueprint(value) ? value : null;
}

function findSession(db: AppDatabase, sessionId: string): Session {
  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) {
    throw new Error(`Unknown session: ${sessionId}`);
  }
  return session;
}

function findAttempt(db: AppDatabase, sessionId: string): Attempt {
  const attempt = db.select().from(attempts).where(eq(attempts.sessionId, sessionId)).get();
  if (!attempt) {
    throw new Error(`Unknown attempt for session: ${sessionId}`);
  }
  return attempt;
}

function findLearnspace(db: AppDatabase, learnspaceId: string): Learnspace {
  const learnspace = db.select().from(learnspaces).where(eq(learnspaces.id, learnspaceId)).get();
  if (!learnspace) {
    throw new Error(`Unknown learnspace: ${learnspaceId}`);
  }
  return learnspace;
}

function findItem(db: AppDatabase, itemId: string): Item {
  const item = db.select().from(items).where(eq(items.id, itemId)).get();
  if (!item) {
    throw new Error(`Unknown item: ${itemId}`);
  }
  return item;
}

export function loadAttemptBlueprintForSession(db: AppDatabase, sessionId: string): AttemptBlueprint {
  const session = findSession(db, sessionId);
  const attempt = findAttempt(db, sessionId);

  const pinned =
    parsePinnedBlueprint(session.blueprintSnapshot) ??
    parsePinnedBlueprint(attempt.blueprintSnapshot);

  if (pinned) {
    const learnspace = findLearnspace(db, session.learnspaceId);
    const liveConfig = learnspace.config as unknown as LearnspaceConfig;
    return fromPinnedBlueprint(pinned, liveConfig);
  }

  // Legacy compatibility path for sessions created before blueprint pinning.
  const learnspace = findLearnspace(db, session.learnspaceId);
  const item = findItem(db, session.itemId);
  return resolveAttemptBlueprint({
    learnspaceId: session.learnspaceId,
    learnspaceConfig: learnspace.config as unknown as LearnspaceConfig,
    item,
  });
}
