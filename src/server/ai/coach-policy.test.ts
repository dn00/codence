import { describe, test, expect } from "vitest";
import {
  COACH_ACTIONS,
  type CoachAction,
  type CoachDecision,
  isValidCoachAction,
  assessTurn,
  type AssessTurnInput,
} from "./coach-policy.js";
import { createEmptyCoachMemorySnapshot } from "./coach-memory.js";

describe("coach action policy contracts", () => {
  test("AC-1 exports typed generic coach action and decision contracts", () => {
    // CoachAction values are available as a typed array
    expect(COACH_ACTIONS.length).toBeGreaterThan(0);

    // Each action is a string
    for (const action of COACH_ACTIONS) {
      expect(typeof action).toBe("string");
    }

    // CoachDecision shape is constructible from the exported types
    const decision: CoachDecision = {
      action: "probe_understanding",
      rationale: "user seems unsure",
      targetStepId: "step-1",
    };
    expect(decision.action).toBe("probe_understanding");
    expect(decision.rationale).toBe("user seems unsure");
    expect(decision.targetStepId).toBe("step-1");

    // targetStepId can be null
    const fallback: CoachDecision = {
      action: "reflect_back",
      rationale: "summarizing progress",
      targetStepId: null,
    };
    expect(fallback.targetStepId).toBeNull();
  });

  test("AC-2 coach action values remain learnspace agnostic", () => {
    // No action should encode coding-interview-specific concepts
    const codingSpecificTerms = [
      "leetcode",
      "code_step",
      "hash_map",
      "pattern",
      "algorithm",
      "data_structure",
      "brute_force",
      "optimize",
      "complexity",
      "test_case",
      "executor",
      "compile",
      "debug",
    ];

    for (const action of COACH_ACTIONS) {
      for (const term of codingSpecificTerms) {
        expect(action).not.toContain(term);
      }
    }

    // Actions should describe generic coaching interaction intents
    const expectedActions: CoachAction[] = [
      "probe_understanding",
      "give_hint",
      "correct_mistake",
      "ask_for_specificity",
      "encourage_artifact_work",
      "redirect_focus",
      "reflect_back",
      "answer_direct_question",
    ];
    expect(COACH_ACTIONS).toEqual(expect.arrayContaining(expectedActions));
    expect(COACH_ACTIONS).toHaveLength(expectedActions.length);
  });

  test("ERR-1 unsupported coach actions are rejected before persistence", () => {
    expect(isValidCoachAction("probe_understanding")).toBe(true);
    expect(isValidCoachAction("give_hint")).toBe(true);
    expect(isValidCoachAction("answer_direct_question")).toBe(true);

    // Invalid values
    expect(isValidCoachAction("nonexistent_action")).toBe(false);
    expect(isValidCoachAction("")).toBe(false);
    expect(isValidCoachAction(null as unknown as string)).toBe(false);
    expect(isValidCoachAction(undefined as unknown as string)).toBe(false);
    expect(isValidCoachAction(42 as unknown as string)).toBe(false);
  });
});

function makeBaseInput(overrides: Partial<AssessTurnInput> = {}): AssessTurnInput {
  return {
    userMessage: "I think we need a hash map here",
    currentStepId: "approach",
    currentStep: {
      id: "approach",
      label: "Approach",
      instruction: "Name the pattern or strategy.",
      agent_prompt: "The user is choosing an approach.",
      editor: "text",
      layout: "inline",
    },
    stepDrafts: {},
    coachMemory: createEmptyCoachMemorySnapshot("skill-1"),
    sessionSummary: null,
    ...overrides,
  };
}

describe("assessTurn policy", () => {
  test("AC-1 assessTurn returns a typed coach decision from deterministic inputs", () => {
    const decision = assessTurn(makeBaseInput());

    // Returns a valid CoachDecision
    expect(decision).toHaveProperty("action");
    expect(decision).toHaveProperty("rationale");
    expect(decision).toHaveProperty("targetStepId");
    expect(typeof decision.action).toBe("string");
    expect(typeof decision.rationale).toBe("string");
    expect(isValidCoachAction(decision.action)).toBe(true);
  });

  test("AC-2 assessTurn distinguishes direct questions stuckness repeated mistakes and weak specificity", () => {
    // Direct question → answer_direct_question
    const directQ = assessTurn(makeBaseInput({ userMessage: "What is the time complexity of binary search?" }));
    expect(directQ.action).toBe("answer_direct_question");

    // Short vague response → ask_for_specificity
    const vague = assessTurn(makeBaseInput({ userMessage: "ok" }));
    expect(vague.action).toBe("ask_for_specificity");

    // Repeated mistakes via coach memory → correct_mistake
    const withMistakes = assessTurn(makeBaseInput({
      coachMemory: {
        ...createEmptyCoachMemorySnapshot("skill-1"),
        coachingPatterns: {
          ...createEmptyCoachMemorySnapshot("skill-1").coachingPatterns,
          recurringNotableMistakes: ["off_by_one", "off_by_one"],
        },
      },
    }));
    expect(withMistakes.action).toBe("correct_mistake");

    // Stuck user via session summary → give_hint
    const stuck = assessTurn(makeBaseInput({
      sessionSummary: {
        turnCount: 5,
        currentStepId: "approach",
        conversationSummary: "User has been trying approaches",
        revealedInformation: [],
        openWeakpoints: ["stuck_on_approach"],
      },
      coachMemory: {
        ...createEmptyCoachMemorySnapshot("skill-1"),
        coachingPatterns: {
          ...createEmptyCoachMemorySnapshot("skill-1").coachingPatterns,
          stuckRate: 0.8,
          latestUnderstanding: "confused",
        },
      },
    }));
    expect(stuck.action).toBe("give_hint");

    // User on artifact step with no draft → encourage_artifact_work
    const noDraft = assessTurn(makeBaseInput({
      userMessage: "I understand the approach now",
      currentStepId: "code",
      currentStep: {
        id: "code",
        label: "Code",
        instruction: "Implement your solution.",
        agent_prompt: "The user is writing code.",
        editor: "code",
        layout: "inline",
      },
      stepDrafts: {},
    }));
    expect(noDraft.action).toBe("encourage_artifact_work");
  });

  test("AC-3 assessTurn returns a deterministic fallback action for ambiguous turns", () => {
    // Ambiguous middle-of-the-road message — neither question, nor vague, nor stuck
    const ambiguous1 = assessTurn(makeBaseInput({ userMessage: "I see what you mean about that" }));
    const ambiguous2 = assessTurn(makeBaseInput({ userMessage: "I see what you mean about that" }));
    expect(ambiguous1.action).toBe(ambiguous2.action);
    expect(ambiguous1.action).toBe("probe_understanding");
  });

  test("EC-1 assessTurn works with empty coach memory for brand-new skills", () => {
    const decision = assessTurn(makeBaseInput({
      coachMemory: createEmptyCoachMemorySnapshot("brand-new-skill"),
      sessionSummary: null,
    }));

    expect(isValidCoachAction(decision.action)).toBe(true);
    expect(decision.rationale.length).toBeGreaterThan(0);
  });

  test("ERR-1 assessTurn rejects unsupported coaching step identifiers", () => {
    expect(() => assessTurn(makeBaseInput({
      currentStepId: "",
    }))).toThrow("Invalid coaching step:");

    expect(() => assessTurn(makeBaseInput({
      currentStepId: "   ",
    }))).toThrow("Invalid coaching step:");
  });
});
