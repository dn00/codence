import type { LearnspaceFamilyId, LearnspaceFamilyDefinition } from "./types.js";
import { dsaFamily } from "./dsa-family.js";

const familyRegistry: Record<LearnspaceFamilyId, LearnspaceFamilyDefinition> = {
  dsa: dsaFamily,
};

export function getLearnspaceFamily(id: LearnspaceFamilyId): LearnspaceFamilyDefinition {
  const family = familyRegistry[id];
  if (!family) {
    throw new Error(`Unknown learnspace family: ${id}`);
  }
  return family;
}

export function listLearnspaceFamilies(): LearnspaceFamilyDefinition[] {
  return Object.values(familyRegistry);
}
