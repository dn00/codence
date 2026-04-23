/**
 * BENCH-ONLY heuristic NL → TrackPolicy compiler.
 *
 * NOT used at runtime. Production interpretation runs through the LLM
 * policy compiler in `src/server/tracks/policy/compiler.ts`. This file
 * exists purely as a deterministic parity baseline for the benchmark
 * harness (`scripts/track-v4-bench.ts`,
 * `scripts/track-policy-compiler-bench.ts`) and as a reference for how
 * the schema maps onto natural-language intents.
 */

import type {
  TrackBenchmarkCaseV4,
  TrackPolicyV4,
  TrackV4HandlingOutcome,
} from "./benchmark-schema.js";
import { TRACK_V4_BENCHMARK_CASES, TRACK_V4_DOMAIN_FIXTURES } from "./benchmark-fixtures.js";

export interface CompileResultV4 {
  intentId?: string;
  domainId: TrackBenchmarkCaseV4["domainId"];
  request: string;
  outcome: TrackV4HandlingOutcome;
  policy: TrackPolicyV4 | null;
  reasons: string[];
}

const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  twentyfive: 25,
  thirty: 30,
};

const TOKEN_ALIASES: Record<string, string> = {
  vocab: "vocabulary",
  weekdays: "weekday",
  workdays: "weekday",
  weekends: "weekend",
};

function basePolicy(): TrackPolicyV4 {
  return {
    scope: {
      includeSkillIds: [],
      excludeSkillIds: [],
      includeCategories: [],
      excludeCategories: [],
    },
    allocation: {},
    pacing: {},
    sessionComposition: {},
    difficulty: { mode: "adaptive" },
    progression: { mode: "linear" },
    review: { scheduler: "sm5", aggressiveness: "balanced" },
    adaptation: {},
    cadence: [],
    contentSource: { realItemsFirst: true },
  };
}

function tokenize(value: string): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "always",
    "about",
    "be",
    "for",
    "include",
    "keep",
    "material",
    "more",
    "new",
    "of",
    "on",
    "only",
    "overdue",
    "practice",
    "problem",
    "problems",
    "real",
    "review",
    "session",
    "sessions",
    "the",
    "to",
    "with",
  ]);
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !stopWords.has(token));
}

function canonicalizeToken(token: string): string {
  let value = token.toLowerCase();
  if (value.endsWith("ies") && value.length > 4) {
    value = `${value.slice(0, -3)}y`;
  } else if (value.endsWith("s") && value.length > 4 && !value.endsWith("ss")) {
    value = value.slice(0, -1);
  }
  return TOKEN_ALIASES[value] ?? value;
}

function normalizeForParsing(value: string): string {
  return value
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\btwenty five\b/g, "twentyfive")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumericWord(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (/^\d+$/.test(value)) return Number(value);
  return NUMBER_WORDS[value] ?? null;
}

function extractSentenceScopedNumber(request: string, patterns: string[]): number | null {
  const sentences = request.split(/[.!?]/).map((part) => normalizeForParsing(part)).filter(Boolean);
  for (const sentence of sentences) {
    const numericMatches = [...sentence.matchAll(/\b(\d+|ten|twelve|fifteen|twentyfive|thirty)\b/g)];
    for (const pattern of patterns) {
      const match = new RegExp(pattern).exec(sentence);
      if (!match || match.index < 0) continue;
      const nearest = numericMatches
        .map((numericMatch) => ({
          value: parseNumericWord(numericMatch[1]),
          distance: Math.abs((numericMatch.index ?? 0) - match.index),
        }))
        .filter((entry) => entry.value != null)
        .sort((left, right) => left.distance - right.distance)[0];
      if (nearest?.value != null) return nearest.value;
    }
  }
  return null;
}

function findDomainMatches(domainId: TrackBenchmarkCaseV4["domainId"], request: string) {
  const domain = TRACK_V4_DOMAIN_FIXTURES[domainId];
  const tokens = new Set(tokenize(request).map(canonicalizeToken));
  const categoryHits = [...new Set(domain.skills
    .map((skill) => skill.category)
    .filter((category) => tokenize(category).map(canonicalizeToken).every((token) => tokens.has(token))))];
  const matchedSkills = domain.skills
    .filter((skill) =>
      tokenize(skill.name).map(canonicalizeToken).every((token) => tokens.has(token)),
    );
  const includeSkillIds = matchedSkills.map((skill) => skill.id);
  return {
    includeSkillIds: [...new Set(includeSkillIds)],
    includeCategories: [...new Set([...matchedSkills.map((skill) => skill.category), ...categoryHits])],
  };
}

