import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK before importing the adapter
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

// Import after mock
const { createAnthropicDirectAdapter } = await import("./anthropic-adapter.js");

describe("AnthropicDirectAdapter", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });
  test("AC-1 adapter implements LLMAdapter interface", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Hello from Claude" }],
    });

    const adapter = createAnthropicDirectAdapter({ apiKey: "test-key" });

    // coachingTurn
    const result = await adapter.coachingTurn({
      sessionKey: "s1",
      systemPrompt: "You are a coach.",
      userMessage: "Help me",
      isFirstTurn: true,
      priorHistory: [],
    });
    expect(result.text).toBe("Hello from Claude");

    // complete
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"outcome":"clean"}' }],
    });
    const completion = await adapter.complete("system", "user");
    expect(completion).toBe('{"outcome":"clean"}');

    // releaseSession (should not throw)
    await adapter.releaseSession("s1");
  });
  test("AC-3 adapter threads priorHistory into messages", async () => {
    const adapter = createAnthropicDirectAdapter({ apiKey: "test-key" });

    // First turn — response includes a metadata trailer that the parser strips.
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: 'First response\n---METADATA---\n{"help_level":0.2}' }],
    });
    const turn1 = await adapter.coachingTurn({
      sessionKey: "s1",
      systemPrompt: "Coach",
      userMessage: "Turn 1",
      isFirstTurn: true,
      priorHistory: [],
    });
    expect(turn1.text).toBe("First response");
    expect(turn1.metadata).toEqual({ help_level: 0.2 });

    // Second turn — caller passes already-cleaned priorHistory (the persistence
    // layer stores metadata-stripped assistant text).
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Second response" }],
    });
    await adapter.coachingTurn({
      sessionKey: "s1",
      systemPrompt: "Coach",
      userMessage: "Turn 2",
      isFirstTurn: false,
      priorHistory: [
        { role: "user", content: "Turn 1" },
        { role: "assistant", content: "First response" },
      ],
    });

    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0];
    expect(lastCall.messages).toEqual([
      { role: "user", content: "Turn 1" },
      { role: "assistant", content: "First response" },
      { role: "user", content: "Turn 2" },
    ]);
  });
  test("AC-4 resolveAppServices uses LLM evaluation when adapter available", async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-key";
    try {
      // Re-import runtime-services to pick up env change
      const { resolveAppServices } = await import("../runtime-services.js");
      const services = resolveAppServices();
      // The evaluation service should NOT be the stub when API key is set
      // The LLM evaluation service's evaluateAttempt is async (returns Promise)
      const result = services.evaluationService.evaluateAttempt({
        attemptId: "a1",
        sessionId: "s1",
        learnspaceId: "ls1",
        itemId: "i1",
        evaluationPromptTemplate: "",
        itemTitle: "Test",
        itemContent: {},
        referenceSolution: null,
        protocolSteps: [],
        primarySkill: { id: "skill-1", name: "Skill" },
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
      // LLM evaluation returns a Promise; stub returns a plain object
      expect(result).toBeInstanceOf(Promise);
    } finally {
      if (originalKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    }
  });


  test("systemBlocks emit cache_control on each cacheable block", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "response" }],
    });

    const adapter = createAnthropicDirectAdapter({ apiKey: "test-key" });
    await adapter.coachingTurn({
      sessionKey: "s1",
      systemPrompt: [
        { text: "Tier 1 stable", cacheable: true },
        { text: "Tier 2 session-stable", cacheable: true },
        { text: "Tier 3 volatile" },
      ],
      userMessage: "hi",
      isFirstTurn: true,
      priorHistory: [],
    });

    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0];
    expect(Array.isArray(lastCall.system)).toBe(true);
    expect(lastCall.system).toEqual([
      { type: "text", text: "Tier 1 stable", cache_control: { type: "ephemeral" } },
      { type: "text", text: "Tier 2 session-stable", cache_control: { type: "ephemeral" } },
      { type: "text", text: "Tier 3 volatile" },
    ]);
  });

  test("plain string systemPrompt stays as string (legacy path)", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "response" }],
    });

    const adapter = createAnthropicDirectAdapter({ apiKey: "test-key" });
    await adapter.coachingTurn({
      sessionKey: "s1",
      systemPrompt: "You are a coach.",
      userMessage: "hi",
      isFirstTurn: true,
      priorHistory: [],
    });

    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0];
    expect(lastCall.system).toBe("You are a coach.");
  });
  test("ERR-1 SDK error propagation", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

    const adapter = createAnthropicDirectAdapter({ apiKey: "test-key" });

    await expect(
      adapter.coachingTurn({
        sessionKey: "s1",
        systemPrompt: "Coach",
        userMessage: "Help",
        isFirstTurn: true,
        priorHistory: [],
      }),
    ).rejects.toThrow("API rate limit exceeded");
  });
});
