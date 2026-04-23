import { TRACK_V4_DOMAIN_FIXTURES, type TrackBenchmarkDomainFixtureV4 } from "../v4/benchmark-fixtures.js";
import type { PolicyDomainId } from "./types.js";

export interface PolicyPromptTurn {
  role: "user" | "assistant";
  content: string;
}

export interface PolicyPromptInput {
  goal: string;
  name?: string;
  skillIds?: string[];
  domainId: PolicyDomainId;
  domainCatalog?: TrackBenchmarkDomainFixtureV4;
  priorTurns?: PolicyPromptTurn[];
  lastJsonError?: string | null;
}

const SYSTEM_PROMPT = [
  "You interpret user goals into structured Codence track policies.",
  "Return exactly one JSON object. No markdown, no prose, no code fences.",
  "",
  "The JSON must have a top-level \"outcome\" field with one of:",
  "  - \"compiled\": you understood the goal and produced a policy",
  "  - \"repaired\": you understood the goal but had to repair an invalid or ambiguous request",
  "  - \"clarify\": the request is ambiguous and needs one follow-up question",
  "  - \"reject\": the request cannot be expressed in the supported policy surface",
  "",
  "For \"compiled\" and \"repaired\": include \"policy\": a TrackPolicy object AND \"displayName\": a short human-readable track name (3-6 words, title case, no punctuation or quotes — e.g. \"Easy Array Drills\", \"Graph Traversal Rehab\"). Derive the name from the goal; do not echo the goal verbatim.",
  "For \"repaired\": also include \"explanation\": { \"repairs\": [{ field, change, reason }] }.",
  "For \"clarify\": include \"question\": string — a single focused question.",
  "For \"reject\": include \"reason\": string and optionally \"unsupportedFields\": string[].",
  "",
  "TrackPolicy shape (all fields required at the top level):",
  "  scope: { includeSkillIds: string[], excludeSkillIds: string[], includeCategories: string[], excludeCategories: string[], weakAreasOnly?: boolean, fundamentalsOnly?: boolean }",
  "  allocation: { skillWeights?: Record<string, number>, categoryWeights?: Record<string, number>, breadthVsDepth?: 'balanced'|'breadth_first'|'depth_first', weakAreaBias?: 'none'|'moderate'|'strong' }",
  "  pacing: { weekdayMinutes?: number, weekendMinutes?: number, sessionsPerWeek?: number, maxDailyMinutes?: number, intensity?: 'light'|'steady'|'intense', deadlineWeeks?: number }",
  "  sessionComposition: { reviewShare?: number, newShare?: number, drillShare?: number, mockShare?: number, recallShare?: number, warmup?: boolean, mixedSessions?: boolean, maxNewItemsPerSession?: number }",
  "  difficulty: { mode: 'fixed'|'staged'|'adaptive', targetBand?: 'easy'|'medium'|'hard', minBand?: ..., maxBand?: ..., backoffOnStruggle?: boolean, pushOnSuccess?: boolean, stages?: [{ afterSessions, targetBand?, minBand?, maxBand? }] }",
  "  progression: { mode: 'linear'|'mastery_gated'|'breadth_first'|'depth_first'|'spiral', prerequisitesFirst?: boolean }",
  "  review: { scheduler: 'sm5', aggressiveness?: 'light'|'balanced'|'aggressive', dueReviewCap?: number, includeOverdueEverySession?: boolean, interleaveOldAndNew?: boolean }",
  "  adaptation: { onRepeatedFailures?: 'reduce_difficulty'|'increase_review'|'rehab_focus', onCleanStreak?: 'advance_difficulty'|'unlock_next', onOverdueLoad?: 'reduce_new_material'|'review_focus', onSeedPoolLow?: 'allow_generation' }",
  "  cadence: [{ kind: 'every_n_sessions'|'weekday'|'weekend'|'before_deadline', bucket: 'mock'|'drill'|'review'|'recap', everyNSessions?, weekday?, weeksBeforeDeadline? }]",
  "  contentSource: { seedOnly?: boolean, generatedAllowed?: boolean, generatedOnlyAsFallback?: boolean, generatedForDrillsOnly?: boolean, realItemsFirst?: boolean, noGeneratedForAssessment?: boolean }",
  "",
  "Hard rules:",
  "  - Weights must sum to 1.0 when present.",
  "  - Share fields should sum to 1.0 when present.",
  "  - seedOnly and generatedAllowed cannot both be true.",
  "  - progression.mode = 'spiral', cadence.kind = 'before_deadline', and difficulty.mode = 'staged' are not yet supported; reject if the user's intent strictly requires them. For ramp-style goals (\"start easy, move harder\") use difficulty.mode = 'adaptive' with pushOnSuccess=true + backoffOnStruggle=true instead.",
  "",
  "Outcome selection — BE WILLING to push back. Do not force every goal into \"compiled\".",
  "",
  "Pick \"clarify\" when the goal has two or more reasonable policy interpretations and you cannot choose without guessing. Examples:",
  "  - \"keep me on weak stuff\" — ambiguous between scope.weakAreasOnly=true (exclude strong material) and allocation.weakAreaBias='strong' (emphasize but still rotate). Ask which.",
  "  - \"prep for interviews\" — ambiguous between style emphasis, mock cadence, deadline-driven, or a sprint on a subset. Ask what matters.",
  "  - \"moderate difficulty\" — ambiguous between fixed medium, range easy-hard, or adaptive-medium. Ask.",
  "",
  "Pick \"repaired\" when the user's intent is expressible but requires reconciling a tension or filling a gap they did not resolve. Examples:",
  "  - \"push me but don't bury me\" — set backoffOnStruggle=true AND pushOnSuccess=true with an adaptive medium-with-hard-ceiling difficulty. Explain that the contradiction was reconciled.",
  "  - weights that don't sum to 1.0 — normalize and note the repair.",
  "  - unknown skill id that obviously maps to a known one — substitute and note the repair.",
  "",
  "Pick \"reject\" when the user's intent requires capabilities the policy schema cannot express. Examples of unexpressible intents:",
  "  - fatigue-aware or time-of-day-aware adaptation (\"make it easier when I'm tired\", \"harder in the morning\") — no policy field represents user state beyond outcomes.",
  "  - mood-, motivation-, or calendar-integration-based scheduling.",
  "  - arbitrary new scheduler behaviors not in review.scheduler = 'sm5'.",
  "  - learning other domains not in the current catalog.",
  "  - Any policy that strictly requires progression.mode='spiral' or cadence.kind='before_deadline'.",
  "Do NOT invent approximations for unexpressible intents — return reject with an honest reason.",
  "",
  "Default bias: when a goal is genuinely specific and fully expressible, \"compiled\" is correct. Otherwise, prefer clarify/repaired/reject over a silently wrong compile.",
].join("\n");

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

