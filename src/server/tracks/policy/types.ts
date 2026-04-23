import type {
  AdaptationPolicyV4,
  AllocationPolicyV4,
  CadenceRuleV4,
  ContentSourcePolicyV4,
  DifficultyPolicyV4,
  PacingPolicyV4,
  ProgressionPolicyV4,
  ReviewPolicyV4,
  ScopePolicyV4,
  SessionCompositionPolicyV4,
  TrackPolicyV4,
  TrackV4DomainId,
  TrackV4HandlingOutcome,
} from "../v4/benchmark-schema.js";

export type TrackPolicy = TrackPolicyV4;
export type PolicyDomainId = TrackV4DomainId;
export type PolicyHandlingOutcome = TrackV4HandlingOutcome;

// Maps the active Codence learnspace id to the v4 policy domain whose
// skill + category catalog the compiler and validator should use. When
// more learnspaces are added, extend this table or replace it with a
// runtime-derived catalog built from the learnspace's own skills.
const LEARNSPACE_TO_POLICY_DOMAIN: Record<string, PolicyDomainId> = {
  "coding-interview-patterns": "coding-interview-patterns",
};

export function resolvePolicyDomainForLearnspace(learnspaceId: string): PolicyDomainId | null {
  return LEARNSPACE_TO_POLICY_DOMAIN[learnspaceId] ?? null;
}

export type PolicyOutcome = "compiled" | "repaired";

export type ScopePolicy = ScopePolicyV4;
export type AllocationPolicy = AllocationPolicyV4;
export type PacingPolicy = PacingPolicyV4;
export type SessionCompositionPolicy = SessionCompositionPolicyV4;
export type DifficultyPolicy = DifficultyPolicyV4;
export type ProgressionPolicy = ProgressionPolicyV4;
export type ReviewPolicy = ReviewPolicyV4;
export type AdaptationPolicy = AdaptationPolicyV4;
export type CadenceRule = CadenceRuleV4;
export type ContentSourcePolicy = ContentSourcePolicyV4;

export interface PolicyRepairNote {
  field: string;
  change: string;
  reason: string;
}

export interface PolicyExplanation {
  repairs?: PolicyRepairNote[];
  approximations?: Array<{ field: string; representedAs: string }>;
  notes?: string[];
}
