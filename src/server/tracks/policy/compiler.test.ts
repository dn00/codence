import { describe, expect, test } from "vitest";
import { createPolicyCompiler, createLruPolicyCache, PolicyCompilerError, type PolicyCompileInput } from "./compiler.js";
import type { CompletionLLM } from "../../ai/llm-adapter.js";
import type { TrackPolicy } from "./types.js";

function makeLLM(responses: Array<string | Error>): CompletionLLM & { calls: number } {
  let index = 0;
  const llm = {
    calls: 0,
    async complete() {
      llm.calls += 1;
      const entry = responses[Math.min(index, responses.length - 1)];
      index += 1;
      if (entry instanceof Error) throw entry;
      return entry;
    },
  };
  return llm;
}

function baseInput(overrides: Partial<PolicyCompileInput> = {}): PolicyCompileInput {
  return {
    goal: "Prep for coding interviews",
    name: "Interview Prep",
    skillIds: [],
    domainId: "coding-interview-patterns",
    trackId: "track-ls-custom-1",
    userId: "user-1",
    learnspaceId: "ls",
    now: () => new Date("2026-04-17T12:00:00.000Z"),
    ...overrides,
  };
}

function fullPolicy(overrides: Partial<TrackPolicy> = {}): TrackPolicy {
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
    difficulty: { mode: "adaptive", targetBand: "medium" },
    progression: { mode: "linear" },
    review: { scheduler: "sm5" },
    adaptation: {},
    cadence: [],
    contentSource: {},
    ...overrides,
  };
}

describe("PolicyCompiler", () => {
  test("compiled outcome produces policy + preview", async () => {
    const llm = makeLLM([JSON.stringify({ outcome: "compiled", policy: fullPolicy() })]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    const result = await compiler.compile(baseInput());
    expect(result.outcome).toBe("compiled");
    if (result.outcome !== "compiled") return;
    expect(result.preview.spec.version).toBe("2");
    expect(result.preview.program.version).toBe("2");
    expect(result.compilerVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("repaired outcome preserves repair notes from LLM", async () => {
    const llm = makeLLM([JSON.stringify({
      outcome: "repaired",
      policy: fullPolicy(),
      explanation: { repairs: [{ field: "scope", change: "added", reason: "was empty" }] },
    })]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    const result = await compiler.compile(baseInput());
    expect(result.outcome).toBe("repaired");
    if (result.outcome !== "repaired") return;
    expect(result.explanation.repairs).toEqual([
      { field: "scope", change: "added", reason: "was empty" },
    ]);
  });

  test("clarify outcome extracts question", async () => {
    const llm = makeLLM([JSON.stringify({ outcome: "clarify", question: "Daily or weekly cadence?" })]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    const result = await compiler.compile(baseInput());
    expect(result.outcome).toBe("clarify");
    if (result.outcome !== "clarify") return;
    expect(result.question).toBe("Daily or weekly cadence?");
  });

  test("reject outcome extracts reason + unsupportedFields", async () => {
    const llm = makeLLM([JSON.stringify({
      outcome: "reject",
      reason: "No support for spiral progression",
      unsupportedFields: ["progression.mode=spiral"],
    })]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    const result = await compiler.compile(baseInput());
    expect(result.outcome).toBe("reject");
    if (result.outcome !== "reject") return;
    expect(result.unsupportedFields).toEqual(["progression.mode=spiral"]);
  });

  test("compiled outcome with spiral progression downgrades to reject", async () => {
    const llm = makeLLM([JSON.stringify({
      outcome: "compiled",
      policy: fullPolicy({ progression: { mode: "spiral" } }),
    })]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    const result = await compiler.compile(baseInput());
    expect(result.outcome).toBe("reject");
    if (result.outcome !== "reject") return;
    expect(result.unsupportedFields).toContain("progression.mode=spiral");
  });

  test("compiled outcome with invalid skill id downgrades to reject", async () => {
    const llm = makeLLM([JSON.stringify({
      outcome: "compiled",
      policy: fullPolicy({
        scope: {
          includeSkillIds: ["not_a_real_skill"],
          excludeSkillIds: [],
          includeCategories: [],
          excludeCategories: [],
        },
      }),
    })]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    const result = await compiler.compile(baseInput());
    expect(result.outcome).toBe("reject");
    if (result.outcome !== "reject") return;
    expect(result.reason).toMatch(/unknown skill id/);
  });

  test("invalid JSON on first attempt retries once", async () => {
    const llm = makeLLM([
      "not json at all",
      JSON.stringify({ outcome: "compiled", policy: fullPolicy() }),
    ]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    const result = await compiler.compile(baseInput());
    expect(result.outcome).toBe("compiled");
    expect(llm.calls).toBe(2);
  });

  test("two invalid JSON responses surface compiler error", async () => {
    const llm = makeLLM(["not json", "still not json"]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    await expect(compiler.compile(baseInput())).rejects.toBeInstanceOf(PolicyCompilerError);
    expect(llm.calls).toBe(2);
  });

  test("LLM throw surfaces as compiler error on stage 'llm'", async () => {
    const llm = makeLLM([new Error("connection refused")]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    await expect(compiler.compile(baseInput())).rejects.toMatchObject({
      stage: "llm",
    });
  });

  test("cache returns same result for identical input without re-calling LLM", async () => {
    const llm = makeLLM([JSON.stringify({ outcome: "compiled", policy: fullPolicy() })]);
    const cache = createLruPolicyCache();
    const compiler = createPolicyCompiler({ completionLLM: llm, cache });
    const first = await compiler.compile(baseInput());
    const second = await compiler.compile(baseInput());
    expect(second).toEqual(first);
    expect(llm.calls).toBe(1);
  });

  test("cache treats different priorTurns as different keys", async () => {
    const llm = makeLLM([
      JSON.stringify({ outcome: "clarify", question: "first?" }),
      JSON.stringify({ outcome: "compiled", policy: fullPolicy() }),
    ]);
    const cache = createLruPolicyCache();
    const compiler = createPolicyCompiler({ completionLLM: llm, cache });

    const first = await compiler.compile(baseInput());
    const second = await compiler.compile(baseInput({
      priorTurns: [{ role: "assistant", content: "first?" }, { role: "user", content: "daily" }],
    }));

    expect(first.outcome).toBe("clarify");
    expect(second.outcome).toBe("compiled");
    expect(llm.calls).toBe(2);
  });

  test("unknown outcome string throws shape error", async () => {
    const llm = makeLLM([JSON.stringify({ outcome: "???" })]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    await expect(compiler.compile(baseInput())).rejects.toMatchObject({
      stage: "shape",
    });
  });

  test("clarify without question throws shape error", async () => {
    const llm = makeLLM([JSON.stringify({ outcome: "clarify" })]);
    const compiler = createPolicyCompiler({ completionLLM: llm });
    await expect(compiler.compile(baseInput())).rejects.toMatchObject({
      stage: "shape",
    });
  });
});
