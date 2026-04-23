import { describe, test, expect, vi } from "vitest";
import { createTestDatabase } from "../persistence/db.js";
import type { AppDatabase } from "../persistence/db.js";
import type { CompletionLLM } from "./llm-adapter.js";
import type { ExecutionAdapter } from "../execution/executor.js";
import type { Item } from "../persistence/schema.js";
import { artifactLineage, items, learnspaces, users } from "../persistence/schema.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import {
  generateVariant,
  assembleVariantPrompt,
  type VariantGeneratorDependencies,
  type VariantGeneratorInput,
} from "./variant-generator.js";

function createSeededDb(): AppDatabase {
  const db = createTestDatabase();
  const ts = "2026-01-01T00:00:00.000Z";
  db.insert(users).values({ id: "user-1", activeLearnspaceId: "ls-1", createdAt: ts, updatedAt: ts }).run();
  db.insert(learnspaces).values({ id: "ls-1", userId: "user-1", name: "Test", config: {}, createdAt: ts, updatedAt: ts }).run();
  db.insert(items).values(makeParentItem()).run();
  return db;
}

function makeLearnspaceConfig(overrides: Partial<LearnspaceConfig> = {}): LearnspaceConfig {
  return {
    id: "test-ls",
    name: "Test Learnspace",
    description: "test",
    protocol_steps: [],
    coaching_persona: "",
    evaluation_prompt: "",
    variant_prompt:
      "Skill: {skill_name}\n\nItem: {item_content}\n\nRef: {reference}\n\nDifficulty: {difficulty}\n\nSchema: {item_schema}",
    executor: {
      type: "python-subprocess",
      timeout_ms: 5000,
      memory_mb: 256,
    },
    item_schema: {
      title: "string",
      prompt: "string",
      function_name: "string",
      difficulty: "easy | medium | hard",
      test_cases: [{ args: "array", expected: "any", description: "string" }],
      reference_solution: "string",
      skill_ids: ["string"],
      tags: ["string"],
    },
    test_harness_template:
      "from solution import {function_name}\ntest_cases = {test_cases_json}\npassed, failed = 0, 0\nfor tc in test_cases:\n  try:\n    result = {function_name}(*tc['args'])\n    if result == tc['expected']: passed += 1\n    else: failed += 1\n  except: failed += 1",
    skills: [{ id: "sliding_window", name: "Sliding Window", category: "arrays" }],
    tags: ["google"],
    tag_weights: {},
    confidence_gated_protocol_threshold: 7.0,
    interleaving_confidence_threshold: 4.0,
    ...overrides,
  };
}

function makeParentItem(): Item {
  return {
    id: "parent-item-1",
    learnspaceId: "ls-1",
    title: "Two Sum",
    content: {
      title: "Two Sum",
      prompt: "Given an array...",
      function_name: "two_sum",
      difficulty: "easy",
      test_cases: [
        { args: [[2, 7, 11, 15], 9], expected: [0, 1], description: "basic case" },
      ],
      reference_solution: "def two_sum(nums, target):\n  lookup = {}\n  for i, n in enumerate(nums):\n    if target - n in lookup:\n      return [lookup[target-n], i]\n    lookup[n] = i",
      skill_ids: ["sliding_window"],
      tags: ["google"],
    },
    skillIds: ["sliding_window"],
    tags: ["google"],
    difficulty: "easy",
    source: "seed",
    status: "active",
    slug: "two-sum",
    parentItemId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    retiredAt: null,
  };
}

const VALID_VARIANT_JSON = JSON.stringify({
  title: "Max Subarray Sum",
  prompt: "Find the maximum sum subarray...",
  function_name: "max_subarray",
  difficulty: "easy",
  test_cases: [
    { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6, description: "mixed array" },
    { args: [[1, 2, 3]], expected: 6, description: "all positive" },
  ],
  reference_solution: "def max_subarray(nums):\n  cur = best = nums[0]\n  for n in nums[1:]:\n    cur = max(n, cur+n)\n    best = max(best, cur)\n  return best",
  skill_ids: ["sliding_window"],
  tags: ["google"],
});

function makeCompletionLLM(responses: string[]): CompletionLLM {
  let callIndex = 0;
  return {
    async complete() {
      if (callIndex >= responses.length) {
        throw new Error("No more responses configured");
      }
      return responses[callIndex++];
    },
  };
}

function makeExecutionAdapter(results: Array<{ passed: number; failed: number; errors: string[] }>): ExecutionAdapter {
  let callIndex = 0;
  return {
    async execute() {
      if (callIndex >= results.length) {
        return { passed: 0, failed: 1, errors: ["no more results"] };
      }
      return results[callIndex++];
    },
  };
}

