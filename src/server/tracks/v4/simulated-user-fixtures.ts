import type {
  TrackBenchmarkCaseV4,
  TrackBenchmarkSummaryV4,
  TrackPolicyV4,
  TrackV4DomainId,
  TrackV4HandlingOutcome,
} from "./benchmark-schema.js";

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

interface SimulatedUserCaseConfig {
  intentId: string;
  domainId: TrackV4DomainId;
  benchmarkClass: TrackBenchmarkCaseV4["benchmarkClass"];
  expectedOutcome: TrackV4HandlingOutcome;
  policyFamilies: TrackBenchmarkCaseV4["policyFamilies"];
  request: string;
  goldPolicy?: TrackPolicyV4;
  unsupportedReason?: string;
}

function simulatedUserCase(config: SimulatedUserCaseConfig): TrackBenchmarkCaseV4 {
  return {
    intentId: config.intentId,
    domainId: config.domainId,
    benchmarkClass: config.benchmarkClass,
    policyFamilies: config.policyFamilies,
    naturalLanguageRequests: [config.request],
    goldPolicy: config.goldPolicy,
    clarificationExpected: config.expectedOutcome === "clarify",
    repairAllowed: config.expectedOutcome === "clarify" || config.expectedOutcome === "repaired",
    expectedOutcome: config.expectedOutcome,
    unsupportedReason: config.unsupportedReason,
  };
}

