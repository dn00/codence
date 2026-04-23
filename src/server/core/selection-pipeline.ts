import { eq } from "drizzle-orm";
import { generateVariant, type VariantGeneratorDependencies } from "../ai/variant-generator.js";
import { extractFailurePatterns } from "../ai/failure-patterns.js";
import {
  attempts,
  itemQueue,
  items,
  queue,
  skillConfidence,
  skills,
  type Attempt,
  type Item,
  type ItemQueueRow,
  type QueueRow,
  type Skill,
  type SkillConfidence,
} from "../persistence/schema.js";
import { loadLearnspaceRuntime } from "../learnspaces/runtime.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import { resolveTrackContext } from "../tracks/service.js";
import type {
  DifficultyTarget,
  ResolvedTrackContext,
  SessionPlanV2,
  SessionWorkUnit,
  TrackSpecV2,
} from "../tracks/types.js";
import { getScheduler } from "./schedulers/registry.js";
import type {
  QueueDependencies,
  QueueEmptyResult,
  QueueScopeInput,
  QueueSelection,
  QueueTier,
} from "./selection-types.js";

interface Candidate {
  queueRow: QueueRow;
  skill: Skill;
  confidence: SkillConfidence;
  tier: QueueTier;
  weight: number;
}

interface ItemCandidate {
  itemQueueRow: ItemQueueRow;
  item: Item;
  skill: Skill;
  confidence: SkillConfidence;
  tier: QueueTier;
  weight: number;
}

interface VariantContext {
  deps: QueueDependencies;
  learnspaceId: string;
  learnspaceConfig: LearnspaceConfig;
  generatedForTrackId: string | null;
  skillName: string;
  allItemsForSkill: Item[];
  anyLearnspaceItem: Item | undefined;
  attemptsByItemId: Map<string, number>;
  forceGenerated: boolean;
}

interface ResolvedItemCandidate {
  item: Item;
  generated: boolean;
  generatedFromArtifactId: string | null;
}

const QUEUE_EMPTY_RESULT: QueueEmptyResult = {
  type: "empty",
  code: "queue_empty",
  message: "No valid queue candidate could be resolved",
};

const DIFFICULTY_RANK: Record<QueueSelection["item"]["difficulty"], number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

function getWeight(config: LearnspaceConfig, activeTag: string | null, skillId: string): number {
  if (!activeTag) {
    return 1;
  }

  return config.tag_weights[activeTag]?.[skillId] ?? 1;
}

function compareCandidates(left: Candidate, right: Candidate): number {
  if (left.queueRow.skipCount >= 3 && right.queueRow.skipCount < 3) {
    return 1;
  }
  if (left.queueRow.skipCount < 3 && right.queueRow.skipCount >= 3) {
    return -1;
  }

  const tierOrder: Record<QueueTier, number> = {
    overdue: 0,
    due_today: 1,
    weak: 2,
    new: 3,
  };
  const tierDifference = tierOrder[left.tier] - tierOrder[right.tier];
  if (tierDifference !== 0) {
    return tierDifference;
  }

  const skipDifference = left.queueRow.skipCount - right.queueRow.skipCount;
  if (skipDifference !== 0) {
    return skipDifference;
  }

  if (left.tier === "overdue" || left.tier === "due_today") {
    const leftDue = left.queueRow.dueDate ?? "";
    const rightDue = right.queueRow.dueDate ?? "";
    if (leftDue !== rightDue) {
      return leftDue.localeCompare(rightDue);
    }
  }

  if (left.weight !== right.weight) {
    return right.weight - left.weight;
  }

  return left.skill.id.localeCompare(right.skill.id);
}

const BAND_BY_RANK: Record<number, QueueSelection["item"]["difficulty"]> = {
  0: "easy",
  1: "medium",
  2: "hard",
};

/**
 * Target difficulty for the next item. Honors the track's DifficultyPolicy:
 *   - fixed:    always the pinned band
 *   - range:    confidence-mapped band clamped to [minBand, maxBand]
 *   - adaptive: confidence-mapped (legacy behavior)
 * When no target is supplied (system tracks without a policy), fall back to
 * the legacy confidence curve so existing fixtures keep working.
 */
export function resolveTargetDifficulty(
  confidence: SkillConfidence,
  target: DifficultyTarget | null,
): QueueSelection["item"]["difficulty"] {
  const legacy = (() => {
    if (confidence.score < 4) return "easy" as const;
    if (confidence.score > 7) return "hard" as const;
    return "medium" as const;
  })();

  if (!target) return legacy;

  if (target.mode === "fixed" && target.targetBand) {
    return target.targetBand as QueueSelection["item"]["difficulty"];
  }

  if (target.mode === "range") {
    const minRank = target.minBand ? DIFFICULTY_RANK[target.minBand as keyof typeof DIFFICULTY_RANK] : 0;
    const maxRank = target.maxBand ? DIFFICULTY_RANK[target.maxBand as keyof typeof DIFFICULTY_RANK] : 2;
    const legacyRank = DIFFICULTY_RANK[legacy];
    const clamped = Math.max(minRank, Math.min(maxRank, legacyRank));
    return BAND_BY_RANK[clamped];
  }

  return legacy;
}

/**
 * Bands the track allows us to serve, or null when difficulty is adaptive /
 * unconstrained. Used as a hard filter before sort — preview and execution
 * must agree on what the track will surface.
 */
export function resolveAllowedDifficulties(spec: TrackSpecV2 | null | undefined): Set<string> | null {
  const target = spec?.difficultyPolicy?.defaultTarget ?? null;
  return resolveAllowedDifficultiesForTarget(target);
}

