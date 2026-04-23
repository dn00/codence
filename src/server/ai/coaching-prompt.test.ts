import { assembleCoachingPrompt, buildCoachSessionSummary, type CoachingContext } from "./coaching-prompt.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import type { CoachMemorySnapshot } from "./coach-memory.js";

function makeConfig(): LearnspaceConfig {
  return {
    id: "coding-interview-patterns",
    name: "Neetcode 150",
    description: "test",
    protocol_steps: [
      { id: "understanding", label: "Understanding", instruction: "Restate", agent_prompt: "Help clarify", editor: "text", layout: "inline" },
      { id: "approach", label: "Approach", instruction: "Choose pattern", agent_prompt: "Guide approach choice", editor: "text", layout: "inline" },
      { id: "code", label: "Code", instruction: "Implement", agent_prompt: "Help with code", editor: "code", layout: "inline" },
    ],
    coaching_persona: "You are a coding interview coach.",
    evaluation_prompt: "",
    variant_prompt: "",
    executor: null,
    item_schema: {},
    test_harness_template: "",
    skills: [{ id: "hash_map", name: "Hash Map", category: "arrays" }],
    tags: [],
    tag_weights: {},
    confidence_gated_protocol_threshold: 7,
    interleaving_confidence_threshold: 4,
  };
}

function makeContext(overrides: Partial<CoachingContext> = {}): CoachingContext {
  return {
    learnspaceConfig: makeConfig(),
    currentStepId: "approach",
    itemTitle: "Two Sum",
    itemPrompt: "Given an array, find two numbers that add up to target.",
    stepDrafts: {
      understanding: { content: "Find pairs that sum to target", updatedAt: "2026-04-08T12:00:00Z" },
    },
    coachMemory: {
      skillId: "hash_map",
      score: 7.5,
      totalAttempts: 10,
      cleanSolves: 6,
      assistedSolves: 3,
      failedAttempts: 1,
      trend: "improving",
      topMistakes: ["off_by_one"],
      commonMistakes: [{ type: "off_by_one", count: 3, severity: "moderate" }],
      recentInsights: ["You now validate edge cases before coding."],
      coachingPatterns: {
        avgHelpLevel: 0.45,
        fullSolutionRate: 0.1,
        stuckRate: 0.2,
        latestUnderstanding: "solid",
        recurringNotableMistakes: ["off_by_one"],
      },
    },
    userMessage: "How should I handle duplicates?",
    ...overrides,
  };
}

function makeEmptyCoachMemory(): CoachMemorySnapshot {
  return {
    skillId: "hash_map",
    score: 0,
    totalAttempts: 0,
    cleanSolves: 0,
    assistedSolves: 0,
    failedAttempts: 0,
    trend: null,
    topMistakes: [],
    commonMistakes: [],
    recentInsights: [],
    coachingPatterns: {
      avgHelpLevel: 0,
      fullSolutionRate: 0,
      stuckRate: 0,
      latestUnderstanding: null,
      recurringNotableMistakes: [],
    },
  };
}

