import { assembleEvaluationPrompt, createLLMEvaluationService } from "./evaluation-prompt.js";
import { createStubLLMAdapter, type LLMAdapter } from "./llm-adapter.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import type { AttemptContext } from "../core/types.js";

function makeConfig(): LearnspaceConfig {
  return {
    id: "test", name: "Test", description: "test",
    familyId: "dsa",
    schedulerId: "sm5",
    builtInVersion: 1,
    protocol_steps: [
      { id: "code", label: "Code", instruction: "Implement", agent_prompt: "Help", editor: "code", layout: "inline" },
    ],
    coaching_persona: "coach",
    evaluation_prompt: "Problem: {item_title}\nSkills: {skill_names}\nWork: {work_snapshot}\nTests: {test_results}\nHistory: {messages}\nReference: {reference}",
    variant_prompt: "", executor: null, item_schema: {}, test_harness_template: "",
    skills: [{ id: "hash_map", name: "Hash Map", category: "arrays" }],
    tags: [], tag_weights: {},
    confidence_gated_protocol_threshold: 7, interleaving_confidence_threshold: 4,
  };
}

function makeAttemptContext(): AttemptContext {
  const config = makeConfig();
  return {
    attemptId: "attempt-1",
    sessionId: "session-1",
    learnspaceId: "test",
    itemId: "item-1",
    evaluationPromptTemplate: config.evaluation_prompt,
    itemTitle: "Two Sum",
    itemContent: { reference_solution: "def two_sum(): pass", prompt: "solve it" },
    referenceSolution: "def two_sum(): pass",
    protocolSteps: config.protocol_steps.map((step) => ({
      id: step.id,
      label: step.label,
      instruction: step.instruction,
      agentPrompt: step.agent_prompt,
      editor: step.editor,
    })),
    primarySkill: { id: "hash_map", name: "Hash Map" },
    secondarySkills: [],
    stepDrafts: { code: { content: "def solve(): pass", updatedAt: "2026-04-08T12:00:00Z" } },
    testResults: { passed: 3, failed: 1, errors: [] },
    coachingTranscript: [{ role: "user", content: "help" }],
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
      tests_passed: true,
      execution_required: true,
      execution_present: true,
      step_completion_rate: 1,
    },
    executionRequired: true,
    evaluationStrictness: "balanced",
  };
}

describe("evaluation prompt assembly", () => {
  // AC-1: fills template variables
  test("fills evaluation prompt template variables", () => {
    const { userPrompt } = assembleEvaluationPrompt(makeAttemptContext());

    expect(userPrompt).toContain("Two Sum");
    expect(userPrompt).toContain("Hash Map");
    expect(userPrompt).toContain("def solve(): pass");
    expect(userPrompt).toContain("Passed: 3, Failed: 1");
    expect(userPrompt).toContain("User (turn 1): help");
    expect(userPrompt).toContain("def two_sum(): pass");
  });

  test("includes strictness and per-step schema instructions in the system prompt", () => {
    const { systemPrompt } = assembleEvaluationPrompt({
      ...makeAttemptContext(),
      evaluationStrictness: "interview_honest",
    });

    expect(systemPrompt).toContain("Evaluation mode: interview_honest");
    expect(systemPrompt).toContain("per_step_quality");
    expect(systemPrompt).toContain('Each per_step_quality value must be one of: "missing", "partial", "solid", "strong".');
  });
});