function maybeRejectUnsupported(request: string): string | null {
  const lower = request.toLowerCase();
  if (
    /\b(tired|stress|stressed|sleep|calendar|exhausted|mood)\b/.test(lower)
    || /\bwiped out\b|\bslept badly\b|\bbad sleep\b|\bbad mood\b|\bgood mood\b/.test(lower)
    || /\btext a friend\b|\bping someone\b|\bguilt trip\b|\bnagging\b|\bshame me\b|\baccountable\b/.test(lower)
  ) {
    return "Request depends on external personal context that V4 does not model.";
  }
  return null;
}

function maybeClarify(request: string): string | null {
  const lower = request.toLowerCase();
  if (/\bweak stuff\b|\bshaky\b|\bwobbly\b/.test(lower)) {
    return "Need clarification on whether 'weak' means low confidence, recent failures, or overdue review.";
  }
  if (/\bweekends count more\b|\bpull more weight\b|\bdo more of the lifting\b|\bcarry more of the load\b/.test(lower)) {
    return "Need clarification on whether weekends should increase time, review share, or difficulty.";
  }
  if (/\bcycle things back around\b/.test(lower)) {
    return "Need clarification on whether this means spiral progression or heavier review recurrence.";
  }
  if (/\bcycle back around\b/.test(normalizeForParsing(request)) && /\bfuzzy\b|\bloose human\b|\bnot a precise\b|\bspecification writer\b/.test(normalizeForParsing(request))) {
    return "Need clarification on whether this means spiral progression or heavier review recurrence.";
  }
  if (/\bimportant stuff\b/.test(lower)) {
    return "Need clarification on whether 'important' means fundamentals, weak areas, or highest-weighted goals.";
  }
  if (/\bturn it up on weekends\b/.test(lower)) {
    return "Need clarification on whether weekends should increase time budget, review pressure, or difficulty.";
  }
  if (/\bmore interview ish\b|\bmore real world ish\b|\bmore native ish\b|\bfeel more interview ish\b|\bfeel more real world ish\b|\bfeel more native ish\b/.test(normalizeForParsing(request))) {
    return "Need clarification on which concrete track behaviors should make the plan feel more like the requested style.";
  }
  return null;
}