export function resolveAllowedDifficultiesForTarget(target: DifficultyTarget | null): Set<string> | null {
  if (!target || target.mode === "adaptive") return null;
  if (target.mode === "fixed") {
    return target.targetBand ? new Set([target.targetBand]) : null;
  }
  const minRank = target.minBand ? DIFFICULTY_RANK[target.minBand as keyof typeof DIFFICULTY_RANK] : undefined;
  const maxRank = target.maxBand ? DIFFICULTY_RANK[target.maxBand as keyof typeof DIFFICULTY_RANK] : undefined;
  if (minRank === undefined && maxRank === undefined) return null;
  const allowed = new Set<string>();
  for (const [band, rank] of Object.entries(DIFFICULTY_RANK)) {
    if ((minRank === undefined || rank >= minRank) && (maxRank === undefined || rank <= maxRank)) {
      allowed.add(band);
    }
  }
  return allowed.size > 0 ? allowed : null;
}

export function resolveEffectiveDifficultyTarget(
  trackContext: ResolvedTrackContext,
  plan?: SessionPlanV2,
): DifficultyTarget | null {
  return getPrimaryWorkUnit(plan)?.difficultyTarget
    ?? trackContext.track.spec?.difficultyPolicy?.defaultTarget
    ?? null;
}

function findPrimarySkillId(item: Item): string | undefined {
  return item.skillIds?.[0];
}

function sortItemsByDifficulty(
  itemsBySkill: Item[],
  skillId: string,
  targetRank: number,
  attemptsByItemId: Map<string, number>,
): Item[] {
  return [...itemsBySkill]
    .sort((left, right) => {
      const leftDistance = Math.abs(DIFFICULTY_RANK[left.difficulty as keyof typeof DIFFICULTY_RANK] - targetRank);
      const rightDistance = Math.abs(DIFFICULTY_RANK[right.difficulty as keyof typeof DIFFICULTY_RANK] - targetRank);
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      const leftRank = DIFFICULTY_RANK[left.difficulty as keyof typeof DIFFICULTY_RANK];
      const rightRank = DIFFICULTY_RANK[right.difficulty as keyof typeof DIFFICULTY_RANK];
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const leftAttempts = attemptsByItemId.get(left.id) ?? 0;
      const rightAttempts = attemptsByItemId.get(right.id) ?? 0;
      if (leftAttempts !== rightAttempts) {
        return leftAttempts - rightAttempts;
      }

      return left.id.localeCompare(right.id);
    })
    .filter((item) => (item.skillIds ?? []).includes(skillId));
}

async function resolveItemForSkill(
  skillId: string,
  confidence: SkillConfidence,
  itemsBySkill: Item[],
  attemptsByItemId: Map<string, number>,
  variantCtx?: VariantContext,
  allowGeneratedProblems = true,
  forceGenerated = false,
  difficultyTarget: DifficultyTarget | null = null,
): Promise<ResolvedItemCandidate | undefined> {
  const target = resolveTargetDifficulty(confidence, difficultyTarget);
  const targetRank = DIFFICULTY_RANK[target];

  if (!forceGenerated) {
    const eligibleItems = allowGeneratedProblems
      ? itemsBySkill
      : itemsBySkill.filter((item) => item.source !== "generated");
    const sorted = sortItemsByDifficulty(eligibleItems, skillId, targetRank, attemptsByItemId);
    if (sorted.length > 0) {
      return {
        item: sorted[0],
        generated: sorted[0].source === "generated",
        generatedFromArtifactId: sorted[0].parentItemId ?? null,
      };
    }
  }

  if (
    !allowGeneratedProblems ||
    !variantCtx ||
    !variantCtx.deps.completionLLM ||
    !variantCtx.deps.executionAdapter
  ) {
    return undefined;
  }

  const existingVariants = variantCtx.allItemsForSkill
    .filter((item) => item.source === "generated" && !attemptsByItemId.has(item.id));
  if (existingVariants.length > 0) {
    const variantSorted = sortItemsByDifficulty(existingVariants, skillId, targetRank, attemptsByItemId);
    if (variantSorted.length > 0) {
      return {
        item: variantSorted[0],
        generated: true,
        generatedFromArtifactId: variantSorted[0].parentItemId ?? null,
      };
    }
  }

  const parentItem = variantCtx.allItemsForSkill[0] ?? variantCtx.anyLearnspaceItem;
  if (!parentItem) {
    return undefined;
  }

  let targetMistakes: string[] = [];
  try {
    const patterns = extractFailurePatterns(
      variantCtx.deps.db,
      skillId,
      variantCtx.learnspaceId,
    );
    targetMistakes = patterns.slice(0, 3).map((p) => p.type);
  } catch {
    // Continue without targeting.
  }

  const variantDeps: VariantGeneratorDependencies = {
    completionLLM: variantCtx.deps.completionLLM,
    executionAdapter: variantCtx.deps.executionAdapter,
    db: variantCtx.deps.db,
    now: variantCtx.deps.now,
  };

  // Selection currently only knows how to fall back to protocol_solve /
  // code_problem variant generation. Keep this boundary narrow: when
  // multiple archetypes become real, introduce an archetype-aware
  // dispatcher instead of widening this implementation in place.
  const result = await generateVariant(variantDeps, {
    parentItem,
    skillId,
    skillName: variantCtx.skillName,
    difficulty: target,
    learnspaceConfig: variantCtx.learnspaceConfig,
    learnspaceId: variantCtx.learnspaceId,
    generatedForTrackId: variantCtx.generatedForTrackId,
    targetMistakes: targetMistakes.length > 0 ? targetMistakes : undefined,
  });

  if (!result?.item) {
    return undefined;
  }

  return {
    item: result.item,
    generated: true,
    generatedFromArtifactId: parentItem.id,
  };
}

function getRecentPrimarySkillId(recentAttempts: Attempt[], itemsById: Map<string, Item>): string | null {
  const recent = [...recentAttempts].sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
  if (!recent) {
    return null;
  }

  return findPrimarySkillId(itemsById.get(recent.itemId) ?? ({} as Item)) ?? null;
}

