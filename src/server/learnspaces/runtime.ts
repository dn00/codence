import { eq } from "drizzle-orm";
import { getLearnspaceFamily } from "../families/registry.js";
import type {
  LearnspaceCapabilityProfile,
  LearnspaceFamilyDefinition,
  LearnspaceFamilyId,
} from "../families/types.js";
import type { AppDatabase } from "../persistence/db.js";
import { learnspaces, type Learnspace } from "../persistence/schema.js";
import type { LearnspaceConfig } from "./config-types.js";
import type { SchedulerId } from "../core/schedulers/types.js";

// ResolvedLearnspaceRuntime is the learnspace-level metadata projection used
// by routes and onboarding — NOT the runtime contract for an attempt.
// Session/coach/execute/complete all read AttemptBlueprint, which is pinned
// per session. `family` here is the capability envelope surfaced to the
// client for display (labels, hints); it must not be treated as the
// authoritative runtime shape.
export interface ResolvedLearnspaceRuntime {
  learnspace: Learnspace;
  config: LearnspaceConfig;
  familyId: LearnspaceFamilyId;
  family: LearnspaceFamilyDefinition;
  schedulerId: SchedulerId;
  capabilities: LearnspaceCapabilityProfile;
}

export class LearnspaceRuntimeResolutionError extends Error {
  constructor(learnspaceId: string) {
    super(
      `Learnspace "${learnspaceId}" does not declare runtime metadata and cannot be resolved safely`,
    );
    this.name = "LearnspaceRuntimeResolutionError";
  }
}

export function parseLearnspaceConfig(learnspace: Learnspace): LearnspaceConfig {
  return learnspace.config as unknown as LearnspaceConfig;
}

export function findLearnspaceRecord(db: AppDatabase, learnspaceId: string): Learnspace {
  const learnspace = db
    .select()
    .from(learnspaces)
    .where(eq(learnspaces.id, learnspaceId))
    .get();

  if (!learnspace) {
    throw new Error(`Unknown learnspace: ${learnspaceId}`);
  }

  return learnspace;
}

export function resolveLearnspaceRuntime(learnspace: Learnspace): ResolvedLearnspaceRuntime {
  const config = parseLearnspaceConfig(learnspace);

  if (config.familyId && config.schedulerId) {
    const family = getLearnspaceFamily(config.familyId);
    return {
      learnspace,
      config,
      familyId: config.familyId,
      family,
      schedulerId: config.schedulerId,
      capabilities: {
        familyId: config.familyId,
        artifactKinds: family.artifactKinds,
        sessionTypes: family.sessionTypes,
        evaluatorKinds: family.evaluatorKinds,
        schedulerIds: family.schedulerIds,
        scopeDimensions: family.scopeDimensions,
        difficultyBands: family.difficultyBands,
        styleDimensions: family.styleDimensions,
        generationCapabilities: family.generationCapabilities,
        evidenceDimensions: family.evidenceDimensions,
      },
    };
  }

  throw new LearnspaceRuntimeResolutionError(learnspace.id);
}

export function loadLearnspaceRuntime(db: AppDatabase, learnspaceId: string): ResolvedLearnspaceRuntime {
  return resolveLearnspaceRuntime(findLearnspaceRecord(db, learnspaceId));
}