function maybeRepair(request: string): { reasons: string[]; mutate: (policy: TrackPolicyV4) => void } | null {
  const lower = request.toLowerCase();
  if (/\bpush me\b/.test(lower) && /\bdon'?t\b.*\b(bury|wreck|crush|fry)\b/.test(lower)) {
    return {
      reasons: ["Mapped vague push/comfort phrasing into adaptive difficulty with both push-on-success and backoff-on-struggle."],
      mutate(policy) {
        policy.pacing.intensity = "steady";
        policy.difficulty.mode = "adaptive";
        policy.difficulty.pushOnSuccess = true;
        policy.difficulty.backoffOnStruggle = true;
        policy.adaptation.onCleanStreak = "advance_difficulty";
        policy.adaptation.onRepeatedFailures = "reduce_difficulty";
      },
    };
  }
  if (/\bhonestly\b/.test(lower) && /\blearn\b/.test(lower)) {
    return {
      reasons: ["Mapped conflicting grading intent into balanced review plus adaptive difficulty."],
      mutate(policy) {
        policy.review.aggressiveness = "balanced";
        policy.difficulty.mode = "adaptive";
        policy.difficulty.pushOnSuccess = true;
        policy.difficulty.backoffOnStruggle = true;
      },
    };
  }
  if (/\bhonest\b/.test(lower) && /\blearn\b|\bleave room\b|\bdon t make.*punitive\b|\bdon't make.*punitive\b/.test(lower)) {
    return {
      reasons: ["Mapped honest-but-still-learning phrasing into balanced review plus adaptive difficulty."],
      mutate(policy) {
        policy.review.aggressiveness = "balanced";
        policy.difficulty.mode = "adaptive";
        policy.difficulty.pushOnSuccess = true;
        policy.difficulty.backoffOnStruggle = true;
      },
    };
  }
  if (/\bstretch me\b/.test(lower) && /\bdon t fry me\b|\bdon't fry me\b/.test(lower)) {
    return {
      reasons: ["Mapped stretch-but-safe phrasing into steady intensity with adaptive push and backoff."],
      mutate(policy) {
        policy.pacing.intensity = "steady";
        policy.difficulty.mode = "adaptive";
        policy.difficulty.pushOnSuccess = true;
        policy.difficulty.backoffOnStruggle = true;
        policy.adaptation.onCleanStreak = "advance_difficulty";
        policy.adaptation.onRepeatedFailures = "reduce_difficulty";
      },
    };
  }
  if (/\bchallenging\b/.test(lower) && /\bnot crushing\b/.test(lower)) {
    return {
      reasons: ["Mapped challenging-not-crushing phrasing into steady intensity with adaptive push and backoff."],
      mutate(policy) {
        policy.pacing.intensity = "steady";
        policy.difficulty.mode = "adaptive";
        policy.difficulty.pushOnSuccess = true;
        policy.difficulty.backoffOnStruggle = true;
        policy.adaptation.onCleanStreak = "advance_difficulty";
        policy.adaptation.onRepeatedFailures = "reduce_difficulty";
      },
    };
  }
  if (/\bchallenge me\b/.test(lower) && /\bunderwater\b|\bdrowning\b/.test(lower)) {
    return {
      reasons: ["Mapped challenge-with-safety phrasing into steady intensity with adaptive push and backoff."],
      mutate(policy) {
        policy.pacing.intensity = "steady";
        policy.difficulty.mode = "adaptive";
        policy.difficulty.pushOnSuccess = true;
        policy.difficulty.backoffOnStruggle = true;
        policy.adaptation.onCleanStreak = "advance_difficulty";
        policy.adaptation.onRepeatedFailures = "reduce_difficulty";
      },
    };
  }
  return null;
}

function extractEveryNSessions(request: string): number | null {
  const match = normalizeForParsing(request).match(/\bevery\s+(\d+|first|second|third|fourth|fifth|sixth|seventh)\s+sessions?\b/);
  if (!match) return null;
  const raw = match[1]!;
  return /^\d+$/.test(raw) ? Number(raw) : (ORDINAL_WORDS[raw] ?? null);
}

function extractLooseRatio(request: string): [number, number] | null {
  const match = request.toLowerCase().match(/\b(\d+)\s*(?:%|\/|\s)\s*(\d+)\b/);
  if (!match) return null;
  const left = Number(match[1]);
  const right = Number(match[2]);
  const total = left + right;
  if (total === 0) return null;
  return [left / total, right / total];
}

function applyDirectionalWeights(
  policy: TrackPolicyV4,
  domainId: TrackBenchmarkCaseV4["domainId"],
  leftText: string,
  rightText: string,
  leftWeight: number,
  rightWeight: number,
): void {
  const left = findDomainMatches(domainId, leftText);
  const right = findDomainMatches(domainId, rightText);
  policy.scope.includeSkillIds = [...new Set([...left.includeSkillIds, ...right.includeSkillIds])];
  policy.scope.includeCategories = [...new Set([...left.includeCategories, ...right.includeCategories])];
  policy.allocation.skillWeights = {};
  for (const skillId of left.includeSkillIds) policy.allocation.skillWeights[skillId] = leftWeight;
  for (const skillId of right.includeSkillIds) policy.allocation.skillWeights[skillId] = rightWeight;
}

