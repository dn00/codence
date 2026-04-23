import { expectTypeOf } from "vitest";
import type {
  LearnspaceConfig,
  ProtocolStep,
  SeedItem,
  SkillDefinition,
  TagWeights,
  TestCase,
} from "./config-types.js";
import {
  getBuiltInLearnspace,
  getBuiltInLearnspaceIds,
} from "./registry.js";
import {
  config as codingInterviewConfig,
  seedItems as codingInterviewSeedItems,
} from "./coding-interview-patterns.js";

describe("built-in learnspaces", () => {
  test("AC-1 exports LearnspaceConfig and supporting discriminated types for downstream imports", () => {
    const loaded = getBuiltInLearnspace("coding-interview-patterns");
    const firstStep = loaded.config.protocol_steps[0];
    const firstSkill = loaded.config.skills[0];
    const firstItem = loaded.seedItems[0];
    const firstTestCase = firstItem.test_cases[0];

    expectTypeOf(codingInterviewConfig).toMatchTypeOf<LearnspaceConfig>();
    expectTypeOf(firstStep).toMatchTypeOf<ProtocolStep>();
    expectTypeOf(firstSkill).toMatchTypeOf<SkillDefinition>();
    expectTypeOf(firstItem).toMatchTypeOf<SeedItem>();
    expectTypeOf(firstTestCase).toMatchTypeOf<TestCase>();
    expectTypeOf(loaded.config.tag_weights).toMatchTypeOf<TagWeights>();

    expect(firstStep).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        label: expect.any(String),
        instruction: expect.any(String),
        agent_prompt: expect.any(String),
        editor: expect.stringMatching(/^(text|code|readonly)$/),
        layout: expect.stringMatching(/^(inline|full)$/),
      }),
    );
  });

  test("AC-2 loads the coding-interview-patterns learnspace by canonical ID", () => {
    const ids = getBuiltInLearnspaceIds();
    const loaded = getBuiltInLearnspace("coding-interview-patterns");

    expect(ids).toEqual(["coding-interview-patterns"]);
    expect(loaded.config).toBe(codingInterviewConfig);
    expect(loaded.seedItems).toBe(codingInterviewSeedItems);
    expect(loaded.config.id).toBe("coding-interview-patterns");
    expect(loaded.familyId).toBe("dsa");
    expect(loaded.schedulerId).toBe("sm5");
  });

  test("AC-3 ships NeetCode 150 seed set spanning multiple skills", () => {
    const skillIds = new Set<string>();

    expect(codingInterviewSeedItems.length).toBeGreaterThanOrEqual(100);

    for (const item of codingInterviewSeedItems) {
      expect(item).toEqual(
        expect.objectContaining({
          slug: expect.any(String),
          title: expect.any(String),
          prompt: expect.any(String),
          function_name: expect.any(String),
          difficulty: expect.stringMatching(/^(easy|medium|hard)$/),
          reference_solution: expect.any(String),
        }),
      );
      expect(item.skill_ids.length).toBeGreaterThan(0);

      for (const skillId of item.skill_ids) {
        skillIds.add(skillId);
      }
    }

    expect(skillIds.size).toBeGreaterThanOrEqual(10);
  });

  test("EC-1 tag_weights can be empty", () => {
    expect(codingInterviewConfig.tag_weights).toEqual({});
  });

  test("ERR-1 throws a clear error for unknown built-in learnspace IDs", () => {
    expect(() => getBuiltInLearnspace("missing-learnspace")).toThrow(
      "Unknown built-in learnspace: missing-learnspace",
    );
  });
});