export const TRACK_V4_SIMULATED_USER_CASES: TrackBenchmarkCaseV4[] = [
  simulatedUserCase({
    intentId: "sim-dsa-graphs-dodge",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["scope"],
    request: "i keep dodging graph questions, so just park me on those for a while",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["graphs"], excludeSkillIds: [], includeCategories: ["graphs"], excludeCategories: [] },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-graphs-trees-slant",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["scope", "allocation"],
    request: "maybe like a 70 30 split, graphs over trees",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["graphs", "trees"], excludeSkillIds: [], includeCategories: ["graphs", "trees"], excludeCategories: [] },
      allocation: { skillWeights: { graphs: 0.7, trees: 0.3 } },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-weekday-weekend-slack",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["pacing"],
    request: "i can probably squeeze in 15 on workdays and maybe 30 on weekends",
    goldPolicy: withPolicy({
      pacing: { weekdayMinutes: 15, weekendMinutes: 30 },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-old-stuff-heavier",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["session_composition", "review"],
    request: "stop shoveling brand new stuff at me, i need more old stuff than fresh",
    goldPolicy: withPolicy({
      sessionComposition: { reviewShare: 0.7, newShare: 0.3 },
      review: { scheduler: "sm5", aggressiveness: "balanced", interleaveOldAndNew: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-warmup-first",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["difficulty"],
    request: "start me on softer ones and don't throw mediums in until i'm settled",
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
  simulatedUserCase({
    intentId: "sim-dsa-earn-advanced",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["progression", "scope"],
    request: "don't jump me to the fancy graph stuff before i've actually locked the basics",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], fundamentalsOnly: true },
      progression: { mode: "mastery_gated", prerequisitesFirst: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-overdue-no-escape",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["review"],
    request: "if something is overdue, i don't want it disappearing on me. keep dragging it back",
    goldPolicy: withPolicy({
      review: { scheduler: "sm5", aggressiveness: "aggressive", includeOverdueEverySession: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-fake-interview-every-fifth",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["cadence", "session_composition"],
    request: "every fifth session i want a fake interview run, not just drills",
    goldPolicy: withPolicy({
      sessionComposition: { mockShare: 0.2 },
      cadence: [{ kind: "every_n_sessions", bucket: "mock", everyNSessions: 5 }],
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-real-until-dry",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["content_source", "adaptation"],
    request: "stick to the real pool unless we run it thin, then sure, synthesize fillers",
    goldPolicy: withPolicy({
      adaptation: { onSeedPoolLow: "allow_generation" },
      contentSource: { generatedAllowed: true, generatedOnlyAsFallback: true, realItemsFirst: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-back-off-spiral",
    domainId: "coding-interview-patterns",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["difficulty", "adaptation"],
    request: "if i faceplant three sessions straight, please back it off instead of doubling down",
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty" },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-shaky-stuff",
    domainId: "coding-interview-patterns",
    benchmarkClass: "ambiguous",
    expectedOutcome: "clarify",
    policyFamilies: ["scope", "allocation", "adaptation"],
    request: "can you mostly keep me on the stuff i'm shaky on",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], weakAreasOnly: true },
      allocation: { weakAreaBias: "strong" },
      adaptation: { onRepeatedFailures: "rehab_focus" },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-weekends-pull-weight",
    domainId: "coding-interview-patterns",
    benchmarkClass: "ambiguous",
    expectedOutcome: "clarify",
    policyFamilies: ["pacing", "session_composition"],
    request: "make weekends pull more weight somehow",
    goldPolicy: withPolicy({
      pacing: { weekendMinutes: 30 },
      sessionComposition: { reviewShare: 0.6 },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-push-not-wreck",
    domainId: "coding-interview-patterns",
    benchmarkClass: "repairable",
    expectedOutcome: "repaired",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    request: "push me, just don't wreck me",
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-dsa-exhausted-aware",
    domainId: "coding-interview-patterns",
    benchmarkClass: "unsupported",
    expectedOutcome: "reject",
    policyFamilies: ["difficulty"],
    request: "when i'm wiped out after work, have it quietly dial itself down",
    unsupportedReason: "Fatigue-aware context is out of scope for deterministic track policy.",
  }),

  simulatedUserCase({
    intentId: "sim-writing-clarity-hole",
    domainId: "writing-workshop",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["scope"],
    request: "my prose keeps getting muddy, so i'd rather camp on clarity for a bit",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["clarity"], excludeSkillIds: [], includeCategories: ["style"], excludeCategories: [] },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-argument-heavy",
    domainId: "writing-workshop",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["scope", "allocation"],
    request: "weight it more toward argument than evidence, like maybe 70 30",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["argument", "evidence"], excludeSkillIds: [], includeCategories: ["rhetoric"], excludeCategories: [] },
      allocation: { skillWeights: { argument: 0.7, evidence: 0.3 } },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-commute-weekend",
    domainId: "writing-workshop",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["pacing"],
    request: "i can do 10 minutes on weekdays, maybe 25 if it's a weekend and i'm not rushing",
    goldPolicy: withPolicy({
      pacing: { weekdayMinutes: 10, weekendMinutes: 25 },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-more-revision-than-new",
    domainId: "writing-workshop",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["session_composition", "review"],
    request: "i need more revisiting than fresh prompts right now",
    goldPolicy: withPolicy({
      sessionComposition: { reviewShare: 0.7, newShare: 0.3 },
      review: { scheduler: "sm5", aggressiveness: "balanced", interleaveOldAndNew: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-easy-ramp",
    domainId: "writing-workshop",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["difficulty"],
    request: "don't start with the hard prompts, ease me in and then raise the bar later",
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
  simulatedUserCase({
    intentId: "sim-writing-basics-before-fancy",
    domainId: "writing-workshop",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["progression", "scope"],
    request: "i don't want the fancy rhetoric stuff until the basics stop wobbling",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], fundamentalsOnly: true },
      progression: { mode: "mastery_gated", prerequisitesFirst: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-overdue-pulls-back",
    domainId: "writing-workshop",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["review"],
    request: "if revision items are overdue, i want them shoved back into the next session",
    goldPolicy: withPolicy({
      review: { scheduler: "sm5", aggressiveness: "aggressive", includeOverdueEverySession: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-drill-rhythm",
    domainId: "writing-workshop",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["cadence", "session_composition"],
    request: "every third session should be a straight drill block",
    goldPolicy: withPolicy({
      sessionComposition: { drillShare: 0.4 },
      cadence: [{ kind: "every_n_sessions", bucket: "drill", everyNSessions: 3 }],
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-generated-only-when-empty",
    domainId: "writing-workshop",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["content_source", "adaptation"],
    request: "use real examples first. if we run out, then make synthetic ones",
    goldPolicy: withPolicy({
      adaptation: { onSeedPoolLow: "allow_generation" },
      contentSource: { generatedAllowed: true, generatedOnlyAsFallback: true, realItemsFirst: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-back-off-bad-run",
    domainId: "writing-workshop",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["difficulty", "adaptation"],
    request: "if i'm bombing repeatedly, stop escalating and back off a notch",
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty" },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-wobbly-bits",
    domainId: "writing-workshop",
    benchmarkClass: "ambiguous",
    expectedOutcome: "clarify",
    policyFamilies: ["scope", "allocation", "adaptation"],
    request: "mostly keep me on the bits i'm wobbly at",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], weakAreasOnly: true },
      allocation: { weakAreaBias: "strong" },
      adaptation: { onRepeatedFailures: "rehab_focus" },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-weekends-heavier",
    domainId: "writing-workshop",
    benchmarkClass: "ambiguous",
    expectedOutcome: "clarify",
    policyFamilies: ["pacing", "session_composition"],
    request: "have weekends do more of the lifting",
    goldPolicy: withPolicy({
      pacing: { weekendMinutes: 30 },
      sessionComposition: { reviewShare: 0.6 },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-push-not-crush",
    domainId: "writing-workshop",
    benchmarkClass: "repairable",
    expectedOutcome: "repaired",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    request: "push me, just don't crush me with it",
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-writing-stress-aware",
    domainId: "writing-workshop",
    benchmarkClass: "unsupported",
    expectedOutcome: "reject",
    policyFamilies: ["difficulty"],
    request: "when i'm stressed out, keep the prompts gentler without me having to ask",
    unsupportedReason: "Stress-aware adaptation is not represented in V4 track policy.",
  }),

  simulatedUserCase({
    intentId: "sim-language-vocab-hole",
    domainId: "language-lab",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["scope"],
    request: "my vocab is the obvious hole, so camp there for a while",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["vocabulary"], excludeSkillIds: [], includeCategories: ["lexicon"], excludeCategories: [] },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-listening-heavier",
    domainId: "language-lab",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["scope", "allocation"],
    request: "tilt it more toward listening than speaking, something like 70 30",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: ["listening", "speaking"], excludeSkillIds: [], includeCategories: ["comprehension", "production"], excludeCategories: [] },
      allocation: { skillWeights: { listening: 0.7, speaking: 0.3 } },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-weekday-weekend-window",
    domainId: "language-lab",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["pacing"],
    request: "i can manage like 12 minutes on weekdays and maybe 24 when it's the weekend",
    goldPolicy: withPolicy({
      pacing: { weekdayMinutes: 12, weekendMinutes: 24 },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-more-review",
    domainId: "language-lab",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["session_composition", "review"],
    request: "i need more recycling than new material right now",
    goldPolicy: withPolicy({
      sessionComposition: { reviewShare: 0.7, newShare: 0.3 },
      review: { scheduler: "sm5", aggressiveness: "balanced", interleaveOldAndNew: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-easy-first",
    domainId: "language-lab",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["difficulty"],
    request: "don't start by frying me. easy first, then medium once i'm moving again",
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
  simulatedUserCase({
    intentId: "sim-language-basics-lock",
    domainId: "language-lab",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["progression", "scope"],
    request: "grammar and vocab should stop wobbling before you make it fancy",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], fundamentalsOnly: true },
      progression: { mode: "mastery_gated", prerequisitesFirst: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-overdue-comes-back",
    domainId: "language-lab",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["review"],
    request: "if review is overdue, keep dragging it back until it's handled",
    goldPolicy: withPolicy({
      review: { scheduler: "sm5", aggressiveness: "aggressive", includeOverdueEverySession: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-drill-every-third",
    domainId: "language-lab",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["cadence", "session_composition"],
    request: "make every third session a drill-heavy one",
    goldPolicy: withPolicy({
      sessionComposition: { drillShare: 0.4 },
      cadence: [{ kind: "every_n_sessions", bucket: "drill", everyNSessions: 3 }],
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-real-then-generated",
    domainId: "language-lab",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["content_source", "adaptation"],
    request: "use real material first. if the pool gets thin, then generate extras",
    goldPolicy: withPolicy({
      adaptation: { onSeedPoolLow: "allow_generation" },
      contentSource: { generatedAllowed: true, generatedOnlyAsFallback: true, realItemsFirst: true },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-back-off-when-bombing",
    domainId: "language-lab",
    benchmarkClass: "supported",
    expectedOutcome: "compiled",
    policyFamilies: ["difficulty", "adaptation"],
    request: "if i'm bombing over and over, stop ratcheting it up and back off",
    goldPolicy: withPolicy({
      difficulty: { mode: "adaptive", backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty" },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-shaky-parts",
    domainId: "language-lab",
    benchmarkClass: "ambiguous",
    expectedOutcome: "clarify",
    policyFamilies: ["scope", "allocation", "adaptation"],
    request: "keep me mostly on the parts that still feel shaky",
    goldPolicy: withPolicy({
      scope: { includeSkillIds: [], excludeSkillIds: [], includeCategories: [], excludeCategories: [], weakAreasOnly: true },
      allocation: { weakAreaBias: "strong" },
      adaptation: { onRepeatedFailures: "rehab_focus" },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-weekends-carry-more",
    domainId: "language-lab",
    benchmarkClass: "ambiguous",
    expectedOutcome: "clarify",
    policyFamilies: ["pacing", "session_composition"],
    request: "have weekends carry more of the load",
    goldPolicy: withPolicy({
      pacing: { weekendMinutes: 30 },
      sessionComposition: { reviewShare: 0.6 },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-push-not-fry",
    domainId: "language-lab",
    benchmarkClass: "repairable",
    expectedOutcome: "repaired",
    policyFamilies: ["difficulty", "adaptation", "pacing"],
    request: "push me, just don't fry me",
    goldPolicy: withPolicy({
      pacing: { intensity: "steady" },
      difficulty: { mode: "adaptive", pushOnSuccess: true, backoffOnStruggle: true },
      adaptation: { onRepeatedFailures: "reduce_difficulty", onCleanStreak: "advance_difficulty" },
    }),
  }),
  simulatedUserCase({
    intentId: "sim-language-sleep-aware",
    domainId: "language-lab",
    benchmarkClass: "unsupported",
    expectedOutcome: "reject",
    policyFamilies: ["pacing"],
    request: "if i slept badly the night before, quietly make the plan lighter",
    unsupportedReason: "Sleep-aware pacing is outside the V4 request boundary.",
  }),
];

export function summarizeSimulatedUserCasesV4(): TrackBenchmarkSummaryV4 {
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

  for (const benchmarkCase of TRACK_V4_SIMULATED_USER_CASES) {
    byClass[benchmarkCase.benchmarkClass] += 1;
    byDomain[benchmarkCase.domainId] += 1;
  }

  return {
    total: TRACK_V4_SIMULATED_USER_CASES.length,
    byClass,
    byDomain,
  };
}
