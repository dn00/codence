import { createStubCompletionLLM, parseMetadataFromResponse, type CompletionLLM } from "./llm-adapter.js";
import {
  CoachRuntimeUnavailableError,
  createStubCoachRuntime,
  type CoachRuntime,
} from "./coach-runtime.js";
import { resolveAppServices } from "../runtime-services.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";

function makeLearnspaceConfig(): LearnspaceConfig {
  return {
    id: "test",
    name: "Test",
    description: "test",
    protocol_steps: [],
    coaching_persona: "coach",
    evaluation_prompt: "Return JSON for {item_title} with {messages}",
    variant_prompt: "",
    executor: null,
    item_schema: {},
    test_harness_template: "",
    skills: [],
    tags: [],
    tag_weights: {},
    confidence_gated_protocol_threshold: 7,
    interleaving_confidence_threshold: 4,
  };
}

describe("runtime contracts", () => {
  test("AC-1 exports separate coach and completion runtime contracts", async () => {
    const completion: CompletionLLM = createStubCompletionLLM([
      JSON.stringify({
        outcome: "clean",
        diagnosis: "none",
        severity: "minor",
        approach_correct: true,
        per_step_quality: {},
        mistakes: [],
        strengths: [],
        coaching_summary: "ok",
      }),
    ]);
    const coach: CoachRuntime = createStubCoachRuntime([
      {
        text: "Try a hash map approach.",
        metadata: {
          help_level: 0.3,
          information_revealed: ["pattern_name"],
          user_appears_stuck: false,
          user_understanding: "partial",
          notable_mistake: null,
          gave_full_solution: false,
        },
        runtimeSessionId: "runtime-1",
        backend: "stub",
      },
    ]);

    expect(typeof completion.complete).toBe("function");
    expect("sendTurn" in completion).toBe(false);

    const completionResult = await completion.complete("system", "user");
    expect(JSON.parse(completionResult)).toEqual(expect.objectContaining({ outcome: "clean" }));

    expect(typeof coach.sendTurn).toBe("function");
    expect(typeof coach.releaseSession).toBe("function");
    expect("complete" in coach).toBe(false);

    const coachResult = await coach.sendTurn({
      appSessionId: "session-1",
      systemPrompt: "You are a coach.",
      userMessage: "Help me?",
      isFirstTurn: true,
      existingRuntimeSessionId: null,
      priorHistory: [],
    });
    expect(coachResult).toEqual(expect.objectContaining({
      text: "Try a hash map approach.",
      runtimeSessionId: "runtime-1",
      backend: "stub",
    }));
  });

  test("AC-2 resolveAppServices resolves coach and completion backends independently", async () => {
    const completionLLM: CompletionLLM = {
      async complete() {
        return JSON.stringify({
          outcome: "clean",
          diagnosis: "none",
          severity: "minor",
          approach_correct: true,
          per_step_quality: {},
          mistakes: [],
          strengths: [],
          coaching_summary: "ok",
        });
      },
    };
    const coachRuntime: CoachRuntime = createStubCoachRuntime();

    const completionOnly = resolveAppServices({ completionLLM });
    expect(completionOnly.completionLLM).toBe(completionLLM);
    await expect(
      completionOnly.coachRuntime.sendTurn({
        appSessionId: "session-1",
        systemPrompt: "coach",
        userMessage: "help",
        isFirstTurn: true,
        existingRuntimeSessionId: null,
        priorHistory: [],
      }),
    ).rejects.toThrow(CoachRuntimeUnavailableError);

    const coachOnly = resolveAppServices({ coachRuntime });
    expect(coachOnly.coachRuntime).toBe(coachRuntime);
    expect(typeof coachOnly.completionLLM.complete).toBe("function");
  });

  test("EC-1 completion-only configurations do not require a coach runtime", async () => {
    const services = resolveAppServices({
      completionLLM: {
        async complete() {
          return JSON.stringify({
            outcome: "assisted",
            diagnosis: "stub evaluation",
            severity: "moderate",
            approach_correct: true,
            per_step_quality: {},
            mistakes: [],
            strengths: ["stub"],
            coaching_summary: "ok",
          });
        },
      },
    });

    const result = await services.evaluationService.evaluateAttempt({
      attemptId: "attempt-1",
      sessionId: "session-1",
      learnspaceId: "learnspace-1",
      itemId: "item-1",
      evaluationPromptTemplate: makeLearnspaceConfig().evaluation_prompt,
      itemTitle: "Two Sum",
      itemContent: {},
      referenceSolution: null,
      protocolSteps: [],
      primarySkill: { id: "hash_map", name: "Hash Map" },
      secondarySkills: [],
      stepDrafts: {},
      coachingTranscript: [],
      coachingSummary: {
        coach_turns: 0,
        avg_help_level: 0,
        max_help_level: 0,
        stuck_turns: 0,
        full_solution_turns: 0,
        latest_understanding: null,
        recurring_notable_mistakes: [],
        information_revealed: [],
      },
      attemptFeatures: {
        solution_revealed: false,
        total_help_level: 0,
        coach_turns: 0,
        tests_passed: null,
        execution_required: false,
        execution_present: false,
        step_completion_rate: 0,
      },
      executionRequired: false,
      evaluationStrictness: "balanced",
      testResults: null,
    });

    expect(result.outcome).toBe("assisted");
    await expect(
      services.coachRuntime.sendTurn({
        appSessionId: "session-1",
        systemPrompt: "coach",
        userMessage: "help",
        isFirstTurn: true,
        existingRuntimeSessionId: null,
        priorHistory: [],
      }),
    ).rejects.toThrow("Coach runtime is not configured");
  });
});

describe("metadata parsing", () => {
  test("parseMetadataFromResponse extracts metadata after delimiter", () => {
    const raw = 'Try a hash map.\n\n---METADATA---\n{"help_level":0.2,"information_revealed":[],"user_appears_stuck":false,"user_understanding":"solid","notable_mistake":null,"gave_full_solution":false}';

    const result = parseMetadataFromResponse(raw);

    expect(result.text).toBe("Try a hash map.");
    expect(result.metadata).toEqual(expect.objectContaining({
      help_level: 0.2,
      user_understanding: "solid",
    }));
  });

  test("parseMetadataFromResponse returns null metadata when no delimiter", () => {
    const result = parseMetadataFromResponse("Just a plain response.");

    expect(result.text).toBe("Just a plain response.");
    expect(result.metadata).toBeNull();
  });
});
