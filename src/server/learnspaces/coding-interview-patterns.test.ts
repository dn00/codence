import { describe, test, expect } from "vitest";
import { config, seedItems } from "./coding-interview-patterns.js";

describe("Seed content", () => {
  test("AC-1 has 20+ items covering all configured skills", () => {
    expect(seedItems.length).toBeGreaterThanOrEqual(20);

    const configuredSkillIds = new Set(config.skills.map((s) => s.id));
    const coveredSkillIds = new Set<string>();
    for (const item of seedItems) {
      for (const skillId of item.skill_ids) {
        coveredSkillIds.add(skillId);
      }
    }

    for (const skillId of configuredSkillIds) {
      expect(
        coveredSkillIds.has(skillId),
        `Skill "${skillId}" has no seed items`,
      ).toBe(true);
    }
  });
  test("AC-2 all items have required fields", () => {
    for (const item of seedItems) {
      expect(item.slug.length).toBeGreaterThan(0);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.prompt.length).toBeGreaterThan(0);
      expect(item.function_name.length).toBeGreaterThan(0);
      expect(["easy", "medium", "hard"]).toContain(item.difficulty);
      expect(item.skill_ids.length).toBeGreaterThan(0);
    }
  });
  test("EC-1 at least 3 skills have multiple difficulty levels", () => {
    const difficultyBySkill = new Map<string, Set<string>>();
    for (const item of seedItems) {
      const primary = item.skill_ids[0];
      if (!difficultyBySkill.has(primary)) {
        difficultyBySkill.set(primary, new Set());
      }
      difficultyBySkill.get(primary)!.add(item.difficulty);
    }

    const multiDiffSkills = [...difficultyBySkill.values()].filter((d) => d.size >= 2);
    expect(multiDiffSkills.length).toBeGreaterThanOrEqual(3);
  });
  test("ERR-1 no duplicate item titles", () => {
    const titles = seedItems.map((i) => i.title);
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });
});
