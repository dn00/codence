import type { SchedulerId } from "../core/schedulers/types.js";

// AttemptArchetype lives here (not in runtime/attempt-blueprint.ts) so
// that families/types stays the source of truth for what an archetype
// is, and attempt-blueprint.ts can depend on families without creating
// a circular module graph.
export type AttemptArchetype = "protocol_solve";

// Family is a capability envelope, not a runtime contract. The runtime
// contract for an attempt lives in AttemptBlueprint
// (src/server/runtime/attempt-blueprint.ts). A family's archetypes,
// moduleIds, artifactKinds, protocolStepIds, validatorKinds, and
// schedulerIds describe what a learnspace in this family is *allowed*
// to use. The runtime still executes against the resolved blueprint
// pinned to each session/attempt. Family exists so that resolution
// time can validate a learnspace's declared contract against the
// allowed bounds (archetype, scheduler, validator) before it becomes
// a durable pin on history.
export const LEARNSPACE_FAMILY_IDS = ["dsa"] as const;

export type LearnspaceFamilyId = (typeof LEARNSPACE_FAMILY_IDS)[number];

export type SessionTypeId =
  | "timed_solve"
  | "untimed_solve"
  | "review_drill"
  | "mock"
  | "recall"
  | "recap"
  | "concept_quiz"
  | "application"
  | "design_prompt"
  | "tradeoff_critique"
  | "architecture_mock";

export type EvaluatorKindId =
  | "correctness"
  | "communication"
  | "tradeoff_quality"
  | "recall"
  | "rubric_score"
  | "code_executor";

export type ScopeDimensionId =
  | "skill"
  | "topic"
  | "module"
  | "chapter"
  | "tag"
  | "source";

export type DifficultyBandId = "easy" | "medium" | "hard";

export type StyleDimensionId =
  | "company_style"
  | "exam_style"
  | "practical_style"
  | "theory_style";

export type EvidenceDimensionId =
  | "mistake_pattern"
  | "strength_signal"
  | "communication_signal"
  | "difficulty_mismatch"
  | "novelty_tolerance"
  | "fatigue_or_avoidance"
  | "readiness_signal"
  | "confidence_calibration";

export interface FamilyGenerationCapabilities {
  supportedArtifactKinds: readonly string[];
  supportsStyleTargeting: boolean;
  supportsNoveltyTargeting: boolean;
  supportsDifficultyTargeting: boolean;
}

export interface LearnspaceCapabilityProfile {
  familyId: LearnspaceFamilyId;
  artifactKinds: readonly string[];
  sessionTypes: readonly SessionTypeId[];
  evaluatorKinds: readonly EvaluatorKindId[];
  schedulerIds: readonly SchedulerId[];
  scopeDimensions: readonly ScopeDimensionId[];
  difficultyBands: readonly DifficultyBandId[];
  styleDimensions: readonly StyleDimensionId[];
  generationCapabilities: FamilyGenerationCapabilities;
  evidenceDimensions: readonly EvidenceDimensionId[];
}

export interface LearnspaceFamilyDefinition {
  id: LearnspaceFamilyId;
  label: string;
  description: string;
  archetypes: readonly AttemptArchetype[];
  moduleIds: readonly string[];
  artifactKinds: readonly string[];
  protocolStepIds: readonly string[];
  validatorKinds: readonly string[];
  schedulerIds: readonly SchedulerId[];
  sessionTypes: readonly SessionTypeId[];
  evaluatorKinds: readonly EvaluatorKindId[];
  scopeDimensions: readonly ScopeDimensionId[];
  difficultyBands: readonly DifficultyBandId[];
  styleDimensions: readonly StyleDimensionId[];
  generationCapabilities: FamilyGenerationCapabilities;
  evidenceDimensions: readonly EvidenceDimensionId[];
}