function computeAvgDurationBySkill(
  attemptRows: Attempt[],
  itemsById: Map<string, Item>,
): Map<string, number> {
  const durationsBySkill = new Map<string, number[]>();

  for (const attempt of attemptRows) {
    if (!attempt.completedAt) continue;
    const item = itemsById.get(attempt.itemId);
    const primarySkillId = item?.skillIds?.[0];
    if (!primarySkillId) continue;
    const durationMs = new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime();
    if (durationMs <= 0) continue;
    const existing = durationsBySkill.get(primarySkillId) ?? [];
    existing.push(durationMs);
    durationsBySkill.set(primarySkillId, existing);
  }

  const avgBySkill = new Map<string, number>();
  for (const [skillId, durations] of durationsBySkill) {
    const recent = durations.slice(-5);
    const avg = recent.reduce((sum, d) => sum + d, 0) / recent.length;
    avgBySkill.set(skillId, avg);
  }
  return avgBySkill;
}

/**
 * Resolves the track's scope policy against the live skills table so category
 * refs (and their weights) feed selection the same way the queue preview
 * already does. Returns an `inScope` predicate and a `weightFor` lookup so
 * callers can short-circuit early and bias sort.
 *
 * `weightFor` multiplies into the candidate weight alongside tag weights —
 * a 70/30 policy reads as a 70/30 bias in the candidate ordering rather than
 * collapsing to unweighted.
 */
interface ScopeResolution {
  inScope: (skillId: string) => boolean;
  weightFor: (skillId: string) => number;
}

export function resolveSkillScope(
  trackContext: ResolvedTrackContext,
  skillRows: Skill[],
): ScopeResolution {
  const policy = trackContext.track.spec?.scopePolicy;
  const refs = policy?.refs ?? [];
  const weights = policy?.weights ?? null;
  const skillById = new Map(skillRows.map((skill) => [skill.id, skill]));
  const excludedSkillIds = new Set<string>();
  const excludedCategories = new Set<string>();

  for (const constraint of trackContext.track.spec?.constraints ?? []) {
    if (constraint.kind !== "exclude_scope") continue;
    const scopeRefs = Array.isArray(constraint.params?.scopeRefs)
      ? constraint.params.scopeRefs as Array<Record<string, unknown>>
      : [];
    for (const ref of scopeRefs) {
      if (ref.dimension === "skill" && typeof ref.value === "string") {
        excludedSkillIds.add(ref.value);
      }
      if (ref.dimension === "category" && typeof ref.value === "string") {
        excludedCategories.add(ref.value);
      }
    }
  }

  // learnspace-wide ref ("dimension: learnspace") or no refs → unconstrained.
  const hasNarrowingRef = refs.some(
    (ref) => ref.dimension === "skill" || ref.dimension === "category",
  );
  if (!hasNarrowingRef) {
    return {
      inScope: (skillId) => {
        if (excludedSkillIds.has(skillId)) return false;
        const skill = skillById.get(skillId);
        const skillCategory = skill?.categoryId ?? skill?.category;
        return !(skillCategory && excludedCategories.has(skillCategory));
      },
      weightFor: () => 1,
    };
  }

  const allowedSkillIds = new Set<string>();
  // skillId → ref.value that matched (used for weight lookup). First match wins
  // if a skill appears via both a direct ref and a category ref.
  const weightKeyBySkillId = new Map<string, string>();

  for (const ref of refs) {
    if (ref.dimension === "skill") {
      allowedSkillIds.add(ref.value);
      if (!weightKeyBySkillId.has(ref.value)) weightKeyBySkillId.set(ref.value, ref.value);
    } else if (ref.dimension === "category") {
      for (const skill of skillRows) {
        const skillCategory = skill.categoryId ?? skill.category;
        if (skillCategory === ref.value) {
          allowedSkillIds.add(skill.id);
          if (!weightKeyBySkillId.has(skill.id)) weightKeyBySkillId.set(skill.id, ref.value);
        }
      }
    }
  }

  return {
    inScope: (skillId) => {
      if (!allowedSkillIds.has(skillId)) return false;
      if (excludedSkillIds.has(skillId)) return false;
      const skill = skillById.get(skillId);
      const skillCategory = skill?.categoryId ?? skill?.category;
      return !(skillCategory && excludedCategories.has(skillCategory));
    },
    weightFor: (skillId) => {
      if (!weights) return 1;
      const key = weightKeyBySkillId.get(skillId);
      if (!key) return 1;
      return weights[key] ?? 1;
    },
  };
}

/**
 * Seed-pool-exhausted check, per skill. A seed is "available" for a skill
 * when at least one non-generated, non-retired item for that skill has no
 * completed attempt. Used to gate `GenerationPolicy.onlyWhenSeedPoolExhausted`
 * in live selection — bench runtime already enforces this; production was
 * collapsing it to a single boolean.
 */
export function buildSeedPoolAvailabilityMap(
  itemRows: Item[],
  attemptsByItemId: Map<string, number>,
): Map<string, boolean> {
  const availability = new Map<string, boolean>();
  for (const item of itemRows) {
    if (item.source === "generated") continue;
    if ((attemptsByItemId.get(item.id) ?? 0) > 0) continue;
    for (const skillId of item.skillIds ?? []) {
      availability.set(skillId, true);
    }
  }
  return availability;
}

function getPrimaryWorkUnit(plan?: SessionPlanV2): SessionWorkUnit | null {
  if (!plan) return null;
  return plan.recipe.workUnits.find((unit) => unit.role === "primary") ?? plan.recipe.workUnits[0] ?? null;
}