describe("coaching prompt assembly", () => {
  // AC-1: assembles system message with persona, step, item, work
  test("assembles system message with persona step item and work", () => {
    const { systemPrompt } = assembleCoachingPrompt(makeContext());

    expect(systemPrompt).toContain("You are a coding interview coach.");
    expect(systemPrompt).toContain("Current step: Approach");
    expect(systemPrompt).toContain("Guide approach choice");
    expect(systemPrompt).toContain("Item: Two Sum");
    expect(systemPrompt).toContain("Given an array");
    expect(systemPrompt).toContain("Find pairs that sum to target");
  });

  // AC-2: includes coach memory summary
  test("includes coach memory summary in system message", () => {
    const { systemPrompt } = assembleCoachingPrompt(makeContext());

    expect(systemPrompt).toContain("Confidence: 7.5/10");
    expect(systemPrompt).toContain("Attempts: 10, Clean: 6, Assisted: 3");
    expect(systemPrompt).toContain("Common mistakes: off_by_one");
    expect(systemPrompt).toContain("Trend: improving");
    expect(systemPrompt).toContain("Average help level: 0.45");
    expect(systemPrompt).toContain("Repeated coach-observed weakpoints: off_by_one");
  });

  // AC-4: appends user message
  test("appends user message as final message", () => {
    const { userMessage } = assembleCoachingPrompt(makeContext());

    expect(userMessage).toBe("How should I handle duplicates?");
  });

  // AC-5: includes metadata instruction
  test("includes metadata instruction in system prompt", () => {
    const { systemPrompt } = assembleCoachingPrompt(makeContext());

    expect(systemPrompt).toContain("---METADATA---");
    expect(systemPrompt).toContain("help_level");
    expect(systemPrompt).toContain("gave_full_solution");
  });

  // EC-1: assembled prompt never embeds conversation transcript
  test("does not embed conversation transcript in system prompt", () => {
    const { systemPrompt } = assembleCoachingPrompt(makeContext());

    // Conversation history flows through the adapter's structured messages[]
    // path via priorHistory — never baked into the system prompt.
    expect(systemPrompt).not.toContain("Previous conversation");
  });

  // EC-2: no prior attempts
  test("handles skill with no prior attempts", () => {
    const { systemPrompt } = assembleCoachingPrompt(makeContext({
      coachMemory: makeEmptyCoachMemory(),
    }));

    expect(systemPrompt).toContain("Confidence: 0/10");
    expect(systemPrompt).toContain("Common mistakes: None recorded yet");
    expect(systemPrompt).toContain("Trend: None yet");
    expect(systemPrompt).toContain("Average help level: 0");
  });

  // ERR-1: invalid step ID
  test("throws on invalid current step ID", () => {
    expect(() => assembleCoachingPrompt(makeContext({ currentStepId: "nonexistent" }))).toThrow("Invalid step ID: nonexistent");
  });

  test("AC-1 prompt includes durable weakpoints from coach memory snapshot", () => {
    const { systemPrompt } = assembleCoachingPrompt(
      makeContext({
        coachMemory: {
          ...makeContext().coachMemory,
          coachingPatterns: {
            ...makeContext().coachMemory.coachingPatterns,
            recurringNotableMistakes: ["missed duplicates", "off_by_one"],
          },
        },
      }),
    );

    expect(systemPrompt).toContain(
      "Repeated coach-observed weakpoints: missed duplicates, off_by_one",
    );
    expect(systemPrompt).toContain("Recent insights: You now validate edge cases before coding.");
  });

  test("AC-2 prompt includes persisted skill trend and help dependence", () => {
    const { systemPrompt } = assembleCoachingPrompt(makeContext());

    expect(systemPrompt).toContain("Trend: improving");
    expect(systemPrompt).toContain("Average help level: 0.45");
    expect(systemPrompt).toContain("Full-solution rate: 0.1");
    expect(systemPrompt).toContain("Stuck-turn rate: 0.2");
  });

  test("AC-3 prompt preserves current-session drafts", () => {
    const { systemPrompt } = assembleCoachingPrompt(
      makeContext({
        stepDrafts: {
          understanding: {
            content: "Need pair indices, not values.",
            updatedAt: "2026-04-08T12:00:00Z",
          },
          approach: {
            content: "Store seen values in a hash map.",
            updatedAt: "2026-04-08T12:01:00Z",
          },
        },
      }),
    );

    expect(systemPrompt).toContain("Need pair indices, not values.");
    expect(systemPrompt).toContain("Store seen values in a hash map.");
  });

  test("EC-1 prompt renders empty coach memory gracefully for brand-new skills", () => {
    const { systemPrompt } = assembleCoachingPrompt(
      makeContext({ coachMemory: makeEmptyCoachMemory() }),
    );

    expect(systemPrompt).toContain("Trend: None yet");
    expect(systemPrompt).toContain("Common mistakes: None recorded yet");
    expect(systemPrompt).toContain("Repeated coach-observed weakpoints: None recorded yet");
    expect(systemPrompt).toContain("Recent insights: None recorded yet");
  });
});