export function compileNaturalLanguageTrackV4(
  domainId: TrackBenchmarkCaseV4["domainId"],
  request: string,
): CompileResultV4 {
  const unsupportedReason = maybeRejectUnsupported(request);
  if (unsupportedReason) {
    return {
      domainId,
      request,
      outcome: "reject",
      policy: null,
      reasons: [unsupportedReason],
    };
  }

  const clarificationReason = maybeClarify(request);
  if (clarificationReason) {
    return {
      domainId,
      request,
      outcome: "clarify",
      policy: null,
      reasons: [clarificationReason],
    };
  }

  const repair = maybeRepair(request);
  const policy = basePolicy();
  const reasons: string[] = [];
  const lower = request.toLowerCase();
  const normalized = normalizeForParsing(request);
  const scopeMatches = findDomainMatches(domainId, request);

  policy.scope.includeSkillIds = scopeMatches.includeSkillIds;
  policy.scope.includeCategories = scopeMatches.includeCategories;

  const excludeMatch = lower.match(/(?:exclude|without|except)\s+([a-z0-9\s]+)/);
  if (excludeMatch) {
    const excluded = findDomainMatches(domainId, excludeMatch[1]);
    policy.scope.excludeSkillIds = excluded.includeSkillIds;
    policy.scope.excludeCategories = excluded.includeCategories;
  }

  const weightedMatch = lower.match(/(\d+)%\s+([a-z0-9\s]+?)\s+(\d+)%\s+([a-z0-9\s]+)/)
    ?? normalized.match(/(\d+)\s+([a-z0-9\s]+?)\s+(\d+)\s+([a-z0-9\s]+)/);
  const directionalMatch = normalized.match(/([a-z0-9\s]+?)\s+over\s+([a-z0-9\s]+)/)
    ?? normalized.match(/(?:toward|towards)\s+([a-z0-9\s]+?)\s+than\s+([a-z0-9\s]+)/);
  const ratio = extractLooseRatio(normalized);

  if (weightedMatch) {
    applyDirectionalWeights(
      policy,
      domainId,
      weightedMatch[2],
      weightedMatch[4],
      Number(weightedMatch[1]) / 100,
      Number(weightedMatch[3]) / 100,
    );
  } else if (directionalMatch && ratio) {
    applyDirectionalWeights(policy, domainId, directionalMatch[1]!, directionalMatch[2]!, ratio[0], ratio[1]);
  } else if (/\bmostly\b/.test(lower) && /\bsome\b|\ba little\b/.test(lower)) {
    const mostlyMatch = lower.match(/mostly\s+([a-z0-9\s]+?)(?:,| and )\s*(?:some|a little)\s+([a-z0-9\s]+)/);
    if (mostlyMatch) {
      applyDirectionalWeights(policy, domainId, mostlyMatch[1], mostlyMatch[2], 0.8, 0.2);
    }
  }

  const canonicalWeekday = lower.match(/(\d+)\s*minute[s]?\s*weekdays?|weekdays?.*?(\d+)\s*minute[s]?|workdays?.*?(\d+)\s*minute[s]?|(\d+)\s*minute[s]?\s*workdays?/);
  const weekdayMinutes = canonicalWeekday
    ? Number(canonicalWeekday[1] ?? canonicalWeekday[2] ?? canonicalWeekday[3] ?? canonicalWeekday[4])
    : extractSentenceScopedNumber(request, ["\\bweekdays?\\b", "\\bworkdays?\\b", "\\bmidweek\\b"]);
  if (weekdayMinutes != null) {
    policy.pacing.weekdayMinutes = weekdayMinutes;
  }
  const canonicalWeekend = lower.match(/(\d+)\s*minute[s]?\s*weekends?|weekends?.*?(\d+)\s*minute[s]?/);
  const weekendMinutes = canonicalWeekend
    ? Number(canonicalWeekend[1] ?? canonicalWeekend[2])
    : extractSentenceScopedNumber(request, ["\\bweekends?\\b"]);
  if (weekendMinutes != null) {
    policy.pacing.weekendMinutes = weekendMinutes;
  } else if (policy.pacing.weekdayMinutes && /\blonger weekend\b/.test(lower)) {
    policy.pacing.weekendMinutes = policy.pacing.weekdayMinutes * 2;
  }
  const sessionsPerWeek = normalized.match(/\b(\d+|one|two|three|four|five|six|seven)\s+sessions?\s+a\s+week\b/);
  if (sessionsPerWeek) {
    policy.pacing.sessionsPerWeek = parseNumericWord(sessionsPerWeek[1]) ?? undefined;
  }
  if (/\blight\b/.test(lower)) policy.pacing.intensity = "light";
  if (/\bsteady\b/.test(lower)) policy.pacing.intensity = "steady";
  if (/\bintense\b/.test(lower) || /\bgo harder\b/.test(lower)) policy.pacing.intensity = "intense";

  if (
    /\bmore review than new\b|\bdon t let new material dominate\b|\bdon't let new material dominate\b/.test(lower)
    || /\b(old stuff|revisiting|recycling)\b/.test(lower) && /\b(fresh|new|brand new)\b/.test(lower)
  ) {
    policy.sessionComposition.reviewShare = 0.7;
    policy.sessionComposition.newShare = 0.3;
    policy.review.interleaveOldAndNew = true;
  }
  if (/\bwarmup\b/.test(lower)) policy.sessionComposition.warmup = true;
  if (/\bsingle topic\b|\bsingle topic for now\b|\bsingle topic for a while\b/.test(normalized)) policy.sessionComposition.mixedSessions = false;
  if (/\bmixed practice\b/.test(lower)) policy.sessionComposition.mixedSessions = true;
  const maxNew = lower.match(/max(?:imum)?\s+(\d+)\s+new/);
  if (maxNew) policy.sessionComposition.maxNewItemsPerSession = Number(maxNew[1]);
  if (/\bdrills?\b|\bdrill heavy\b|\bdrill block\b/.test(normalized)) policy.sessionComposition.drillShare = 0.4;
  if (/\bmocks?\b|\bfake interview\b|\binterview ish\b|\binterview run\b|\bmock run\b/.test(normalized)) policy.sessionComposition.mockShare = 0.2;
  if (/\breview\b/.test(lower)) policy.sessionComposition.reviewShare = Math.max(policy.sessionComposition.reviewShare ?? 0, 0.6);
  if (/\brecap\b/.test(lower)) policy.sessionComposition.recallShare = 0.2;

  if (
    /\bstart easy then\b|\beasy at first\b|\beasy first\b|\bease me in\b|\bsofter\b/.test(normalized)
    || /\bdon t start with the hard\b|\bdon t open with hard\b|\bdon t open with hard mode\b/.test(normalized)
    || (
      /\bthen medium\b|\braise the bar later\b|\bbring mediums in later\b|\buntil i m settled\b|\bonce i m moving again\b/.test(normalized)
      && /\beasy\b|\bsofter\b|\bhard\b/.test(normalized)
    )
  ) {
    policy.difficulty.mode = "staged";
    policy.difficulty.stages = [
      { afterSessions: 0, targetBand: "easy" },
      { afterSessions: 4, maxBand: "medium" },
    ];
  } else if (/\beasy\b/.test(normalized) && !/\beasy mode\b|\btoo soft\b/.test(normalized)) {
    policy.difficulty.mode = "fixed";
    policy.difficulty.targetBand = "easy";
  } else if (/\bmedium\b/.test(normalized)) {
    policy.difficulty.mode = "fixed";
    policy.difficulty.targetBand = "medium";
  } else if (/\bhard\b/.test(normalized) && !/\bpretty hard toward\b|\bshift hard into\b/.test(normalized)) {
    policy.difficulty.mode = "fixed";
    policy.difficulty.targetBand = "hard";
  }
  if (/\bback off\b|\bback it off\b|\bback the difficulty off\b|\bslow down if i m bombing\b|\bslow down if i'm bombing\b|\bbombing repeatedly\b|\bfaceplant\b|\bfaceplanting\b/.test(normalized)) {
    policy.difficulty.backoffOnStruggle = true;
    policy.adaptation.onRepeatedFailures = "reduce_difficulty";
  }
  if (/\bpush on success\b|\bgo harder if i m cruising\b|\bgo harder if i m cruising\b|\bif i m cruising\b|\braise the bar\b/.test(normalized)) {
    policy.difficulty.pushOnSuccess = true;
    policy.adaptation.onCleanStreak = "advance_difficulty";
  }

  if (
    /\bfundamentals before advanced\b|\bprerequisite\b/.test(normalized)
    || /\b(basics?|fundamentals?)\b.*\b(before|until)\b.*\b(advanced|fancy)\b/.test(normalized)
    || /\b(advanced|fancy)\b.*\b(before|until)\b.*\b(basics?|fundamentals?)\b/.test(normalized)
    || /\bbefore you make this fancy\b|\bbefore you make it fancy\b/.test(normalized)
  ) {
    policy.progression.mode = "mastery_gated";
    policy.progression.prerequisitesFirst = true;
    policy.scope.fundamentalsOnly = true;
    policy.scope.includeSkillIds = [];
    policy.scope.includeCategories = [];
  }
  if (/\bbreadth first\b/.test(normalized) || /\btouch the landscape\b/.test(normalized)) policy.progression.mode = "breadth_first";
  if (policy.progression.mode !== "breadth_first" && (/\bdepth first\b/.test(normalized) || /\bgo depth first\b|\bno survey\b/.test(normalized))) policy.progression.mode = "depth_first";
  if (/\bcycle\b|\bspiral\b|\blooping back around\b|\blooping back\b/.test(normalized)) policy.progression.mode = "spiral";

  if (/\baggressive about review\b|\breview aggressive\b|\bkeep review aggressive\b/.test(lower)) {
    policy.review.aggressiveness = "aggressive";
  }
  if (/\boverdue\b/.test(normalized)) {
    policy.review.includeOverdueEverySession = true;
  }
  if (/\boverdue\b/.test(normalized) && /\b(dragged back|drag it back|shove them back|shoved back|keep dragging it back)\b/.test(normalized)) {
    policy.review.aggressiveness = "aggressive";
  }
  if (/\bdon t let reviews dominate\b|\bdon't let reviews dominate\b/.test(lower)) {
    policy.review.dueReviewCap = 3;
  }

  if (/\bweak areas?\b/.test(normalized)) {
    policy.scope.weakAreasOnly = true;
    policy.allocation.weakAreaBias = "strong";
  }
  if (/\bif i keep failing\b|\brepeated fail/.test(lower)) {
    policy.adaptation.onRepeatedFailures = "rehab_focus";
  }
  if (/\bif i m doing well\b|\bif i'm doing well\b|\bpush me when i m doing well\b|\bpush me when i'm doing well\b/.test(lower)) {
    policy.adaptation.onCleanStreak = "advance_difficulty";
  }
  if (/\boverdue piles up\b|\boverdue review starts\b|\breview focus\b/.test(normalized)) {
    policy.sessionComposition.reviewShare = Math.max(policy.sessionComposition.reviewShare ?? 0, 0.8);
    policy.sessionComposition.newShare = 0.2;
    policy.review.includeOverdueEverySession = true;
    policy.adaptation.onOverdueLoad = "review_focus";
  }
  if (/\bpool is low\b|\bseed pool\b/.test(normalized)) {
    policy.adaptation.onSeedPoolLow = "allow_generation";
  }
  if (/\brun out\b|\brun it thin\b|\brun that thin\b|\bgets thin\b|\bpool gets thin\b|\bdry\b/.test(normalized)) {
    policy.adaptation.onSeedPoolLow = "allow_generation";
  }

  const everyNSessions = extractEveryNSessions(lower);
  if (everyNSessions) {
    const cadenceBucket = /\bmock\b|\bfake interview\b|\bfake interview ish\b|\binterview run\b|\bmock run\b/.test(normalized)
      ? "mock"
      : /\bdrill\b|\bdrill heavy\b|\bdrill block\b/.test(normalized)
        ? "drill"
        : /\brecap\b/.test(normalized)
          ? "recap"
          : "review";
    policy.cadence.push({
      kind: "every_n_sessions",
      bucket: cadenceBucket,
      everyNSessions,
    });
  }
  if (/\bweekends? are for review\b/.test(normalized)) {
    policy.cadence.push({ kind: "weekend", bucket: "review" });
  }
  if (/\bevery sunday\b/.test(normalized)) {
    policy.cadence.push({ kind: "weekday", bucket: "recap", weekday: 0 });
  }

  if (/\bseed only\b|\bonly real catalog\b|\breal catalog only\b|\breal material only\b/.test(normalized) || /\bno synthetic\b/.test(normalized)) {
    policy.contentSource.seedOnly = true;
    policy.contentSource.generatedAllowed = false;
  }
  if (/\bgenerated\b|\bsynthetic\b|\bsynthesize\b/.test(normalized)) {
    policy.contentSource.generatedAllowed = true;
  }
  if (/\bfallback\b|\bonly when the pool is low\b|\brun out\b|\brun it thin\b|\brun that thin\b|\bpool gets thin\b|\bdry\b/.test(normalized)) {
    policy.contentSource.generatedOnlyAsFallback = true;
    policy.contentSource.generatedAllowed = true;
  }
  if (/\bonly for drills\b|\bgenerated drills are okay\b|\bfine for drills\b/.test(normalized)) {
    policy.contentSource.generatedForDrillsOnly = true;
    policy.contentSource.generatedAllowed = true;
  }
  if (/\bnot for assessment\b|\bno generated content for tests\b|\bsmells like assessment\b|\bcounts as assessment\b|\bfeels like assessment\b|\bevaluation\b/.test(normalized)) {
    policy.contentSource.noGeneratedForAssessment = true;
  }
  if (policy.contentSource.seedOnly) {
    policy.contentSource.generatedAllowed = false;
    policy.contentSource.generatedOnlyAsFallback = false;
    policy.contentSource.generatedForDrillsOnly = false;
  }

  if (repair) {
    repair.mutate(policy);
    reasons.push(...repair.reasons);
    return {
      domainId,
      request,
      outcome: "repaired",
      policy,
      reasons,
    };
  }

  return {
    domainId,
    request,
    outcome: "compiled",
    policy,
    reasons,
  };
}