function isSkillAllowedByPlan(
  skillId: string,
  plan?: SessionPlanV2,
): boolean {
  const workUnit = getPrimaryWorkUnit(plan);
  if (!workUnit) return true;
  const skillRefs = workUnit.candidateScope.refs.filter((ref) => ref.dimension === "skill");
  if (skillRefs.length === 0) return true;
  return skillRefs.some((ref) => ref.value === skillId);
}

/**
 * Per-skill generation gate. Respects `onlyWhenSeedPoolExhausted`: generated
 * items may surface for a skill only when (a) the policy allows generation
 * and (b) no unattempted seed items remain for that skill — or the policy
 * opts out of the exhaustion gate.
 */
export function isGenerationAllowedForSkill(
  trackContext: ResolvedTrackContext,
  skillId: string,
  seedPoolAvailable: Map<string, boolean>,
): boolean {
  const policy = trackContext.track.spec?.generationPolicy;
  if (!policy?.allowGeneration) return false;
  if (policy.onlyWhenSeedPoolExhausted && seedPoolAvailable.get(skillId) === true) {
    return false;
  }
  return true;
}

/**
 * Scope-free fallback used when we cannot resolve a skill (e.g., direct item
 * lookup with missing skillIds). Treats the policy as opt-in at the global
 * level without the seed-pool gate — rare path, kept for safety.
 */
function isAnyGenerationAllowed(trackContext: ResolvedTrackContext): boolean {
  return trackContext.track.spec?.generationPolicy.allowGeneration ?? false;
}

function resolveQueueStrategy(trackContext: ResolvedTrackContext, plan?: SessionPlanV2): "scheduler" | "new_only" | "weakest_first" | "hardest_first" | "foundations" {
  const workUnit = getPrimaryWorkUnit(plan);
  const strategy = workUnit?.selectionConstraints.find((constraint) => constraint.kind === "queue_strategy");
  const emphasis = strategy?.params?.emphasis;
  if (
    emphasis === "scheduler" ||
    emphasis === "new_only" ||
    emphasis === "weakest_first" ||
    emphasis === "hardest_first" ||
    emphasis === "foundations"
  ) {
    return emphasis;
  }
  switch (trackContext.track.spec?.archetype) {
    case "curriculum_progression":
    case "topic_sprint":
      return "new_only";
    case "weakness_rehab":
      return "weakest_first";
    case "foundations_rebuild":
      return "foundations";
    default:
      return "scheduler";
  }
}

function describeTier(tier: QueueTier): string {
  return tier.replace("_", " ");
}

function describeTrackEmphasis(
  trackContext: ResolvedTrackContext,
  plan?: SessionPlanV2,
): string {
  switch (resolveQueueStrategy(trackContext, plan)) {
    case "new_only":
      return "new material";
    case "weakest_first":
      return "weakest skills first";
    case "hardest_first":
      return "stronger skills and harder work";
    case "foundations":
      return "familiar patterns with easier problems first";
    case "scheduler":
    default:
      return "scheduler urgency";
  }
}

function buildSelectionReason(input: {
  schedulerId: ReturnType<typeof getScheduler>["id"];
  tier: QueueTier;
  trackContext: ResolvedTrackContext;
  sessionPlan?: SessionPlanV2;
  generationAllowed: boolean;
  generated: boolean;
  generatedFromArtifactId?: string | null;
  source: "item_queue" | "skill_queue" | "direct_item";
  reasons: string[];
}): QueueSelection["selectionReason"] {
  return {
    schedulerIds: [input.schedulerId],
    candidateTier: input.tier,
    trackId: input.trackContext.track.id,
    trackSnapshot: input.trackContext.track,
    sessionPlanSummary: input.sessionPlan
      ? {
          nodeId: input.sessionPlan.nodeId,
          sessionType: input.sessionPlan.sessionType,
          objective: input.sessionPlan.objective,
        }
      : null,
    rerankedByLLM: false,
    generated: input.generated,
    generatedFromArtifactId: input.generatedFromArtifactId ?? null,
    generationAllowed: input.generationAllowed,
    selectionSource: input.source,
    reasons: input.reasons,
  };
}

function applyQueueStrategyPolicy(
  candidates: Candidate[],
  strategy: "scheduler" | "new_only" | "weakest_first" | "hardest_first" | "foundations",
  _avgDurationBySkill: Map<string, number>,
  skillProgression?: string[],
): Candidate[] {
  switch (strategy) {
    case "weakest_first": {
      const practiced = candidates.filter((c) => c.confidence.totalAttempts > 0);
      const pool = practiced.length > 0 ? practiced : candidates;
      return [...pool].sort((a, b) => {
        if (a.confidence.score !== b.confidence.score) return a.confidence.score - b.confidence.score;
        if (a.confidence.failedAttempts !== b.confidence.failedAttempts) return b.confidence.failedAttempts - a.confidence.failedAttempts;
        return b.weight - a.weight;
      });
    }

    case "foundations": {
      // Returning-user warm-up: prefer previously-attempted skills where the
      // user already has some mastery, strongest first, so early problems feel
      // like a refresh rather than a wall of cold starts.
      const practiced = candidates.filter((c) => c.confidence.totalAttempts > 0);
      const pool = practiced.length > 0 ? practiced : candidates;
      return [...pool].sort((a, b) => {
        if (a.confidence.score !== b.confidence.score) return b.confidence.score - a.confidence.score;
        return b.weight - a.weight;
      });
    }

    case "new_only": {
      const newSkills = candidates.filter((c) => c.tier === "new");
      if (newSkills.length === 0) return candidates;
      if (skillProgression && skillProgression.length > 0) {
        const orderMap = new Map(skillProgression.map((id, idx) => [id, idx]));
        return [...newSkills].sort((a, b) => {
          const aOrder = orderMap.get(a.skill.id) ?? skillProgression.length;
          const bOrder = orderMap.get(b.skill.id) ?? skillProgression.length;
          return aOrder - bOrder;
        });
      }
      return newSkills;
    }

    case "hardest_first": {
      return [...candidates].sort((a, b) => {
        if (a.confidence.score !== b.confidence.score) return b.confidence.score - a.confidence.score;
        return b.weight - a.weight;
      });
    }

    case "scheduler":
    default:
      return candidates;
  }
}