describe("coaching prompt cache tiers", () => {
  test("produces exactly three system blocks: stable, session-stable, turn-volatile", () => {
    const { systemBlocks } = assembleCoachingPrompt(makeContext());
    expect(systemBlocks).toHaveLength(3);
  });

  test("marks tier 1 and tier 2 as cacheable, tier 3 as not cacheable", () => {
    const { systemBlocks } = assembleCoachingPrompt(makeContext());
    expect(systemBlocks[0].cacheable).toBe(true);
    expect(systemBlocks[1].cacheable).toBe(true);
    expect(systemBlocks[2].cacheable).toBeFalsy();
  });

  test("tier 1 contains persona, protocol overview, and metadata instructions", () => {
    const { systemBlocks } = assembleCoachingPrompt(makeContext());
    const tier1 = systemBlocks[0].text;
    expect(tier1).toContain("You are a coding interview coach.");
    expect(tier1).toContain("Protocol steps:");
    expect(tier1).toContain("---METADATA---");
    expect(tier1).toContain("help_level");
  });

  test("tier 2 contains item content and coach memory, not persona or drafts", () => {
    const { systemBlocks } = assembleCoachingPrompt(makeContext());
    const tier2 = systemBlocks[1].text;
    expect(tier2).toContain("Item: Two Sum");
    expect(tier2).toContain("Given an array");
    expect(tier2).toContain("Confidence: 7.5/10");
    expect(tier2).toContain("Trend: improving");
    expect(tier2).not.toContain("You are a coding interview coach.");
    expect(tier2).not.toContain("Current step:");
  });

  test("tier 2 names the skill explicitly and scopes history to the pattern level", () => {
    // Regression: the prior wording "History on this skill:" sat directly
    // under "Item: Two Sum" and the coach parsed "this" as the item, reporting
    // "your 7th attempt on THIS problem" when the counts were pattern-wide.
    // The fix spells out the pattern name and the scope explicitly.
    const { systemBlocks } = assembleCoachingPrompt(makeContext());
    const tier2 = systemBlocks[1].text;
    expect(tier2).toContain('Pattern history — "Hash Map"');
    expect(tier2).toContain("across ALL problems tagged with this pattern");
    expect(tier2).toContain("NOT just the current item");
    // And the ambiguous phrasing is gone.
    expect(tier2).not.toContain("History on this skill:");
  });

  test("tier 3 contains current step and drafts, not persona or item", () => {
    const { systemBlocks } = assembleCoachingPrompt(makeContext());
    const tier3 = systemBlocks[2].text;
    expect(tier3).toContain("Current step: Approach");
    expect(tier3).toContain("App-decided coaching action:");
    expect(tier3).toContain("Guide approach choice");
    expect(tier3).toContain("Find pairs that sum to target");
    expect(tier3).not.toContain("You are a coding interview coach.");
    expect(tier3).not.toContain("Item: Two Sum");
    expect(tier3).not.toContain("Confidence:");
    // Conversation transcripts are carried via adapter messages[], not in tier 3.
    expect(tier3).not.toContain("Previous conversation");
  });

  test("tier 3 carries an app-decided coach action when provided", () => {
    const { systemBlocks } = assembleCoachingPrompt(makeContext({
      coachDecision: {
        action: "give_hint",
        rationale: "user appears stuck",
        targetStepId: "approach",
      },
    }));
    const tier3 = systemBlocks[2].text;
    expect(tier3).toContain("App-decided coaching action: give_hint");
    expect(tier3).toContain("Action rationale: user appears stuck");
  });

  test("joined systemPrompt is blocks concatenated with blank lines", () => {
    const { systemPrompt, systemBlocks } = assembleCoachingPrompt(makeContext());
    const joined = systemBlocks.map((b) => b.text).join("\n\n");
    expect(systemPrompt).toBe(joined);
  });
});

describe("coach route summary persistence (Task 001)", () => {
  test("session summaries can be regenerated from persisted transcript and drafts", () => {
    const messages = [
      { role: "user", content: "How do I start?", createdAt: "t1" },
      {
        role: "assistant",
        content: "Think about lookups.",
        createdAt: "t2",
        metadata: {
          help_level: 0.3,
          information_revealed: ["pattern_name"],
          user_appears_stuck: false,
          user_understanding: "partial",
          notable_mistake: null,
          gave_full_solution: false,
        },
      },
      { role: "user", content: "Maybe hash map?", createdAt: "t3" },
      {
        role: "assistant",
        content: "Yes, hash map works here.",
        createdAt: "t4",
        metadata: {
          help_level: 0.2,
          information_revealed: [],
          user_appears_stuck: false,
          user_understanding: "solid",
          notable_mistake: null,
          gave_full_solution: false,
        },
      },
    ];

    const summary1 = buildCoachSessionSummary(messages, "approach");
    const summary2 = buildCoachSessionSummary(messages, "approach");

    expect(summary1).toEqual(summary2);
    expect(summary1.turnCount).toBe(2);
    expect(summary1.currentStepId).toBe("approach");
    expect(summary1.revealedInformation).toContain("pattern_name");
    expect(typeof summary1.conversationSummary).toBe("string");
    expect(summary1.conversationSummary.length).toBeGreaterThan(0);
  });

  // These tests go here for the prompt-level buildCoachSessionSummary function.
  // The route-level integration test (AC-1) is in coach.test.ts.

  test("buildCoachSessionSummary collects unique revealed information", () => {
    const messages = [
      { role: "user", content: "q1", createdAt: "t1" },
      {
        role: "assistant", content: "a1", createdAt: "t2",
        metadata: { help_level: 0.3, information_revealed: ["hint_a", "hint_b"], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false },
      },
      { role: "user", content: "q2", createdAt: "t3" },
      {
        role: "assistant", content: "a2", createdAt: "t4",
        metadata: { help_level: 0.4, information_revealed: ["hint_b", "hint_c"], user_appears_stuck: false, user_understanding: "solid", notable_mistake: "off_by_one", gave_full_solution: false },
      },
    ];

    const summary = buildCoachSessionSummary(messages, "code");
    expect(summary.revealedInformation).toEqual(expect.arrayContaining(["hint_a", "hint_b", "hint_c"]));
    expect(summary.revealedInformation).toHaveLength(3);
    expect(summary.openWeakpoints).toContain("off_by_one");
  });
});