function describeSkillContext(skillIds: string[] | undefined): string {
  if (!skillIds || skillIds.length === 0) return "No pre-selected skills.";
  return `Pre-selected skills (prefer these in scope.includeSkillIds): ${skillIds.join(", ")}.`;
}

function describeDomainCatalog(domain: TrackBenchmarkDomainFixtureV4): string {
  const skills = domain.skills.map((skill) => `${skill.id} (${skill.name}, category=${skill.category})`).join("; ");
  const categories = [...new Set(domain.skills.map((skill) => skill.category))].join(", ");
  return [
    `Valid skill ids for scope.includeSkillIds / excludeSkillIds: ${skills}.`,
    `Valid categories for scope.includeCategories / excludeCategories: ${categories}.`,
    `Supported cadence buckets: ${domain.supportedCadenceBuckets.join(", ")}.`,
    `Domain supports generated content: ${domain.supportsGeneratedContent}. Generated assessment: ${domain.supportsGeneratedAssessment}.`,
    "Use only the ids and categories above verbatim — any unknown value fails validation and produces a reject.",
  ].join("\n");
}

export function buildUserPrompt(input: PolicyPromptInput): string {
  const lines: string[] = [];
  lines.push(`Domain: ${input.domainId}`);
  const catalog = input.domainCatalog ?? TRACK_V4_DOMAIN_FIXTURES[input.domainId];
  lines.push(describeDomainCatalog(catalog));
  lines.push("");
  lines.push(`Goal: ${input.goal}`);
  if (input.name) lines.push(`Name: ${input.name}`);
  lines.push(describeSkillContext(input.skillIds));

  if (input.priorTurns && input.priorTurns.length > 0) {
    lines.push("");
    lines.push("Prior turns (oldest first):");
    for (const turn of input.priorTurns) {
      lines.push(`  [${turn.role}] ${turn.content}`);
    }
    lines.push("Respond to the most recent user turn, considering earlier turns as context.");
  }

  if (input.lastJsonError) {
    lines.push("");
    lines.push(`Previous response failed to parse as JSON: ${input.lastJsonError}`);
    lines.push("Return exactly one JSON object with no surrounding text or code fences.");
  }

  return lines.join("\n");
}