function compareItemCandidates(left: ItemCandidate, right: ItemCandidate): number {
  if (left.itemQueueRow.skipCount >= 3 && right.itemQueueRow.skipCount < 3) return 1;
  if (left.itemQueueRow.skipCount < 3 && right.itemQueueRow.skipCount >= 3) return -1;

  const tierOrder: Record<QueueTier, number> = { overdue: 0, due_today: 1, weak: 2, new: 3 };
  const tierDiff = tierOrder[left.tier] - tierOrder[right.tier];
  if (tierDiff !== 0) return tierDiff;

  const skipDiff = left.itemQueueRow.skipCount - right.itemQueueRow.skipCount;
  if (skipDiff !== 0) return skipDiff;

  if (left.tier === "overdue" || left.tier === "due_today") {
    const leftDue = left.itemQueueRow.dueDate ?? "";
    const rightDue = right.itemQueueRow.dueDate ?? "";
    if (leftDue !== rightDue) return leftDue.localeCompare(rightDue);
  }

  if (left.weight !== right.weight) return right.weight - left.weight;

  return left.item.id.localeCompare(right.item.id);
}

function applyItemStrategyPolicy(
  candidates: ItemCandidate[],
  strategy: "scheduler" | "new_only" | "weakest_first" | "hardest_first" | "foundations",
  skillProgression?: string[],
): ItemCandidate[] {
  const tierOrder: Record<QueueTier, number> = { overdue: 0, due_today: 1, weak: 2, new: 3 };

  switch (strategy) {
    case "weakest_first": {
      const practiced = candidates.filter((c) => c.confidence.totalAttempts > 0);
      const pool = practiced.length > 0 ? practiced : candidates;
      return [...pool].sort((a, b) => {
        if (a.confidence.score !== b.confidence.score) return a.confidence.score - b.confidence.score;
        const aDiff = DIFFICULTY_RANK[(a.item.difficulty as keyof typeof DIFFICULTY_RANK)] ?? 1;
        const bDiff = DIFFICULTY_RANK[(b.item.difficulty as keyof typeof DIFFICULTY_RANK)] ?? 1;
        if (aDiff !== bDiff) return aDiff - bDiff;
        return a.item.id.localeCompare(b.item.id);
      });
    }

    case "foundations": {
      // Item-level: strongest skills first, easier items first, skip unseen
      // content so the warm-up session is pure refresher.
      const practiced = candidates.filter((c) => c.confidence.totalAttempts > 0 && c.tier !== "new");
      const pool = practiced.length > 0 ? practiced : candidates;
      return [...pool].sort((a, b) => {
        if (a.confidence.score !== b.confidence.score) return b.confidence.score - a.confidence.score;
        const aDiff = DIFFICULTY_RANK[(a.item.difficulty as keyof typeof DIFFICULTY_RANK)] ?? 1;
        const bDiff = DIFFICULTY_RANK[(b.item.difficulty as keyof typeof DIFFICULTY_RANK)] ?? 1;
        if (aDiff !== bDiff) return aDiff - bDiff;
        return a.item.id.localeCompare(b.item.id);
      });
    }

    case "new_only": {
      const newItems = candidates.filter((c) => c.tier === "new");
      if (newItems.length === 0) return candidates;
      const orderMap = skillProgression && skillProgression.length > 0
        ? new Map(skillProgression.map((id, idx) => [id, idx]))
        : null;
      return [...newItems].sort((a, b) => {
        const aDiff = DIFFICULTY_RANK[(a.item.difficulty as keyof typeof DIFFICULTY_RANK)] ?? 1;
        const bDiff = DIFFICULTY_RANK[(b.item.difficulty as keyof typeof DIFFICULTY_RANK)] ?? 1;
        if (aDiff !== bDiff) return aDiff - bDiff;
        if (orderMap) {
          const aOrder = orderMap.get(a.skill.id) ?? skillProgression!.length;
          const bOrder = orderMap.get(b.skill.id) ?? skillProgression!.length;
          if (aOrder !== bOrder) return aOrder - bOrder;
        }
        return a.item.id.localeCompare(b.item.id);
      });
    }

    case "hardest_first": {
      return [...candidates].sort((a, b) => {
        const aDiff = DIFFICULTY_RANK[(a.item.difficulty as keyof typeof DIFFICULTY_RANK)] ?? 1;
        const bDiff = DIFFICULTY_RANK[(b.item.difficulty as keyof typeof DIFFICULTY_RANK)] ?? 1;
        if (aDiff !== bDiff) return bDiff - aDiff;
        if (a.confidence.score !== b.confidence.score) return b.confidence.score - a.confidence.score;
        return a.item.id.localeCompare(b.item.id);
      });
    }

    case "scheduler":
    default:
      return [...candidates].sort((a, b) => {
        const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
        if (tierDiff !== 0) return tierDiff;
        const aDiff = DIFFICULTY_RANK[(a.item.difficulty as keyof typeof DIFFICULTY_RANK)] ?? 1;
        const bDiff = DIFFICULTY_RANK[(b.item.difficulty as keyof typeof DIFFICULTY_RANK)] ?? 1;
        if (aDiff !== bDiff) return aDiff - bDiff;
        return a.item.id.localeCompare(b.item.id);
      });
  }
}

