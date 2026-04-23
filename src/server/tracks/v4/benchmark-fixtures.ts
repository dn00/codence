import type {
  RuntimeScenarioV4,
  TrackBenchmarkCaseV4,
  TrackBenchmarkSummaryV4,
  TrackPolicyV4,
  TrackV4DomainId,
  TrackV4HandlingOutcome,
} from "./benchmark-schema.js";

export interface TrackBenchmarkDomainFixtureV4 {
  id: TrackV4DomainId;
  label: string;
  skills: Array<{ id: string; name: string; category: string; fundamentals?: boolean }>;
  supportedCadenceBuckets: Array<"mock" | "drill" | "review" | "recap">;
  supportsGeneratedContent: boolean;
  supportsGeneratedAssessment: boolean;
}

export const TRACK_V4_DOMAIN_FIXTURES: Record<TrackV4DomainId, TrackBenchmarkDomainFixtureV4> = {
  "coding-interview-patterns": {
    id: "coding-interview-patterns",
    label: "Coding Interview Patterns",
    skills: [
      { id: "arrays_and_hashing", name: "Arrays and Hashing", category: "arrays", fundamentals: true },
      { id: "two_pointers", name: "Two Pointers", category: "arrays", fundamentals: true },
      { id: "sliding_window", name: "Sliding Window", category: "arrays", fundamentals: true },
      { id: "graphs", name: "Graphs", category: "graphs" },
      { id: "advanced_graphs", name: "Advanced Graphs", category: "graphs" },
      { id: "trees", name: "Trees", category: "trees" },
      { id: "dp_1d", name: "DP 1-D", category: "dynamic_programming" },
      { id: "dp_2d", name: "DP 2-D", category: "dynamic_programming" },
    ],
    supportedCadenceBuckets: ["mock", "drill", "review", "recap"],
    supportsGeneratedContent: true,
    supportsGeneratedAssessment: false,
  },
  "writing-workshop": {
    id: "writing-workshop",
    label: "Writing Workshop",
    skills: [
      { id: "clarity", name: "Clarity", category: "style", fundamentals: true },
      { id: "tone", name: "Tone", category: "style", fundamentals: true },
      { id: "argument", name: "Argument", category: "rhetoric" },
      { id: "evidence", name: "Evidence", category: "rhetoric" },
      { id: "structure", name: "Structure", category: "organization" },
      { id: "revision", name: "Revision", category: "editing" },
    ],
    supportedCadenceBuckets: ["drill", "review", "recap"],
    supportsGeneratedContent: true,
    supportsGeneratedAssessment: false,
  },
  "language-lab": {
    id: "language-lab",
    label: "Language Lab",
    skills: [
      { id: "vocabulary", name: "Vocabulary", category: "lexicon", fundamentals: true },
      { id: "grammar", name: "Grammar", category: "grammar", fundamentals: true },
      { id: "listening", name: "Listening", category: "comprehension" },
      { id: "reading", name: "Reading", category: "comprehension" },
      { id: "speaking", name: "Speaking", category: "production" },
      { id: "writing", name: "Writing", category: "production" },
    ],
    supportedCadenceBuckets: ["drill", "review", "recap"],
    supportsGeneratedContent: true,
    supportsGeneratedAssessment: false,
  },
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

function withPolicy(overrides: Partial<TrackPolicyV4>): TrackPolicyV4 {
  const base = basePolicy();
  return {
    ...base,
    ...overrides,
    scope: { ...base.scope, ...(overrides.scope ?? {}) },
    allocation: { ...base.allocation, ...(overrides.allocation ?? {}) },
    pacing: { ...base.pacing, ...(overrides.pacing ?? {}) },
    sessionComposition: { ...base.sessionComposition, ...(overrides.sessionComposition ?? {}) },
    difficulty: { ...base.difficulty, ...(overrides.difficulty ?? {}) },
    progression: { ...base.progression, ...(overrides.progression ?? {}) },
    review: { ...base.review, ...(overrides.review ?? {}) },
    adaptation: { ...base.adaptation, ...(overrides.adaptation ?? {}) },
    cadence: overrides.cadence ?? base.cadence,
    contentSource: { ...base.contentSource, ...(overrides.contentSource ?? {}) },
  };
}

interface CaseConfig {
  intentId: string;
  domainId: TrackV4DomainId;
  policyFamilies: TrackBenchmarkCaseV4["policyFamilies"];
  requests: string[];
  goldPolicy?: TrackPolicyV4;
  acceptableEquivalentPolicies?: TrackPolicyV4[];
  runtimeScenarios?: RuntimeScenarioV4[];
  unsupportedReason?: string;
}

function makeCase(
  benchmarkClass: TrackBenchmarkCaseV4["benchmarkClass"],
  expectedOutcome: TrackV4HandlingOutcome,
  config: CaseConfig,
): TrackBenchmarkCaseV4 {
  return {
    intentId: config.intentId,
    domainId: config.domainId,
    benchmarkClass,
    policyFamilies: config.policyFamilies,
    naturalLanguageRequests: config.requests,
    goldPolicy: config.goldPolicy,
    acceptableEquivalentPolicies: config.acceptableEquivalentPolicies,
    clarificationExpected: expectedOutcome === "clarify",
    repairAllowed: expectedOutcome === "repaired" || expectedOutcome === "clarify",
    expectedOutcome,
    runtimeScenarios: config.runtimeScenarios,
    unsupportedReason: config.unsupportedReason,
  };
}

function supportedCase(config: CaseConfig): TrackBenchmarkCaseV4 {
  return makeCase("supported", "compiled", config);
}

function ambiguousCase(config: CaseConfig): TrackBenchmarkCaseV4 {
  return makeCase("ambiguous", "clarify", config);
}

function repairableCase(config: CaseConfig): TrackBenchmarkCaseV4 {
  return makeCase("repairable", "repaired", config);
}

function unsupportedCase(config: CaseConfig): TrackBenchmarkCaseV4 {
  return makeCase("unsupported", "reject", config);
}

function generatedFallbackScenario(): RuntimeScenarioV4 {
  return {
    id: "generated-fallback-seed-low",
    description: "Generated content should only appear after the pool is marked low.",
    trace: [
      { sessionIndex: 1, completed: true, outcomes: [], seedPoolLow: false },
      { sessionIndex: 2, completed: true, outcomes: [], seedPoolLow: true },
    ],
    invariants: [{ kind: "generation_only_when_allowed" }],
  };
}

function failureBackoffScenario(skillId: string): RuntimeScenarioV4 {
  return {
    id: "push-and-backoff-reacts-to-struggle",
    description: "After repeated failures, difficulty should reduce within one session.",
    trace: [
      { sessionIndex: 1, completed: true, outcomes: [{ skillId, difficultyBand: "medium", result: "fail", score: 0 }] },
      { sessionIndex: 2, completed: true, outcomes: [{ skillId, difficultyBand: "medium", result: "fail", score: 0 }] },
      { sessionIndex: 3, completed: true, outcomes: [{ skillId, difficultyBand: "medium", result: "fail", score: 0 }] },
    ],
    invariants: [{ kind: "difficulty_reduces_after_failure_streak", bySession: 4 }],
  };
}

function cleanStreakScenario(skillId: string): RuntimeScenarioV4 {
  return {
    id: "clean-streak-advances-difficulty",
    description: "After repeated success, difficulty should increase within one session.",
    trace: [
      { sessionIndex: 1, completed: true, outcomes: [{ skillId, difficultyBand: "easy", result: "success", score: 1 }] },
      { sessionIndex: 2, completed: true, outcomes: [{ skillId, difficultyBand: "easy", result: "success", score: 1 }] },
      { sessionIndex: 3, completed: true, outcomes: [{ skillId, difficultyBand: "easy", result: "success", score: 1 }] },
    ],
    invariants: [{ kind: "difficulty_increases_after_clean_streak", bySession: 4 }],
  };
}

function overdueLoadScenario(skillId: string): RuntimeScenarioV4 {
  return {
    id: "overdue-review-overload",
    description: "When overdue load spikes, review share should dominate the next session.",
    trace: [
      { sessionIndex: 1, completed: true, outcomes: [{ skillId, difficultyBand: "medium", result: "success", score: 1 }], overdueCount: 1 },
      { sessionIndex: 2, completed: true, outcomes: [{ skillId, difficultyBand: "medium", result: "success", score: 1 }], overdueCount: 7 },
    ],
    invariants: [{ kind: "review_share_increases_after_overdue_load", bySession: 3, minimumReviewShare: 0.75 }],
  };
}

function weekendPacingScenario(skillId: string): RuntimeScenarioV4 {
  return {
    id: "multi-week-pacing",
    description: "Weekend sessions should remain longer than weekday sessions over a multi-week trace.",
    trace: [
      { sessionIndex: 1, completed: true, outcomes: [{ skillId, difficultyBand: "medium", result: "success", score: 1 }] },
      { sessionIndex: 7, completed: true, outcomes: [{ skillId, difficultyBand: "medium", result: "success", score: 1 }] },
      { sessionIndex: 8, completed: true, outcomes: [{ skillId, difficultyBand: "medium", result: "success", score: 1 }] },
      { sessionIndex: 14, completed: true, outcomes: [{ skillId, difficultyBand: "medium", result: "success", score: 1 }] },
    ],
    invariants: [
      { kind: "weekend_minutes_exceed_weekday_minutes", weekdaySession: 2, weekendSession: 8 },
      { kind: "time_budget_respected" },
    ],
  };
}

const codingCases: TrackBenchmarkCaseV4[] = [
  supportedCase({
    intentId: "dsa-graphs-only",
    domainId: "coding-interview-patterns",
    policyFamilies: ["scope"],
    requests: ["Focus on graphs only"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["graphs"], excludeSkillIds: [], includeCategories: ["graphs"], excludeCategories: [] },
    }),
  }),
  supportedCase({
    intentId: "dsa-graphs-trees-weighted",
    domainId: "coding-interview-patterns",
    policyFamilies: ["scope", "allocation"],
    requests: ["70% graphs 30% trees"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["graphs", "trees"], excludeSkillIds: [], includeCategories: ["graphs", "trees"], excludeCategories: [] },
      allocation: { skillWeights: { graphs: 0.7, trees: 0.3 } },
    }),
  }),
  supportedCase({
    intentId: "dsa-weekday-weekend-budget",
    domainId: "coding-interview-patterns",
    policyFamilies: ["pacing"],
    requests: ["15 minute weekdays, 30 minute weekends"],
    goldPolicy: withPolicy({
      pacing: { weekdayMinutes: 15, weekendMinutes: 30, maxDailyMinutes: 30 },
    }),
    runtimeScenarios: [weekendPacingScenario("graphs")],
  }),
  supportedCase({
    intentId: "dsa-sessions-per-week",
    domainId: "coding-interview-patterns",
    policyFamilies: ["pacing"],
    requests: ["4 sessions a week"],
    goldPolicy: withPolicy({
      pacing: { sessionsPerWeek: 4 },
    }),
  }),
  supportedCase({
    intentId: "dsa-more-review-than-new",
    domainId: "coding-interview-patterns",
    policyFamilies: ["session_composition", "review"],
    requests: ["More review than new problems"],
    goldPolicy: withPolicy({
      sessionComposition: { reviewShare: 0.7, newShare: 0.3 },
      review: { scheduler: "sm5", aggressiveness: "balanced", interleaveOldAndNew: true },
    }),
  }),
  supportedCase({
    intentId: "dsa-start-easy-then-medium",
    domainId: "coding-interview-patterns",
    policyFamilies: ["difficulty"],
    requests: ["Start easy then move to medium"],
    goldPolicy: withPolicy({
      difficulty: {
        mode: "staged",
        stages: [
          { afterSessions: 0, targetBand: "easy" },
          { afterSessions: 4, maxBand: "medium" },
        ],
      },
    }),
  }),
  supportedCase({
    intentId: "dsa-fundamentals-before-advanced",
    domainId: "coding-interview-patterns",
    policyFamilies: ["progression", "scope"],
    requests: ["Fundamentals before advanced"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], fundamentalsOnly: true },
      progression: { mode: "mastery_gated", prerequisitesFirst: true },
    }),
  }),
  supportedCase({
    intentId: "dsa-aggressive-review",
    domainId: "coding-interview-patterns",
    policyFamilies: ["review"],
    requests: ["Be aggressive about review and always include overdue material"],
    goldPolicy: withPolicy({
      review: { scheduler: "sm5", aggressiveness: "aggressive", includeOverdueEverySession: true },
    }),
  }),
  supportedCase({
    intentId: "dsa-mock-cadence",
    domainId: "coding-interview-patterns",
    policyFamilies: ["cadence", "session_composition"],
    requests: ["Every 5 sessions do a mock"],
    goldPolicy: withPolicy({
      sessionComposition: { mockShare: 0.2 },
      cadence: [{ kind: "every_n_sessions", bucket: "mock", everyNSessions: 5 }],
    }),
  }),
  supportedCase({
    intentId: "dsa-generated-fallback",
    domainId: "coding-interview-patterns",
    policyFamilies: ["content_source", "adaptation"],
    requests: ["Use generated variants only when the pool is low"],
    goldPolicy: withPolicy({
      adaptation: { onSeedPoolLow: "allow_generation" },
      contentSource: { generatedAllowed: true, generatedOnlyAsFallback: true, realItemsFirst: true },
    }),
    runtimeScenarios: [generatedFallbackScenario()],
  }),
  supportedCase({
    intentId: "dsa-generated-drills-only",
    domainId: "coding-interview-patterns",
    policyFamilies: ["content_source", "session_composition"],
    requests: ["Generated drills are okay, but not for assessment"],
    goldPolicy: withPolicy({
      sessionComposition: { drillShare: 0.4 },
      contentSource: { generatedAllowed: true, generatedForDrillsOnly: true, noGeneratedForAssessment: true },
    }),
  }),
  supportedCase({
    intentId: "dsa-seed-only",
    domainId: "coding-interview-patterns",
    policyFamilies: ["content_source"],
    requests: ["Seed only, only real catalog"],
    goldPolicy: withPolicy({
      contentSource: { seedOnly: true, generatedAllowed: false, realItemsFirst: true },
    }),
  }),
  supportedCase({
    intentId: "dsa-weekends-review",
    domainId: "coding-interview-patterns",
    policyFamilies: ["cadence"],
    requests: ["Weekends are for review"],
    goldPolicy: withPolicy({
      cadence: [{ kind: "weekend", bucket: "review" }],
    }),
  }),
  supportedCase({
    intentId: "dsa-sunday-recap",
    domainId: "coding-interview-patterns",
    policyFamilies: ["cadence", "session_composition"],
    requests: ["Every Sunday recap"],
    goldPolicy: withPolicy({
      sessionComposition: { recallShare: 0.2 },
      cadence: [{ kind: "weekday", bucket: "recap", weekday: 0 }],
    }),
  }),
  supportedCase({
    intentId: "dsa-single-topic",
    domainId: "coding-interview-patterns",
    policyFamilies: ["session_composition"],
    requests: ["Single topic sessions"],
    goldPolicy: withPolicy({
      sessionComposition: { mixedSessions: false },
    }),
  }),
  supportedCase({
    intentId: "dsa-mixed-practice",
    domainId: "coding-interview-patterns",
    policyFamilies: ["session_composition"],
    requests: ["Mixed practice"],
    goldPolicy: withPolicy({
      sessionComposition: { mixedSessions: true },
    }),
  }),
  supportedCase({
    intentId: "dsa-max-new-two",
    domainId: "coding-interview-patterns",
    policyFamilies: ["session_composition"],
    requests: ["Max 2 new"],
    goldPolicy: withPolicy({
      sessionComposition: { maxNewItemsPerSession: 2 },
    }),
  }),
  supportedCase({
    intentId: "dsa-light-intensity",
    domainId: "coding-interview-patterns",
    policyFamilies: ["pacing"],
    requests: ["Keep it light"],
    goldPolicy: withPolicy({
      pacing: { intensity: "light" },
    }),
  }),
  supportedCase({
    intentId: "dsa-intense-intensity",
    domainId: "coding-interview-patterns",
    policyFamilies: ["pacing"],
    requests: ["Go harder"],
    goldPolicy: withPolicy({
      pacing: { intensity: "intense" },
    }),
  }),
  supportedCase({
    intentId: "dsa-backoff-on-bombing",
    domainId: "coding-interview-patterns",
    policyFamilies: ["difficulty", "adaptation"],
    requests: ["Back off if I'm bombing"],
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty" },
    }),
    runtimeScenarios: [failureBackoffScenario("graphs")],
  }),
  supportedCase({
    intentId: "dsa-push-on-success",
    domainId: "coding-interview-patterns",
    policyFamilies: ["difficulty", "adaptation"],
    requests: ["Go harder if I'm cruising"],
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", pushOnSuccess: true },
      adaptation: { onCleanStreak: "advance_difficulty" },
    }),
    runtimeScenarios: [cleanStreakScenario("graphs")],
  }),
  supportedCase({
    intentId: "dsa-breadth-first",
    domainId: "coding-interview-patterns",
    policyFamilies: ["progression"],
    requests: ["Breadth first"],
    goldPolicy: withPolicy({
      progression: { mode: "breadth_first" },
    }),
  }),
  supportedCase({
    intentId: "dsa-depth-first",
    domainId: "coding-interview-patterns",
    policyFamilies: ["progression"],
    requests: ["Depth first"],
    goldPolicy: withPolicy({
      progression: { mode: "depth_first" },
    }),
  }),
  supportedCase({
    intentId: "dsa-spiral",
    domainId: "coding-interview-patterns",
    policyFamilies: ["progression"],
    requests: ["Spiral through it"],
    goldPolicy: withPolicy({
      progression: { mode: "spiral" },
    }),
  }),
  supportedCase({
    intentId: "dsa-weak-areas",
    domainId: "coding-interview-patterns",
    policyFamilies: ["scope", "allocation"],
    requests: ["Focus on weak areas"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], weakAreasOnly: true },
      allocation: { weakAreaBias: "strong" },
    }),
  }),
  supportedCase({
    intentId: "dsa-review-cap",
    domainId: "coding-interview-patterns",
    policyFamilies: ["review"],
    requests: ["Don't let reviews dominate"],
    goldPolicy: withPolicy({
      review: { scheduler: "sm5", aggressiveness: "balanced", dueReviewCap: 3 },
    }),
  }),
  supportedCase({
    intentId: "dsa-warmup",
    domainId: "coding-interview-patterns",
    policyFamilies: ["session_composition"],
    requests: ["Warmup first"],
    goldPolicy: withPolicy({
      sessionComposition: { warmup: true },
    }),
  }),
  supportedCase({
    intentId: "dsa-overdue-review-focus",
    domainId: "coding-interview-patterns",
    policyFamilies: ["adaptation", "session_composition", "review"],
    requests: ["If overdue piles up, review focus"],
    goldPolicy: withPolicy({
      sessionComposition: { reviewShare: 0.8, newShare: 0.2 },
      review: { scheduler: "sm5", aggressiveness: "balanced", includeOverdueEverySession: true },
      adaptation: { onOverdueLoad: "review_focus" },
    }),
    runtimeScenarios: [overdueLoadScenario("graphs")],
  }),
  ambiguousCase({
    intentId: "dsa-ambiguous-weak-stuff",
    domainId: "coding-interview-patterns",
    policyFamilies: ["scope", "allocation", "adaptation"],
    requests: ["Keep me mostly on weak stuff"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], weakAreasOnly: true },
      allocation: { weakAreaBias: "strong" },
      adaptation: { onRepeatedFailures: "rehab_focus" },
    }),
  }),
  ambiguousCase({
    intentId: "dsa-ambiguous-weekends-count",
    domainId: "coding-interview-patterns",
    policyFamilies: ["pacing", "session_composition"],
    requests: ["Make weekends count more"],
    goldPolicy: withPolicy({
      pacing: { weekendMinutes: 30 },
      sessionComposition: { reviewShare: 0.6 },
    }),
  }),
  ambiguousCase({
    intentId: "dsa-ambiguous-cycle",
    domainId: "coding-interview-patterns",
    policyFamilies: ["progression", "review"],
    requests: ["Cycle things back around"],
    goldPolicy: withPolicy({
      progression: { mode: "spiral" },
      review: { scheduler: "sm5", aggressiveness: "balanced", interleaveOldAndNew: true },
    }),
  }),
  ambiguousCase({
    intentId: "dsa-ambiguous-important-stuff",
    domainId: "coding-interview-patterns",
    policyFamilies: ["scope", "allocation"],
    requests: ["Stay on the important stuff"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["graphs", "trees"], excludeSkillIds: [], includeCategories: ["graphs", "trees"], excludeCategories: [] },
      allocation: { breadthVsDepth: "depth_first" },
    }),
  }),
  ambiguousCase({
    intentId: "dsa-ambiguous-turn-it-up-weekends",
    domainId: "coding-interview-patterns",
    policyFamilies: ["pacing", "difficulty"],
    requests: ["Turn it up on weekends"],
    goldPolicy: withPolicy({
      pacing: { weekendMinutes: 45 },
      difficulty: { mode: "fixed", targetBand: "hard" },
    }),
  }),
  repairableCase({
    intentId: "dsa-repair-push-dont-bury",
    domainId: "coding-interview-patterns",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    requests: ["Push me, but don't bury me"],
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
    runtimeScenarios: [failureBackoffScenario("graphs"), cleanStreakScenario("graphs")],
  }),
  repairableCase({
    intentId: "dsa-repair-honest-but-learning",
    domainId: "coding-interview-patterns",
    policyFamilies: ["difficulty", "review"],
    requests: ["Grade me honestly but let me learn"],
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", backoffOnStruggle: true, pushOnSuccess: true },
      review: { scheduler: "sm5", aggressiveness: "balanced" },
    }),
  }),
  repairableCase({
    intentId: "dsa-repair-stretch-dont-fry",
    domainId: "coding-interview-patterns",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    requests: ["Stretch me but don't fry me"],
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
  }),
  repairableCase({
    intentId: "dsa-repair-challenging-not-crushing",
    domainId: "coding-interview-patterns",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    requests: ["Keep it challenging, not crushing"],
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
  }),
  unsupportedCase({
    intentId: "dsa-unsupported-tired",
    domainId: "coding-interview-patterns",
    policyFamilies: ["difficulty"],
    requests: ["Make it easier when I'm tired"],
    unsupportedReason: "Fatigue-aware context is out of scope for deterministic track policy.",
  }),
  unsupportedCase({
    intentId: "dsa-unsupported-stress",
    domainId: "coding-interview-patterns",
    policyFamilies: ["difficulty"],
    requests: ["Match difficulty to my stress level"],
    unsupportedReason: "Stress-aware adaptation is not represented in V4 track policy.",
  }),
  unsupportedCase({
    intentId: "dsa-unsupported-sleep",
    domainId: "coding-interview-patterns",
    policyFamilies: ["pacing"],
    requests: ["Plan around my sleep"],
    unsupportedReason: "Sleep-aware pacing is outside the V4 request boundary.",
  }),
  unsupportedCase({
    intentId: "dsa-unsupported-calendar",
    domainId: "coding-interview-patterns",
    policyFamilies: ["cadence", "pacing"],
    requests: ["Adjust it by my calendar"],
    unsupportedReason: "External calendar state is not modeled in V4 track policy.",
  }),
];