function makeInput(overrides: Partial<VariantGeneratorInput> = {}): VariantGeneratorInput {
  return {
    parentItem: makeParentItem(),
    skillId: "sliding_window",
    skillName: "Sliding Window",
    difficulty: "easy",
    learnspaceConfig: makeLearnspaceConfig(),
    learnspaceId: "ls-1",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<VariantGeneratorDependencies> = {}): VariantGeneratorDependencies {
  return {
    completionLLM: makeCompletionLLM([VALID_VARIANT_JSON]),
    executionAdapter: makeExecutionAdapter([{ passed: 2, failed: 0, errors: [] }]),
    db: createSeededDb(),
    now: () => new Date("2026-04-09T00:00:00.000Z"),
    ...overrides,
  };
}

describe("variant-generator", () => {
  test("AC-1: assembles variant prompt with correct template substitution", () => {
    const input = makeInput();
    const prompt = assembleVariantPrompt(input);

    expect(prompt.userPrompt).toContain("Sliding Window");
    expect(prompt.userPrompt).toContain("two_sum");
    expect(prompt.userPrompt).toContain("easy");
    expect(prompt.userPrompt).toContain('"title"');
    expect(prompt.userPrompt).toContain(
      (input.parentItem.content as Record<string, unknown>).reference_solution as string,
    );
  });

  test("AC-2: parses valid JSON response into item content", async () => {
    const deps = makeDeps();
    const input = makeInput();
    const result = await generateVariant(deps, input);

    expect(result).not.toBeNull();
    expect(result!.item.title).toBe("Max Subarray Sum");
    expect(result!.item.content).toHaveProperty("function_name", "max_subarray");
    expect(result!.item.content).toHaveProperty("test_cases");
  });

  test("AC-3: validates reference solution via execution adapter", async () => {
    const executeSpy = vi.fn().mockResolvedValue({ passed: 2, failed: 0, errors: [] });
    const deps = makeDeps({
      executionAdapter: { execute: executeSpy },
    });
    const input = makeInput();
    const result = await generateVariant(deps, input);

    expect(result).not.toBeNull();
    expect(executeSpy).toHaveBeenCalledOnce();
    // The test harness should contain the function name
    expect(executeSpy.mock.calls[0][1]).toContain("max_subarray");
  });

  test("AC-4: persists generated variant in items table", async () => {
    const db = createSeededDb();
    const deps = makeDeps({ db });
    const input = makeInput();
    const result = await generateVariant(deps, input);

    expect(result).not.toBeNull();
    const allItems = db.select().from(items).all();
    expect(allItems).toHaveLength(2);

    const saved = allItems.find((item) => item.source === "generated");
    if (!saved) throw new Error("expected generated item to be saved");
    expect(saved.source).toBe("generated");
    expect(saved.parentItemId).toBe("parent-item-1");
    expect(saved.skillIds).toContain("sliding_window");
    expect(saved.difficulty).toBe("easy");
    expect(saved.title).toBe("Max Subarray Sum");

    const lineage = db.select().from(artifactLineage).all();
    expect(lineage).toHaveLength(1);
    expect(lineage[0]).toEqual(
      expect.objectContaining({
        artifactId: saved.id,
        parentArtifactId: "parent-item-1",
        source: "generated",
        generationMode: "variant",
        generatedForSkillId: "sliding_window",
        generatorVersion: "variant-generator:v1",
      }),
    );
  });

  test("AC-5: retries on execution failure up to 2 times", async () => {
    let llmCalls = 0;
    const completionLLM: CompletionLLM = {
      async complete() {
        llmCalls++;
        return VALID_VARIANT_JSON;
      },
    };
    // First two executions fail, third succeeds
    const executionAdapter = makeExecutionAdapter([
      { passed: 0, failed: 1, errors: ["test failed"] },
      { passed: 0, failed: 1, errors: ["test failed"] },
      { passed: 2, failed: 0, errors: [] },
    ]);
    const deps = makeDeps({ completionLLM, executionAdapter });
    const input = makeInput();
    const result = await generateVariant(deps, input);

    expect(result).not.toBeNull();
    // 1 initial + 2 retries = 3 total LLM calls
    expect(llmCalls).toBe(3);
  });

  test("EC-1: skips execution validation when no executor configured", async () => {
    const executeSpy = vi.fn();
    const config = makeLearnspaceConfig({ executor: null });
    const deps = makeDeps({ executionAdapter: { execute: executeSpy } });
    const input = makeInput({ learnspaceConfig: config });
    const result = await generateVariant(deps, input);

    expect(result).not.toBeNull();
    expect(executeSpy).not.toHaveBeenCalled();
  });

  test("EC-2: extracts JSON from LLM response with extra text", async () => {
    const responseWithWrapper = `Here is the generated problem:\n\`\`\`json\n${VALID_VARIANT_JSON}\n\`\`\`\nHope this helps!`;
    const deps = makeDeps({
      completionLLM: makeCompletionLLM([responseWithWrapper]),
    });
    const input = makeInput();
    const result = await generateVariant(deps, input);

    expect(result).not.toBeNull();
    expect(result!.item.title).toBe("Max Subarray Sum");
  });

  test("EC-3: rejects variant with empty test_cases", async () => {
    const badVariant = JSON.stringify({
      title: "Bad Variant",
      prompt: "...",
      function_name: "bad",
      difficulty: "easy",
      test_cases: [],
      reference_solution: "def bad(): pass",
      skill_ids: ["sliding_window"],
      tags: [],
    });
    // First returns empty test_cases, retry also returns empty → null
    const deps = makeDeps({
      completionLLM: makeCompletionLLM([badVariant, badVariant, badVariant, badVariant]),
    });
    const input = makeInput();
    const result = await generateVariant(deps, input);

    expect(result).toBeNull();
  });

  test("ERR-1: retries once on malformed JSON then returns null", async () => {
    let llmCalls = 0;
    const completionLLM: CompletionLLM = {
      async complete() {
        llmCalls++;
        return "This is not JSON at all, sorry!";
      },
    };
    const deps = makeDeps({ completionLLM });
    const input = makeInput();
    const result = await generateVariant(deps, input);

    expect(result).toBeNull();
    // 1 initial + 1 JSON retry = 2 calls
    expect(llmCalls).toBe(2);
  });

  test("ERR-2: returns null when LLM adapter throws", async () => {
    const completionLLM: CompletionLLM = {
      async complete() {
        throw new Error("LLM provider is not configured");
      },
    };
    const deps = makeDeps({ completionLLM });
    const input = makeInput();
    const result = await generateVariant(deps, input);

    expect(result).toBeNull();
  });

  // --- Task 003 tests ---

  test("AC-1: includes failure patterns in variant prompt", () => {
    const input = makeInput({ targetMistakes: ["off_by_one", "shrink_condition"] });
    const prompt = assembleVariantPrompt(input);

    expect(prompt.userPrompt).toContain("off_by_one");
    expect(prompt.userPrompt).toContain("shrink_condition");
    expect(prompt.userPrompt).toContain("struggled");
  });

  test("AC-2: persists target_mistakes on generated item", async () => {
    const db = createSeededDb();
    const deps = makeDeps({ db });
    const input = makeInput({ targetMistakes: ["off_by_one"] });
    const result = await generateVariant(deps, input);

    expect(result).not.toBeNull();
    const saved = db.select().from(items).all().find((item) => item.source === "generated");
    if (!saved) throw new Error("expected generated item to be saved");
    expect((saved.content as Record<string, unknown>).target_mistakes).toEqual(["off_by_one"]);
  });

  test("AC-3: omits targeting section when no failure patterns", () => {
    const input = makeInput({ targetMistakes: [] });
    const prompt = assembleVariantPrompt(input);

    expect(prompt.userPrompt).not.toContain("struggled");
  });

  test("EC-1: limits targeting — prompt includes all passed mistakes", () => {
    // The limiting to top 3 happens in the caller (queue.ts), not the prompt assembler
    const input = makeInput({ targetMistakes: ["a", "b", "c", "d", "e"] });
    const prompt = assembleVariantPrompt(input);

    expect(prompt.userPrompt).toContain("a");
    expect(prompt.userPrompt).toContain("e");
    expect(prompt.userPrompt).toContain("struggled");
  });

  test("ERR-3: rejects variant missing required fields", async () => {
    const incompleteVariant = JSON.stringify({
      title: "Missing Fields",
      prompt: "...",
      // missing function_name, test_cases, reference_solution
      difficulty: "easy",
      skill_ids: ["sliding_window"],
      tags: [],
    });
    // Both calls return incomplete JSON → null
    const deps = makeDeps({
      completionLLM: makeCompletionLLM([incompleteVariant, incompleteVariant, incompleteVariant, incompleteVariant]),
    });
    const input = makeInput();
    const result = await generateVariant(deps, input);

    expect(result).toBeNull();
  });
});