function resolveSelectionFromItemQueue(
  deps: QueueDependencies,
  scope: QueueScopeInput,
): QueueSelection | QueueEmptyResult | null {
  const { db, now } = deps;
  const { userId, learnspaceId, trackId, targetSkillId, targetItemId, forceGenerated, sessionPlan } = scope;

  if (targetItemId || forceGenerated) return null;

  const runtime = loadLearnspaceRuntime(db, learnspaceId);
  const scheduler = getScheduler(runtime.schedulerId);
  const trackContext = resolveTrackContext(db, { userId, learnspaceId, trackId });
  const strategy = resolveQueueStrategy(trackContext, sessionPlan);
  const effectiveDifficultyTarget = resolveEffectiveDifficultyTarget(trackContext, sessionPlan);

  const itemQueueRows = db.select().from(itemQueue).all()
    .filter((row) => row.learnspaceId === learnspaceId && row.userId === userId);

  if (itemQueueRows.length === 0) return null;

  const itemRows = db.select().from(items).all()
    .filter((item) => item.learnspaceId === learnspaceId && item.status !== "retired");
  const skillRows = db.select().from(skills).all().filter((skill) => skill.learnspaceId === learnspaceId);
  const confidenceRows = db.select().from(skillConfidence).all()
    .filter((row) => row.learnspaceId === learnspaceId && row.userId === userId);

  const itemById = new Map(itemRows.map((item) => [item.id, item]));
  const skillById = new Map(skillRows.map((skill) => [skill.id, skill]));
  const confidenceBySkillId = new Map(confidenceRows.map((row) => [row.skillId, row]));

  const attemptRows = db.select().from(attempts).all()
    .filter((a) => a.learnspaceId === learnspaceId && a.userId === userId && a.completedAt !== null);
  const attemptsByItemId = new Map<string, number>();
  for (const attempt of attemptRows) {
    attemptsByItemId.set(attempt.itemId, (attemptsByItemId.get(attempt.itemId) ?? 0) + 1);
  }

  const recentAttempts = [...attemptRows]
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const lastPracticedItemId = recentAttempts[0]?.itemId ?? null;
  const lastPracticedSkillId = lastPracticedItemId
    ? (itemById.get(lastPracticedItemId)?.skillIds?.[0] ?? null)
    : null;

  const skillScope = resolveSkillScope(trackContext, skillRows);
  const allowedDifficulties = resolveAllowedDifficultiesForTarget(effectiveDifficultyTarget);
  const seedPoolAvailable = buildSeedPoolAvailabilityMap(itemRows, attemptsByItemId);

  const candidates: ItemCandidate[] = [];

  for (const row of itemQueueRows) {
    const item = itemById.get(row.itemId);
    if (!item) continue;
    if (!skillScope.inScope(row.skillId) || !isSkillAllowedByPlan(row.skillId, sessionPlan)) continue;
    // Difficulty filter honors spec.difficultyPolicy.defaultTarget so preview
    // and execution surface the same band. Adaptive returns null → no filter.
    if (allowedDifficulties && !allowedDifficulties.has(item.difficulty)) continue;
    if (item.source === "generated" && !isGenerationAllowedForSkill(trackContext, row.skillId, seedPoolAvailable)) {
      continue;
    }

    const skill = skillById.get(row.skillId);
    if (!skill) continue;

    const confidence = confidenceBySkillId.get(row.skillId);
    if (!confidence) continue;

    const tier = scheduler.resolveItemTier({
      now: now(),
      itemQueueRow: row,
      confidence,
    });
    if (!tier) continue;

    candidates.push({
      itemQueueRow: row,
      item,
      skill,
      confidence,
      tier,
      // ScopePolicy.weights multiply into tag-based weight so a 70/30 weighted
      // subset actually surfaces 70/30 in the sort.
      weight: getWeight(runtime.config, runtime.learnspace.activeTag, row.skillId)
        * skillScope.weightFor(row.skillId),
    });
  }

  if (candidates.length === 0) return QUEUE_EMPTY_RESULT;

  candidates.sort(compareItemCandidates);

  let modeCandidates = applyItemStrategyPolicy(candidates, strategy, runtime.config.skill_progression);

  if (targetSkillId) {
    modeCandidates = modeCandidates.filter((c) => c.skill.id === targetSkillId);
    if (modeCandidates.length === 0) {
      modeCandidates = candidates.filter((c) => c.skill.id === targetSkillId);
    }
  }

  if (modeCandidates.length === 0) {
    if (targetSkillId) {
      return { type: "empty", code: "queue_empty", message: `No items available for skill ${targetSkillId}` };
    }
    return QUEUE_EMPTY_RESULT;
  }

  let selected = modeCandidates[0];
  if (
    lastPracticedSkillId &&
    selected.skill.id === lastPracticedSkillId &&
    selected.confidence.score >= runtime.config.interleaving_confidence_threshold
  ) {
    const alternate = modeCandidates.find((c) => c.skill.id !== lastPracticedSkillId);
    if (alternate) selected = alternate;
  }

  return {
    queueId: selected.itemQueueRow.id,
    skillId: selected.skill.id,
    skillName: selected.skill.name,
    tier: selected.tier,
    dueDate: selected.itemQueueRow.dueDate,
    confidenceScore: selected.confidence.score,
    trackId: trackContext.track.id,
    selectionReason: buildSelectionReason({
      schedulerId: runtime.schedulerId,
      tier: selected.tier,
      trackContext,
      sessionPlan,
      generationAllowed: isGenerationAllowedForSkill(trackContext, selected.skill.id, seedPoolAvailable),
      generated: selected.item.source === "generated",
      generatedFromArtifactId: selected.item.parentItemId ?? null,
      source: "item_queue",
      reasons: [
        `${selected.skill.name} is ${describeTier(selected.tier)} in ${runtime.schedulerId}.`,
        `Track "${trackContext.track.name}" currently emphasizes ${describeTrackEmphasis(trackContext, sessionPlan)}.`,
      ],
    }),
    item: {
      id: selected.item.id,
      title: selected.item.title,
      difficulty: selected.item.difficulty as QueueSelection["item"]["difficulty"],
      skillIds: selected.item.skillIds ?? [],
      tags: selected.item.tags ?? [],
      source: selected.item.source,
      status: selected.item.status,
      content: selected.item.content ?? {},
    },
  };
}