const writingCases: TrackBenchmarkCaseV4[] = [
  supportedCase({
    intentId: "writing-clarity-only",
    domainId: "writing-workshop",
    policyFamilies: ["scope"],
    requests: ["Focus on clarity only"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["clarity"], excludeSkillIds: [], includeCategories: ["style"], excludeCategories: [] },
    }),
  }),
  supportedCase({
    intentId: "writing-argument-evidence-weighted",
    domainId: "writing-workshop",
    policyFamilies: ["scope", "allocation"],
    requests: ["70% argument 30% evidence"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["argument", "evidence"], excludeSkillIds: [], includeCategories: ["rhetoric"], excludeCategories: [] },
      allocation: { skillWeights: { argument: 0.7, evidence: 0.3 } },
    }),
  }),
  supportedCase({
    intentId: "writing-weekday-weekend-budget",
    domainId: "writing-workshop",
    policyFamilies: ["pacing"],
    requests: ["10 minute weekdays, 25 minute weekends"],
    goldPolicy: withPolicy({
      pacing: { weekdayMinutes: 10, weekendMinutes: 25, maxDailyMinutes: 25 },
    }),
    runtimeScenarios: [weekendPacingScenario("clarity")],
  }),
  supportedCase({
    intentId: "writing-sessions-per-week",
    domainId: "writing-workshop",
    policyFamilies: ["pacing"],
    requests: ["4 sessions a week"],
    goldPolicy: withPolicy({
      pacing: { sessionsPerWeek: 4 },
    }),
  }),
  supportedCase({
    intentId: "writing-more-review-than-new",
    domainId: "writing-workshop",
    policyFamilies: ["session_composition", "review"],
    requests: ["More review than new material"],
    goldPolicy: withPolicy({
      sessionComposition: { reviewShare: 0.7, newShare: 0.3 },
      review: { scheduler: "sm5", aggressiveness: "balanced", interleaveOldAndNew: true },
    }),
  }),
  supportedCase({
    intentId: "writing-start-easy-then-medium",
    domainId: "writing-workshop",
    policyFamilies: ["difficulty"],
    requests: ["Start easy then move to medium"],
    goldPolicy: withPolicy({
      difficulty: {
        mode: "staged",
        stages: [
          { afterSessions: 0, targetBand: "easy" },
          { afterSessions: 4, maxBand: "medium" },
        ],
      },
    }),
  }),
  supportedCase({
    intentId: "writing-fundamentals-before-advanced",
    domainId: "writing-workshop",
    policyFamilies: ["progression", "scope"],
    requests: ["Fundamentals before advanced"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], fundamentalsOnly: true },
      progression: { mode: "mastery_gated", prerequisitesFirst: true },
    }),
  }),
  supportedCase({
    intentId: "writing-aggressive-review",
    domainId: "writing-workshop",
    policyFamilies: ["review"],
    requests: ["Be aggressive about review and always include overdue material"],
    goldPolicy: withPolicy({
      review: { scheduler: "sm5", aggressiveness: "aggressive", includeOverdueEverySession: true },
    }),
  }),
  supportedCase({
    intentId: "writing-drill-cadence",
    domainId: "writing-workshop",
    policyFamilies: ["cadence", "session_composition"],
    requests: ["Every 3 sessions do a drill"],
    goldPolicy: withPolicy({
      sessionComposition: { drillShare: 0.4 },
      cadence: [{ kind: "every_n_sessions", bucket: "drill", everyNSessions: 3 }],
    }),
  }),
  supportedCase({
    intentId: "writing-generated-fallback",
    domainId: "writing-workshop",
    policyFamilies: ["content_source", "adaptation"],
    requests: ["Use generated variants only when the pool is low"],
    goldPolicy: withPolicy({
      adaptation: { onSeedPoolLow: "allow_generation" },
      contentSource: { generatedAllowed: true, generatedOnlyAsFallback: true, realItemsFirst: true },
    }),
    runtimeScenarios: [generatedFallbackScenario()],
  }),
  supportedCase({
    intentId: "writing-generated-drills-only",
    domainId: "writing-workshop",
    policyFamilies: ["content_source", "session_composition"],
    requests: ["Generated drills are okay, but not for assessment"],
    goldPolicy: withPolicy({
      sessionComposition: { drillShare: 0.4 },
      contentSource: { generatedAllowed: true, generatedForDrillsOnly: true, noGeneratedForAssessment: true },
    }),
  }),
  supportedCase({
    intentId: "writing-seed-only",
    domainId: "writing-workshop",
    policyFamilies: ["content_source"],
    requests: ["Seed only, only real catalog"],
    goldPolicy: withPolicy({
      contentSource: { seedOnly: true, generatedAllowed: false, realItemsFirst: true },
    }),
  }),
  supportedCase({
    intentId: "writing-weekends-review",
    domainId: "writing-workshop",
    policyFamilies: ["cadence"],
    requests: ["Weekends are for review"],
    goldPolicy: withPolicy({
      cadence: [{ kind: "weekend", bucket: "review" }],
    }),
  }),
  supportedCase({
    intentId: "writing-sunday-recap",
    domainId: "writing-workshop",
    policyFamilies: ["cadence", "session_composition"],
    requests: ["Every Sunday recap"],
    goldPolicy: withPolicy({
      sessionComposition: { recallShare: 0.2 },
      cadence: [{ kind: "weekday", bucket: "recap", weekday: 0 }],
    }),
  }),
  supportedCase({
    intentId: "writing-single-topic",
    domainId: "writing-workshop",
    policyFamilies: ["session_composition"],
    requests: ["Single topic sessions"],
    goldPolicy: withPolicy({
      sessionComposition: { mixedSessions: false },
    }),
  }),
  supportedCase({
    intentId: "writing-mixed-practice",
    domainId: "writing-workshop",
    policyFamilies: ["session_composition"],
    requests: ["Mixed practice"],
    goldPolicy: withPolicy({
      sessionComposition: { mixedSessions: true },
    }),
  }),
  supportedCase({
    intentId: "writing-max-new-two",
    domainId: "writing-workshop",
    policyFamilies: ["session_composition"],
    requests: ["Max 2 new"],
    goldPolicy: withPolicy({
      sessionComposition: { maxNewItemsPerSession: 2 },
    }),
  }),
  supportedCase({
    intentId: "writing-light-intensity",
    domainId: "writing-workshop",
    policyFamilies: ["pacing"],
    requests: ["Keep it light"],
    goldPolicy: withPolicy({
      pacing: { intensity: "light" },
    }),
  }),
  supportedCase({
    intentId: "writing-intense-intensity",
    domainId: "writing-workshop",
    policyFamilies: ["pacing"],
    requests: ["Go harder"],
    goldPolicy: withPolicy({
      pacing: { intensity: "intense" },
    }),
  }),
  supportedCase({
    intentId: "writing-backoff-on-bombing",
    domainId: "writing-workshop",
    policyFamilies: ["difficulty", "adaptation"],
    requests: ["Back off if I'm bombing"],
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty" },
    }),
    runtimeScenarios: [failureBackoffScenario("clarity")],
  }),
  supportedCase({
    intentId: "writing-push-on-success",
    domainId: "writing-workshop",
    policyFamilies: ["difficulty", "adaptation"],
    requests: ["Go harder if I'm cruising"],
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", pushOnSuccess: true },
      adaptation: { onCleanStreak: "advance_difficulty" },
    }),
    runtimeScenarios: [cleanStreakScenario("clarity")],
  }),
  supportedCase({
    intentId: "writing-breadth-first",
    domainId: "writing-workshop",
    policyFamilies: ["progression"],
    requests: ["Breadth first"],
    goldPolicy: withPolicy({
      progression: { mode: "breadth_first" },
    }),
  }),
  supportedCase({
    intentId: "writing-depth-first",
    domainId: "writing-workshop",
    policyFamilies: ["progression"],
    requests: ["Depth first"],
    goldPolicy: withPolicy({
      progression: { mode: "depth_first" },
    }),
  }),
  supportedCase({
    intentId: "writing-spiral",
    domainId: "writing-workshop",
    policyFamilies: ["progression"],
    requests: ["Spiral through it"],
    goldPolicy: withPolicy({
      progression: { mode: "spiral" },
    }),
  }),
  supportedCase({
    intentId: "writing-weak-areas",
    domainId: "writing-workshop",
    policyFamilies: ["scope", "allocation"],
    requests: ["Focus on weak areas"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], weakAreasOnly: true },
      allocation: { weakAreaBias: "strong" },
    }),
  }),
  supportedCase({
    intentId: "writing-review-cap",
    domainId: "writing-workshop",
    policyFamilies: ["review"],
    requests: ["Don't let reviews dominate"],
    goldPolicy: withPolicy({
      review: { scheduler: "sm5", aggressiveness: "balanced", dueReviewCap: 3 },
    }),
  }),
  supportedCase({
    intentId: "writing-warmup",
    domainId: "writing-workshop",
    policyFamilies: ["session_composition"],
    requests: ["Warmup first"],
    goldPolicy: withPolicy({
      sessionComposition: { warmup: true },
    }),
  }),
  supportedCase({
    intentId: "writing-overdue-review-focus",
    domainId: "writing-workshop",
    policyFamilies: ["adaptation", "session_composition", "review"],
    requests: ["If overdue piles up, review focus"],
    goldPolicy: withPolicy({
      sessionComposition: { reviewShare: 0.8, newShare: 0.2 },
      review: { scheduler: "sm5", aggressiveness: "balanced", includeOverdueEverySession: true },
      adaptation: { onOverdueLoad: "review_focus" },
    }),
    runtimeScenarios: [overdueLoadScenario("clarity")],
  }),
  ambiguousCase({
    intentId: "writing-ambiguous-weak-stuff",
    domainId: "writing-workshop",
    policyFamilies: ["scope", "allocation", "adaptation"],
    requests: ["Keep me mostly on weak stuff"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], weakAreasOnly: true },
      allocation: { weakAreaBias: "strong" },
      adaptation: { onRepeatedFailures: "rehab_focus" },
    }),
  }),
  ambiguousCase({
    intentId: "writing-ambiguous-weekends-count",
    domainId: "writing-workshop",
    policyFamilies: ["pacing", "session_composition"],
    requests: ["Make weekends count more"],
    goldPolicy: withPolicy({
      pacing: { weekendMinutes: 30 },
      sessionComposition: { reviewShare: 0.6 },
    }),
  }),
  ambiguousCase({
    intentId: "writing-ambiguous-cycle",
    domainId: "writing-workshop",
    policyFamilies: ["progression", "review"],
    requests: ["Cycle things back around"],
    goldPolicy: withPolicy({
      progression: { mode: "spiral" },
      review: { scheduler: "sm5", aggressiveness: "balanced", interleaveOldAndNew: true },
    }),
  }),
  ambiguousCase({
    intentId: "writing-ambiguous-important-stuff",
    domainId: "writing-workshop",
    policyFamilies: ["scope", "allocation"],
    requests: ["Stay on the important stuff"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["argument", "evidence"], excludeSkillIds: [], includeCategories: ["rhetoric"], excludeCategories: [] },
      allocation: { breadthVsDepth: "depth_first" },
    }),
  }),
  ambiguousCase({
    intentId: "writing-ambiguous-turn-it-up-weekends",
    domainId: "writing-workshop",
    policyFamilies: ["pacing", "difficulty"],
    requests: ["Turn it up on weekends"],
    goldPolicy: withPolicy({
      pacing: { weekendMinutes: 40 },
      difficulty: { mode: "fixed", targetBand: "hard" },
    }),
  }),
  repairableCase({
    intentId: "writing-repair-push-dont-bury",
    domainId: "writing-workshop",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    requests: ["Push me, but don't bury me"],
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
    runtimeScenarios: [failureBackoffScenario("clarity"), cleanStreakScenario("clarity")],
  }),
  repairableCase({
    intentId: "writing-repair-honest-but-learning",
    domainId: "writing-workshop",
    policyFamilies: ["difficulty", "review"],
    requests: ["Grade me honestly but let me learn"],
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", backoffOnStruggle: true, pushOnSuccess: true },
      review: { scheduler: "sm5", aggressiveness: "balanced" },
    }),
  }),
  repairableCase({
    intentId: "writing-repair-stretch-dont-fry",
    domainId: "writing-workshop",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    requests: ["Stretch me but don't fry me"],
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
  }),
  repairableCase({
    intentId: "writing-repair-challenging-not-crushing",
    domainId: "writing-workshop",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    requests: ["Keep it challenging, not crushing"],
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
  }),
  unsupportedCase({
    intentId: "writing-unsupported-tired",
    domainId: "writing-workshop",
    policyFamilies: ["difficulty"],
    requests: ["Make it easier when I'm tired"],
    unsupportedReason: "Fatigue-aware context is out of scope for deterministic track policy.",
  }),
  unsupportedCase({
    intentId: "writing-unsupported-stress",
    domainId: "writing-workshop",
    policyFamilies: ["difficulty"],
    requests: ["Match difficulty to my stress level"],
    unsupportedReason: "Stress-aware adaptation is not represented in V4 track policy.",
  }),
  unsupportedCase({
    intentId: "writing-unsupported-sleep",
    domainId: "writing-workshop",
    policyFamilies: ["pacing"],
    requests: ["Plan around my sleep"],
    unsupportedReason: "Sleep-aware pacing is outside the V4 request boundary.",
  }),
  unsupportedCase({
    intentId: "writing-unsupported-calendar",
    domainId: "writing-workshop",
    policyFamilies: ["cadence", "pacing"],
    requests: ["Adjust it by my calendar"],
    unsupportedReason: "External calendar state is not modeled in V4 track policy.",
  }),
];