describe("LLM evaluation service", () => {
  // AC-3: parses valid JSON
  test("LLM evaluation service parses valid response", async () => {
    const validJSON = JSON.stringify({
      outcome: "clean", diagnosis: "none", severity: "minor",
      approach_correct: true,
      per_step_quality: { code: "strong" },
      mistakes: [], strengths: ["Good"], coaching_summary: "Well done.",
    });
    const adapter: LLMAdapter = {
      ...createStubLLMAdapter(),
      async complete() { return validJSON; },
    };
    const service = createLLMEvaluationService(adapter);

    const result = await service.evaluateAttempt({
      ...makeAttemptContext(),
      stepDrafts: { code: { content: "x", updatedAt: "" } },
      coachingTranscript: [],
      testResults: null,
    });

    expect(result.outcome).toBe("clean");
    expect(result.coaching_summary).toBe("Well done.");
    expect(result.per_step_quality).toEqual({ code: "strong" });
    expect(result.evaluation_source).toBe("llm");
    expect(result.retry_recovered).toBe(false);
  });

  // AC-4: falls back on invalid JSON
  test("falls back to stub on invalid JSON", async () => {
    const adapter: LLMAdapter = {
      ...createStubLLMAdapter(),
      async complete() { return "not valid json at all"; },
    };
    const service = createLLMEvaluationService(adapter);

    const result = await service.evaluateAttempt({
      ...makeAttemptContext(),
      stepDrafts: { code: { content: "work", updatedAt: "" } },
      coachingTranscript: [],
      testResults: null,
    });

    // Stub evaluator: 1 of 1 steps filled → "clean"
    expect(result.outcome).toBe("clean");
    expect(result.coaching_summary).toContain("protocol step");
    expect(result.evaluation_source).toBe("stub");
    expect(result.retry_recovered).toBe(true);
  });

  // EC-1: extra fields ignored
  test("ignores extra fields in LLM response", async () => {
    const jsonWithExtras = JSON.stringify({
      outcome: "assisted", diagnosis: "test", severity: "moderate",
      approach_correct: false, per_step_quality: { code: "partial" }, mistakes: [],
      strengths: [], coaching_summary: "Summary.",
      extra_field: "should be ignored", another: 42,
    });
    const adapter: LLMAdapter = {
      ...createStubLLMAdapter(),
      async complete() { return jsonWithExtras; },
    };
    const service = createLLMEvaluationService(adapter);

    const result = await service.evaluateAttempt({
      ...makeAttemptContext(),
      stepDrafts: {},
      coachingTranscript: [],
      testResults: null,
    });

    expect(result.outcome).toBe("assisted");
    expect((result as unknown as Record<string, unknown>).extra_field).toBeUndefined();
    expect(result.evaluation_source).toBe("llm");
  });

  // EC-2: invalid outcome falls back
  test("falls back on invalid outcome enum", async () => {
    const badOutcome = JSON.stringify({
      outcome: "partial", diagnosis: "test", severity: "moderate",
      approach_correct: true, mistakes: [],
      strengths: [], coaching_summary: "Bad.",
    });
    const adapter: LLMAdapter = {
      ...createStubLLMAdapter(),
      async complete() { return badOutcome; },
    };
    const service = createLLMEvaluationService(adapter);

    const result = await service.evaluateAttempt({
      ...makeAttemptContext(),
      stepDrafts: {},
      coachingTranscript: [],
      testResults: null,
    });

    // Falls back to stub: 0 steps filled → "failed"
    expect(result.outcome).toBe("failed");
    expect(result.evaluation_source).toBe("stub");
  });

  // ERR-1: adapter throws → fallback
  test("falls back to stub when adapter throws", async () => {
    const adapter: LLMAdapter = {
      ...createStubLLMAdapter(),
      async complete() { throw new Error("Network error"); },
    };
    const service = createLLMEvaluationService(adapter);

    const result = await service.evaluateAttempt({
      ...makeAttemptContext(),
      stepDrafts: { code: { content: "work", updatedAt: "" } },
      coachingTranscript: [],
      testResults: null,
    });

    expect(result.outcome).toBe("clean");
    expect(result.evaluation_source).toBe("stub");
    expect(result.retry_recovered).toBe(false);
  });

  test("retries once and succeeds when second response is valid JSON", async () => {
    const adapter = createStubLLMAdapter() as LLMAdapter;
    let call = 0;
    adapter.complete = async () => {
      call += 1;
      if (call === 1) return "```json\nnot valid\n```";
      return JSON.stringify({
        outcome: "assisted",
        diagnosis: "Recovered on retry",
        severity: "moderate",
        approach_correct: true,
        per_step_quality: { code: "solid" },
        mistakes: [],
        strengths: ["Recovered"],
        coaching_summary: "Recovered.",
      });
    };
    const service = createLLMEvaluationService(adapter);

    const result = await service.evaluateAttempt(makeAttemptContext());

    expect(call).toBe(2);
    expect(result.outcome).toBe("assisted");
    expect(result.evaluation_source).toBe("llm");
    expect(result.retry_recovered).toBe(true);
  });

  test("passes jsonMode to both initial and retry evaluation calls", async () => {
    const adapter = createStubLLMAdapter() as LLMAdapter;
    const optionsSeen: unknown[] = [];
    let call = 0;
    adapter.complete = async (_system, _user, options) => {
      optionsSeen.push(options ?? null);
      call += 1;
      return call === 1
        ? "not valid json"
        : JSON.stringify({
            outcome: "clean",
            diagnosis: "ok",
            severity: "minor",
            approach_correct: true,
            per_step_quality: { code: "solid" },
            mistakes: [],
            strengths: [],
            coaching_summary: "ok",
          });
    };

    const service = createLLMEvaluationService(adapter);
    const result = await service.evaluateAttempt(makeAttemptContext());

    expect(result.outcome).toBe("clean");
    expect(optionsSeen).toEqual([{ jsonMode: true }, { jsonMode: true }]);
  });

  test("strict fallback differs between balanced and interview_honest modes", async () => {
    const adapter: LLMAdapter = {
      ...createStubLLMAdapter(),
      async complete() { throw new Error("Network error"); },
    };
    const service = createLLMEvaluationService(adapter);

    const base = makeAttemptContext();
    const partialContext = {
      ...base,
      protocolSteps: [
        ...base.protocolSteps,
        {
          id: "approach",
          label: "Approach",
          instruction: "Pick a strategy",
          agentPrompt: "Guide the strategy choice",
          editor: "text" as const,
        },
      ],
      stepDrafts: { code: { content: "work", updatedAt: "" } },
      coachingTranscript: [],
      testResults: null,
    };

    const balanced = await service.evaluateAttempt({
      ...partialContext,
      evaluationStrictness: "balanced",
    });
    const interviewHonest = await service.evaluateAttempt({
      ...partialContext,
      evaluationStrictness: "interview_honest",
    });

    expect(balanced.outcome).toBe("assisted");
    expect(interviewHonest.outcome).toBe("failed");
  });
});
