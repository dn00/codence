import type { LearnspaceConfig, SeedItem } from "./config-types.js";
import { config as neetcodeConfig } from "./coding-interview-patterns.js";

export const config: LearnspaceConfig = {
  id: "beginner-patterns",
  name: "Beginner Patterns",
  description:
    "Introduction to core coding patterns — arrays, strings, and basic data structures",
  familyId: "dsa",
  schedulerId: "sm5",
  builtInVersion: 1,
  defaultDailyCap: 3,

  // Same protocol as NeetCode 150
  protocol_steps: neetcodeConfig.protocol_steps,
  coaching_persona: neetcodeConfig.coaching_persona,
  coaching_instruction: neetcodeConfig.coaching_instruction,
  evaluation_prompt: neetcodeConfig.evaluation_prompt,
  variant_prompt: neetcodeConfig.variant_prompt,
  executor: neetcodeConfig.executor,
  item_schema: neetcodeConfig.item_schema,
  test_harness_template: neetcodeConfig.test_harness_template,

  skills: [
    { id: "arrays_basics", name: "Arrays Basics", category: "arrays" },
    { id: "strings", name: "Strings", category: "strings" },
    { id: "hash_map", name: "Hash Maps", category: "arrays" },
    { id: "sorting", name: "Sorting", category: "arrays" },
    { id: "two_pointers_intro", name: "Two Pointers", category: "arrays" },
    { id: "stack_intro", name: "Stack Basics", category: "stacks" },
  ],

  tags: [],
  tag_weights: {},

  skill_progression: [
    "arrays_basics",
    "strings",
    "hash_map",
    "sorting",
    "two_pointers_intro",
    "stack_intro",
  ],

  confidence_gated_protocol_threshold: 7.0,
  interleaving_confidence_threshold: 4.0,
};

// Placeholder — no seed problems yet
export const seedItems: SeedItem[] = [];