const languageCases: TrackBenchmarkCaseV4[] = [
  supportedCase({
    intentId: "language-vocabulary-only",
    domainId: "language-lab",
    policyFamilies: ["scope"],
    requests: ["Focus on vocabulary only"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["vocabulary"], excludeSkillIds: [], includeCategories: ["lexicon"], excludeCategories: [] },
    }),
  }),
  supportedCase({
    intentId: "language-listening-speaking-weighted",
    domainId: "language-lab",
    policyFamilies: ["scope", "allocation"],
    requests: ["70% listening 30% speaking"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["listening", "speaking"], excludeSkillIds: [], includeCategories: ["comprehension", "production"], excludeCategories: [] },
      allocation: { skillWeights: { listening: 0.7, speaking: 0.3 } },
    }),
  }),
  supportedCase({
    intentId: "language-weekday-weekend-budget",
    domainId: "language-lab",
    policyFamilies: ["pacing"],
    requests: ["12 minute weekdays, 24 minute weekends"],
    goldPolicy: withPolicy({
      pacing: { weekdayMinutes: 12, weekendMinutes: 24, maxDailyMinutes: 24 },
    }),
    runtimeScenarios: [weekendPacingScenario("vocabulary")],
  }),
  supportedCase({
    intentId: "language-sessions-per-week",
    domainId: "language-lab",
    policyFamilies: ["pacing"],
    requests: ["4 sessions a week"],
    goldPolicy: withPolicy({
      pacing: { sessionsPerWeek: 4 },
    }),
  }),
  supportedCase({
    intentId: "language-more-review-than-new",
    domainId: "language-lab",
    policyFamilies: ["session_composition", "review"],
    requests: ["More review than new material"],
    goldPolicy: withPolicy({
      sessionComposition: { reviewShare: 0.7, newShare: 0.3 },
      review: { scheduler: "sm5", aggressiveness: "balanced", interleaveOldAndNew: true },
    }),
  }),
  supportedCase({
    intentId: "language-start-easy-then-medium",
    domainId: "language-lab",
    policyFamilies: ["difficulty"],
    requests: ["Start easy then move to medium"],
    goldPolicy: withPolicy({
      difficulty: {
        mode: "staged",
        stages: [
          { afterSessions: 0, targetBand: "easy" },
          { afterSessions: 4, maxBand: "medium" },
        ],
      },
    }),
  }),
  supportedCase({
    intentId: "language-fundamentals-before-advanced",
    domainId: "language-lab",
    policyFamilies: ["progression", "scope"],
    requests: ["Fundamentals before advanced"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], fundamentalsOnly: true },
      progression: { mode: "mastery_gated", prerequisitesFirst: true },
    }),
  }),
  supportedCase({
    intentId: "language-aggressive-review",
    domainId: "language-lab",
    policyFamilies: ["review"],
    requests: ["Be aggressive about review and always include overdue material"],
    goldPolicy: withPolicy({
      review: { scheduler: "sm5", aggressiveness: "aggressive", includeOverdueEverySession: true },
    }),
  }),
  supportedCase({
    intentId: "language-drill-cadence",
    domainId: "language-lab",
    policyFamilies: ["cadence", "session_composition"],
    requests: ["Every 3 sessions do a drill"],
    goldPolicy: withPolicy({
      sessionComposition: { drillShare: 0.4 },
      cadence: [{ kind: "every_n_sessions", bucket: "drill", everyNSessions: 3 }],
    }),
  }),
  supportedCase({
    intentId: "language-generated-fallback",
    domainId: "language-lab",
    policyFamilies: ["content_source", "adaptation"],
    requests: ["Use generated variants only when the pool is low"],
    goldPolicy: withPolicy({
      adaptation: { onSeedPoolLow: "allow_generation" },
      contentSource: { generatedAllowed: true, generatedOnlyAsFallback: true, realItemsFirst: true },
    }),
    runtimeScenarios: [generatedFallbackScenario()],
  }),
  supportedCase({
    intentId: "language-generated-drills-only",
    domainId: "language-lab",
    policyFamilies: ["content_source", "session_composition"],
    requests: ["Generated drills are okay, but not for assessment"],
    goldPolicy: withPolicy({
      sessionComposition: { drillShare: 0.4 },
      contentSource: { generatedAllowed: true, generatedForDrillsOnly: true, noGeneratedForAssessment: true },
    }),
  }),
  supportedCase({
    intentId: "language-seed-only",
    domainId: "language-lab",
    policyFamilies: ["content_source"],
    requests: ["Seed only, only real catalog"],
    goldPolicy: withPolicy({
      contentSource: { seedOnly: true, generatedAllowed: false, realItemsFirst: true },
    }),
  }),
  supportedCase({
    intentId: "language-weekends-review",
    domainId: "language-lab",
    policyFamilies: ["cadence"],
    requests: ["Weekends are for review"],
    goldPolicy: withPolicy({
      cadence: [{ kind: "weekend", bucket: "review" }],
    }),
  }),
  supportedCase({
    intentId: "language-sunday-recap",
    domainId: "language-lab",
    policyFamilies: ["cadence", "session_composition"],
    requests: ["Every Sunday recap"],
    goldPolicy: withPolicy({
      sessionComposition: { recallShare: 0.2 },
      cadence: [{ kind: "weekday", bucket: "recap", weekday: 0 }],
    }),
  }),
  supportedCase({
    intentId: "language-single-topic",
    domainId: "language-lab",
    policyFamilies: ["session_composition"],
    requests: ["Single topic sessions"],
    goldPolicy: withPolicy({
      sessionComposition: { mixedSessions: false },
    }),
  }),
  supportedCase({
    intentId: "language-mixed-practice",
    domainId: "language-lab",
    policyFamilies: ["session_composition"],
    requests: ["Mixed practice"],
    goldPolicy: withPolicy({
      sessionComposition: { mixedSessions: true },
    }),
  }),
  supportedCase({
    intentId: "language-max-new-two",
    domainId: "language-lab",
    policyFamilies: ["session_composition"],
    requests: ["Max 2 new"],
    goldPolicy: withPolicy({
      sessionComposition: { maxNewItemsPerSession: 2 },
    }),
  }),
  supportedCase({
    intentId: "language-light-intensity",
    domainId: "language-lab",
    policyFamilies: ["pacing"],
    requests: ["Keep it light"],
    goldPolicy: withPolicy({
      pacing: { intensity: "light" },
    }),
  }),
  supportedCase({
    intentId: "language-intense-intensity",
    domainId: "language-lab",
    policyFamilies: ["pacing"],
    requests: ["Go harder"],
    goldPolicy: withPolicy({
      pacing: { intensity: "intense" },
    }),
  }),
  supportedCase({
    intentId: "language-backoff-on-bombing",
    domainId: "language-lab",
    policyFamilies: ["difficulty", "adaptation"],
    requests: ["Back off if I'm bombing"],
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty" },
    }),
    runtimeScenarios: [failureBackoffScenario("vocabulary")],
  }),
  supportedCase({
    intentId: "language-push-on-success",
    domainId: "language-lab",
    policyFamilies: ["difficulty", "adaptation"],
    requests: ["Go harder if I'm cruising"],
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", pushOnSuccess: true },
      adaptation: { onCleanStreak: "advance_difficulty" },
    }),
    runtimeScenarios: [cleanStreakScenario("vocabulary")],
  }),
  supportedCase({
    intentId: "language-breadth-first",
    domainId: "language-lab",
    policyFamilies: ["progression"],
    requests: ["Breadth first"],
    goldPolicy: withPolicy({
      progression: { mode: "breadth_first" },
    }),
  }),
  supportedCase({
    intentId: "language-depth-first",
    domainId: "language-lab",
    policyFamilies: ["progression"],
    requests: ["Depth first"],
    goldPolicy: withPolicy({
      progression: { mode: "depth_first" },
    }),
  }),
  supportedCase({
    intentId: "language-spiral",
    domainId: "language-lab",
    policyFamilies: ["progression"],
    requests: ["Spiral through it"],
    goldPolicy: withPolicy({
      progression: { mode: "spiral" },
    }),
  }),
  supportedCase({
    intentId: "language-weak-areas",
    domainId: "language-lab",
    policyFamilies: ["scope", "allocation"],
    requests: ["Focus on weak areas"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], weakAreasOnly: true },
      allocation: { weakAreaBias: "strong" },
    }),
  }),
  supportedCase({
    intentId: "language-review-cap",
    domainId: "language-lab",
    policyFamilies: ["review"],
    requests: ["Don't let reviews dominate"],
    goldPolicy: withPolicy({
      review: { scheduler: "sm5", aggressiveness: "balanced", dueReviewCap: 3 },
    }),
  }),
  supportedCase({
    intentId: "language-warmup",
    domainId: "language-lab",
    policyFamilies: ["session_composition"],
    requests: ["Warmup first"],
    goldPolicy: withPolicy({
      sessionComposition: { warmup: true },
    }),
  }),
  supportedCase({
    intentId: "language-overdue-review-focus",
    domainId: "language-lab",
    policyFamilies: ["adaptation", "session_composition", "review"],
    requests: ["If overdue piles up, review focus"],
    goldPolicy: withPolicy({
      sessionComposition: { reviewShare: 0.8, newShare: 0.2 },
      review: { scheduler: "sm5", aggressiveness: "balanced", includeOverdueEverySession: true },
      adaptation: { onOverdueLoad: "review_focus" },
    }),
    runtimeScenarios: [overdueLoadScenario("vocabulary")],
  }),
  ambiguousCase({
    intentId: "language-ambiguous-weak-stuff",
    domainId: "language-lab",
    policyFamilies: ["scope", "allocation", "adaptation"],
    requests: ["Keep me mostly on weak stuff"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], weakAreasOnly: true },
      allocation: { weakAreaBias: "strong" },
      adaptation: { onRepeatedFailures: "rehab_focus" },
    }),
  }),
  ambiguousCase({
    intentId: "language-ambiguous-weekends-count",
    domainId: "language-lab",
    policyFamilies: ["pacing", "session_composition"],
    requests: ["Make weekends count more"],
    goldPolicy: withPolicy({
      pacing: { weekendMinutes: 30 },
      sessionComposition: { reviewShare: 0.6 },
    }),
  }),
  ambiguousCase({
    intentId: "language-ambiguous-cycle",
    domainId: "language-lab",
    policyFamilies: ["progression", "review"],
    requests: ["Cycle things back around"],
    goldPolicy: withPolicy({
      progression: { mode: "spiral" },
      review: { scheduler: "sm5", aggressiveness: "balanced", interleaveOldAndNew: true },
    }),
  }),
  ambiguousCase({
    intentId: "language-ambiguous-important-stuff",
    domainId: "language-lab",
    policyFamilies: ["scope", "allocation"],
    requests: ["Stay on the important stuff"],
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["grammar", "vocabulary"], excludeSkillIds: [], includeCategories: ["grammar", "lexicon"], excludeCategories: [] },
      allocation: { breadthVsDepth: "depth_first" },
    }),
  }),
  ambiguousCase({
    intentId: "language-ambiguous-turn-it-up-weekends",
    domainId: "language-lab",
    policyFamilies: ["pacing", "difficulty"],
    requests: ["Turn it up on weekends"],
    goldPolicy: withPolicy({
      pacing: { weekendMinutes: 40 },
      difficulty: { mode: "fixed", targetBand: "hard" },
    }),
  }),
  repairableCase({
    intentId: "language-repair-push-dont-bury",
    domainId: "language-lab",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    requests: ["Push me, but don't bury me"],
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
    runtimeScenarios: [failureBackoffScenario("vocabulary"), cleanStreakScenario("vocabulary")],
  }),
  repairableCase({
    intentId: "language-repair-honest-but-learning",
    domainId: "language-lab",
    policyFamilies: ["difficulty", "review"],
    requests: ["Grade me honestly but let me learn"],
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", backoffOnStruggle: true, pushOnSuccess: true },
      review: { scheduler: "sm5", aggressiveness: "balanced" },
    }),
  }),
  repairableCase({
    intentId: "language-repair-stretch-dont-fry",
    domainId: "language-lab",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    requests: ["Stretch me but don't fry me"],
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
  }),
  repairableCase({
    intentId: "language-repair-challenging-not-crushing",
    domainId: "language-lab",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    requests: ["Keep it challenging, not crushing"],
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
  }),
  unsupportedCase({
    intentId: "language-unsupported-tired",
    domainId: "language-lab",
    policyFamilies: ["difficulty"],
    requests: ["Make it easier when I'm tired"],
    unsupportedReason: "Fatigue-aware context is out of scope for deterministic track policy.",
  }),
  unsupportedCase({
    intentId: "language-unsupported-stress",
    domainId: "language-lab",
    policyFamilies: ["difficulty"],
    requests: ["Match difficulty to my stress level"],
    unsupportedReason: "Stress-aware adaptation is not represented in V4 track policy.",
  }),
  unsupportedCase({
    intentId: "language-unsupported-sleep",
    domainId: "language-lab",
    policyFamilies: ["pacing"],
    requests: ["Plan around my sleep"],
    unsupportedReason: "Sleep-aware pacing is outside the V4 request boundary.",
  }),
  unsupportedCase({
    intentId: "language-unsupported-calendar",
    domainId: "language-lab",
    policyFamilies: ["cadence", "pacing"],
    requests: ["Adjust it by my calendar"],
    unsupportedReason: "External calendar state is not modeled in V4 track policy.",
  }),
];

export const TRACK_V4_BENCHMARK_CASES: TrackBenchmarkCaseV4[] = [
  ...codingCases,
  ...writingCases,
  ...languageCases,
];

export function summarizeTrackBenchmarkCasesV4(): TrackBenchmarkSummaryV4 {
  const byClass: TrackBenchmarkSummaryV4["byClass"] = {
    supported: 0,
    ambiguous: 0,
    repairable: 0,
    unsupported: 0,
  };
  const byDomain: TrackBenchmarkSummaryV4["byDomain"] = {
    "coding-interview-patterns": 0,
    "writing-workshop": 0,
    "language-lab": 0,
  };

  for (const entry of TRACK_V4_BENCHMARK_CASES) {
    byClass[entry.benchmarkClass] += 1;
    byDomain[entry.domainId] += 1;
  }

  return {
    total: TRACK_V4_BENCHMARK_CASES.length,
    byClass,
    byDomain,
  };
}