export async function resolveNextSelection(
  deps: QueueDependencies,
  scope: QueueScopeInput,
): Promise<QueueSelection | QueueEmptyResult> {
  const { db, now } = deps;
  const { userId, learnspaceId, trackId, targetSkillId, targetItemId, forceGenerated, sessionPlan } = scope;

  const itemLevelResult = resolveSelectionFromItemQueue(deps, scope);
  if (itemLevelResult !== null) return itemLevelResult;

  const runtime = loadLearnspaceRuntime(db, learnspaceId);
  const scheduler = getScheduler(runtime.schedulerId);
  const trackContext = resolveTrackContext(db, { userId, learnspaceId, trackId });
  const strategy = resolveQueueStrategy(trackContext, sessionPlan);

  // Preload scope-shaping data so targetItemId and the main selection loop
  // share the same per-skill scope / generation / difficulty rules.
  const skillRowsForScope = db.select().from(skills).all()
    .filter((skill) => skill.learnspaceId === learnspaceId);
  const itemRowsForScope = db.select().from(items).all()
    .filter((item) => item.learnspaceId === learnspaceId && item.status !== "retired");
  const attemptsForScope = db.select().from(attempts).all()
    .filter((a) => a.learnspaceId === learnspaceId && a.userId === userId && a.completedAt !== null);
  const attemptsByItemIdScope = new Map<string, number>();
  for (const attempt of attemptsForScope) {
    attemptsByItemIdScope.set(attempt.itemId, (attemptsByItemIdScope.get(attempt.itemId) ?? 0) + 1);
  }
  const skillScope = resolveSkillScope(trackContext, skillRowsForScope);
  const seedPoolAvailable = buildSeedPoolAvailabilityMap(itemRowsForScope, attemptsByItemIdScope);
  const difficultyTarget = resolveEffectiveDifficultyTarget(trackContext, sessionPlan);
  const allowedDifficulties = resolveAllowedDifficultiesForTarget(difficultyTarget);

  if (targetItemId) {
    const item = db.select().from(items).where(eq(items.id, targetItemId)).get();
    if (!item || item.learnspaceId !== learnspaceId) {
      return { type: "empty", code: "queue_empty", message: `Item ${targetItemId} not found` };
    }
    if (item.status === "retired") {
      return { type: "empty", code: "queue_empty", message: `Item ${targetItemId} is not available` };
    }
    const primarySkillId = (item.skillIds ?? [])[0];
    if (primarySkillId && !skillScope.inScope(primarySkillId)) {
      return { type: "empty", code: "queue_empty", message: `Item ${targetItemId} is outside the active track scope` };
    }
    if (item.source === "generated" && primarySkillId
        && !isGenerationAllowedForSkill(trackContext, primarySkillId, seedPoolAvailable)) {
      return { type: "empty", code: "queue_empty", message: `Generated item ${targetItemId} is not allowed for the active track` };
    }
    if (allowedDifficulties && !allowedDifficulties.has(item.difficulty)) {
      return { type: "empty", code: "queue_empty", message: `Item ${targetItemId} is outside the active track difficulty target` };
    }
    const directGenerationAllowed = primarySkillId
      ? isGenerationAllowedForSkill(trackContext, primarySkillId, seedPoolAvailable)
      : isAnyGenerationAllowed(trackContext);
    const skill = primarySkillId ? db.select().from(skills).where(eq(skills.id, primarySkillId)).get() : null;
    const queueRow = db.select().from(queue).all().find(
      (row) => row.skillId === primarySkillId && row.userId === userId && row.learnspaceId === learnspaceId,
    );
    const confidence = db.select().from(skillConfidence).all().find(
      (row) => row.skillId === primarySkillId && row.userId === userId && row.learnspaceId === learnspaceId,
    );
    return {
      queueId: queueRow?.id ?? "direct",
      skillId: primarySkillId ?? "unknown",
      skillName: skill?.name ?? primarySkillId ?? "Unknown",
      tier: "due_today",
      dueDate: queueRow?.dueDate ?? null,
      confidenceScore: confidence?.score ?? 0,
      trackId: trackContext.track.id,
      selectionReason: buildSelectionReason({
        schedulerId: runtime.schedulerId,
        tier: "due_today",
        trackContext,
        sessionPlan,
        generationAllowed: directGenerationAllowed,
        generated: item.source === "generated",
        generatedFromArtifactId: item.parentItemId ?? null,
        source: "direct_item",
        reasons: [
          `Artifact ${item.title} was explicitly requested.`,
          `Track "${trackContext.track.name}" remains attached for explainability, but direct item selection bypassed normal queue prioritization.`,
        ],
      }),
      item: {
        id: item.id,
        title: item.title,
        difficulty: item.difficulty as QueueSelection["item"]["difficulty"],
        skillIds: item.skillIds ?? [],
        tags: item.tags ?? [],
        source: item.source,
        status: item.status,
        content: item.content ?? {},
      },
    };
  }

  const queueRows = db.select().from(queue).all().filter((row) => row.learnspaceId === learnspaceId && row.userId === userId);
  const confidenceRows = db
    .select()
    .from(skillConfidence)
    .all()
    .filter((row) => row.learnspaceId === learnspaceId && row.userId === userId);
  const attemptRows = attemptsForScope;
  const itemRows = itemRowsForScope;
  const skillById = new Map(skillRowsForScope.map((skill) => [skill.id, skill]));
  const confidenceBySkillId = new Map(confidenceRows.map((row) => [row.skillId, row]));
  const itemsById = new Map(itemRows.map((item) => [item.id, item]));
  const attemptsByItemId = attemptsByItemIdScope;

  const candidates = queueRows
    .map((queueRow) => {
      if (!skillScope.inScope(queueRow.skillId) || !isSkillAllowedByPlan(queueRow.skillId, sessionPlan)) {
        return null;
      }
      const skill = skillById.get(queueRow.skillId);
      const confidence = confidenceBySkillId.get(queueRow.skillId);
      if (!skill || !confidence) {
        return null;
      }

      const tier = scheduler.resolveSkillTier({
        now: now(),
        queueRow,
        confidence,
      });
      if (!tier) {
        return null;
      }

      return {
        queueRow,
        skill,
        confidence,
        tier,
        // ScopePolicy.weights multiply into tag-based weight — honors the
        // 70/30 bias from policy `allocation.skillWeights` / `categoryWeights`.
        weight: getWeight(runtime.config, runtime.learnspace.activeTag, queueRow.skillId)
          * skillScope.weightFor(queueRow.skillId),
      } satisfies Candidate;
    })
    .filter((candidate): candidate is Candidate => candidate !== null)
    .sort(compareCandidates);

  const avgDurationBySkill = computeAvgDurationBySkill(attemptRows, itemsById);
  let modeCandidates = applyQueueStrategyPolicy(candidates, strategy, avgDurationBySkill, runtime.config.skill_progression);

  if (targetSkillId) {
    modeCandidates = modeCandidates.filter((c) => c.skill.id === targetSkillId);
    if (modeCandidates.length === 0) {
      modeCandidates = candidates.filter((c) => c.skill.id === targetSkillId);
    }
  }

  if (modeCandidates.length === 0) {
    if (targetSkillId) {
      return { type: "empty", code: "queue_empty", message: `No items available for skill ${targetSkillId}` };
    }
    return QUEUE_EMPTY_RESULT;
  }

  const recentPrimarySkillId = getRecentPrimarySkillId(attemptRows, itemsById);
  const itemsBySkill = new Map<string, Item[]>();
  for (const item of itemRows) {
    for (const skillId of item.skillIds ?? []) {
      itemsBySkill.set(skillId, [...(itemsBySkill.get(skillId) ?? []), item]);
    }
  }

  const passes: Array<(candidate: Candidate) => boolean> = [
    (candidate) =>
      !(
        recentPrimarySkillId &&
        candidate.skill.id === recentPrimarySkillId &&
        candidate.confidence.score >= runtime.config.interleaving_confidence_threshold
      ),
    () => true,
  ];

  for (const allowCandidate of passes) {
    for (const candidate of modeCandidates) {
      if (!allowCandidate(candidate)) {
        continue;
      }

      const variantCtx: VariantContext = {
        deps,
        learnspaceId,
        learnspaceConfig: runtime.config,
        generatedForTrackId: trackContext.track.id,
        skillName: candidate.skill.name,
        allItemsForSkill: itemsBySkill.get(candidate.skill.id) ?? [],
        anyLearnspaceItem: itemRows[0],
        attemptsByItemId,
        forceGenerated: forceGenerated === true,
      };

      // Per-skill generation + difficulty filters: the track policy gets a
      // say on every pool passed to resolveItemForSkill, not just a global
      // toggle. Items outside allowedDifficulties are dropped before sort
      // so fixed/range difficulty policies surface the intended band.
      const perSkillGenerationAllowed = isGenerationAllowedForSkill(
        trackContext,
        candidate.skill.id,
        seedPoolAvailable,
      );
      const skillItemsForCandidate = (itemsBySkill.get(candidate.skill.id) ?? [])
        .filter((item) => !allowedDifficulties || allowedDifficulties.has(item.difficulty));
      const resolvedItem = await resolveItemForSkill(
        candidate.skill.id,
        candidate.confidence,
        skillItemsForCandidate,
        attemptsByItemId,
        variantCtx,
        perSkillGenerationAllowed,
        forceGenerated === true,
        difficultyTarget,
      );

      if (!resolvedItem) {
        continue;
      }

      return {
        queueId: candidate.queueRow.id,
        skillId: candidate.skill.id,
        skillName: candidate.skill.name,
        tier: candidate.tier,
        dueDate: candidate.queueRow.dueDate,
        confidenceScore: candidate.confidence.score,
        trackId: trackContext.track.id,
        selectionReason: buildSelectionReason({
          schedulerId: runtime.schedulerId,
          tier: candidate.tier,
          trackContext,
          sessionPlan,
          generationAllowed: perSkillGenerationAllowed,
          generated: resolvedItem.generated,
          generatedFromArtifactId: resolvedItem.generatedFromArtifactId,
          source: "skill_queue",
          reasons: [
            `${candidate.skill.name} won because it is ${describeTier(candidate.tier)} in ${runtime.schedulerId}.`,
            `Track "${trackContext.track.name}" emphasizes ${describeTrackEmphasis(trackContext, sessionPlan)}.`,
            forceGenerated && resolvedItem.generated
              ? `You requested generated practice for this track.`
              : resolvedItem.generated
              ? `A generated problem was used because the available item pool was too narrow for this track.`
              : `The selected item best matched the track policy and current confidence target.`,
          ],
        }),
        item: {
          id: resolvedItem.item.id,
          title: resolvedItem.item.title,
          difficulty: resolvedItem.item.difficulty as QueueSelection["item"]["difficulty"],
          skillIds: resolvedItem.item.skillIds ?? [],
          tags: resolvedItem.item.tags ?? [],
          source: resolvedItem.item.source,
          status: resolvedItem.item.status,
          content: resolvedItem.item.content ?? {},
        },
      };
    }
  }

  return QUEUE_EMPTY_RESULT;
}