export function findBenchmarkCaseByIntentV4(intentId: string): TrackBenchmarkCaseV4 {
  const benchmarkCase = TRACK_V4_BENCHMARK_CASES.find((entry) => entry.intentId === intentId);
  if (!benchmarkCase) {
    throw new Error(`Unknown V4 benchmark case: ${intentId}`);
  }
  return benchmarkCase;
}

export function compileBenchmarkCaseV4(benchmarkCase: TrackBenchmarkCaseV4): CompileResultV4[] {
  return benchmarkCase.naturalLanguageRequests.map((request) => ({
    intentId: benchmarkCase.intentId,
    ...compileNaturalLanguageTrackV4(benchmarkCase.domainId, request),
  }));
}

export function comparePoliciesV4(left: TrackPolicyV4, right: TrackPolicyV4): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function equalNumbers(left: number | null | undefined, right: number | null | undefined): boolean {
  if (left == null && right == null) return true;
  return left === right;
}

export function policySemanticallyMatchesV4(expected: TrackPolicyV4, actual: TrackPolicyV4): boolean {
  const includesAll = (actualValues: string[], expectedValues: string[]) =>
    expectedValues.every((value) => actualValues.includes(value));

  if (!includesAll(actual.scope.includeSkillIds, expected.scope.includeSkillIds)) return false;
  if (!includesAll(actual.scope.excludeSkillIds, expected.scope.excludeSkillIds)) return false;
  if (!includesAll(actual.scope.includeCategories, expected.scope.includeCategories)) return false;
  if (!includesAll(actual.scope.excludeCategories, expected.scope.excludeCategories)) return false;

  for (const [skillId, weight] of Object.entries(expected.allocation.skillWeights ?? {})) {
    if (Math.abs((actual.allocation.skillWeights?.[skillId] ?? -1) - weight) > 0.001) return false;
  }
  for (const [category, weight] of Object.entries(expected.allocation.categoryWeights ?? {})) {
    if (Math.abs((actual.allocation.categoryWeights?.[category] ?? -1) - weight) > 0.001) return false;
  }

  if (expected.allocation.breadthVsDepth && actual.allocation.breadthVsDepth !== expected.allocation.breadthVsDepth) return false;
  if (expected.allocation.weakAreaBias && actual.allocation.weakAreaBias !== expected.allocation.weakAreaBias) return false;

  if (expected.pacing.weekdayMinutes !== undefined && !equalNumbers(expected.pacing.weekdayMinutes, actual.pacing.weekdayMinutes)) return false;
  if (expected.pacing.weekendMinutes !== undefined && !equalNumbers(expected.pacing.weekendMinutes, actual.pacing.weekendMinutes)) return false;
  if (expected.pacing.sessionsPerWeek !== undefined && !equalNumbers(expected.pacing.sessionsPerWeek, actual.pacing.sessionsPerWeek)) return false;
  if (expected.pacing.intensity && actual.pacing.intensity !== expected.pacing.intensity) return false;

  if (expected.sessionComposition.reviewShare !== undefined && !equalNumbers(expected.sessionComposition.reviewShare, actual.sessionComposition.reviewShare)) return false;
  if (expected.sessionComposition.newShare !== undefined && !equalNumbers(expected.sessionComposition.newShare, actual.sessionComposition.newShare)) return false;
  if (expected.sessionComposition.drillShare !== undefined && !equalNumbers(expected.sessionComposition.drillShare, actual.sessionComposition.drillShare)) return false;
  if (expected.sessionComposition.mockShare !== undefined && !equalNumbers(expected.sessionComposition.mockShare, actual.sessionComposition.mockShare)) return false;
  if (expected.sessionComposition.recallShare !== undefined && !equalNumbers(expected.sessionComposition.recallShare, actual.sessionComposition.recallShare)) return false;
  if (expected.sessionComposition.warmup !== undefined && actual.sessionComposition.warmup !== expected.sessionComposition.warmup) return false;
  if (expected.sessionComposition.mixedSessions !== undefined && actual.sessionComposition.mixedSessions !== expected.sessionComposition.mixedSessions) return false;

  if (expected.difficulty.mode !== actual.difficulty.mode) return false;
  if (expected.difficulty.targetBand && actual.difficulty.targetBand !== expected.difficulty.targetBand) return false;
  if (expected.difficulty.pushOnSuccess !== undefined && actual.difficulty.pushOnSuccess !== expected.difficulty.pushOnSuccess) return false;
  if (expected.difficulty.backoffOnStruggle !== undefined && actual.difficulty.backoffOnStruggle !== expected.difficulty.backoffOnStruggle) return false;
  if ((expected.difficulty.stages?.length ?? 0) > 0 && JSON.stringify(expected.difficulty.stages) !== JSON.stringify(actual.difficulty.stages)) return false;

  if (expected.progression.mode !== actual.progression.mode) return false;
  if (expected.progression.prerequisitesFirst !== undefined && actual.progression.prerequisitesFirst !== expected.progression.prerequisitesFirst) return false;

  if (expected.review.scheduler && actual.review.scheduler !== expected.review.scheduler) return false;
  if (expected.review.aggressiveness && actual.review.aggressiveness !== expected.review.aggressiveness) return false;
  if (expected.review.dueReviewCap !== undefined && !equalNumbers(expected.review.dueReviewCap, actual.review.dueReviewCap)) return false;
  if (expected.review.includeOverdueEverySession !== undefined && actual.review.includeOverdueEverySession !== expected.review.includeOverdueEverySession) return false;
  if (expected.review.interleaveOldAndNew !== undefined && actual.review.interleaveOldAndNew !== expected.review.interleaveOldAndNew) return false;

  if (expected.adaptation.onRepeatedFailures !== undefined && actual.adaptation.onRepeatedFailures !== expected.adaptation.onRepeatedFailures) return false;
  if (expected.adaptation.onCleanStreak !== undefined && actual.adaptation.onCleanStreak !== expected.adaptation.onCleanStreak) return false;
  if (expected.adaptation.onSeedPoolLow !== undefined && actual.adaptation.onSeedPoolLow !== expected.adaptation.onSeedPoolLow) return false;

  if ((expected.cadence?.length ?? 0) > 0 && JSON.stringify(expected.cadence) !== JSON.stringify(actual.cadence)) return false;

  if (expected.contentSource.seedOnly !== undefined && actual.contentSource.seedOnly !== expected.contentSource.seedOnly) return false;
  if (expected.contentSource.generatedAllowed !== undefined && actual.contentSource.generatedAllowed !== expected.contentSource.generatedAllowed) return false;
  if (expected.contentSource.generatedOnlyAsFallback !== undefined && actual.contentSource.generatedOnlyAsFallback !== expected.contentSource.generatedOnlyAsFallback) return false;
  if (expected.contentSource.generatedForDrillsOnly !== undefined && actual.contentSource.generatedForDrillsOnly !== expected.contentSource.generatedForDrillsOnly) return false;
  if (expected.contentSource.noGeneratedForAssessment !== undefined && actual.contentSource.noGeneratedForAssessment !== expected.contentSource.noGeneratedForAssessment) return false;

  return true;
}

export function matchesGoldOrEquivalentV4(benchmarkCase: TrackBenchmarkCaseV4, policy: TrackPolicyV4): boolean {
  if (benchmarkCase.goldPolicy && policySemanticallyMatchesV4(benchmarkCase.goldPolicy, policy)) {
    return true;
  }
  return (benchmarkCase.acceptableEquivalentPolicies ?? []).some((candidate) => policySemanticallyMatchesV4(candidate, policy));
}
