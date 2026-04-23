import type { LearnspaceConfig, SeedItem } from "./config-types.js";
import type { LearnspaceFamilyId } from "../families/types.js";
import type { SchedulerId } from "../core/schedulers/types.js";
import {
  config as codingInterviewConfig,
  seedItems as codingInterviewSeedItems,
} from "./coding-interview-patterns.js";

export interface BuiltInLearnspace {
  familyId: LearnspaceFamilyId;
  schedulerId: SchedulerId;
  config: LearnspaceConfig;
  seedItems: SeedItem[];
}

// `beginner-patterns` is a stub (no seed items, no category layer).
// Kept in-tree at `./beginner-patterns.ts` for future flesh-out but not
// registered — shipping a learnspace the user can't practice in would
// be worse than not offering it at all.
const builtInLearnspaces: Record<string, BuiltInLearnspace> = {
  "coding-interview-patterns": {
    familyId: "dsa",
    schedulerId: "sm5",
    config: codingInterviewConfig,
    seedItems: codingInterviewSeedItems,
  },
};

export function getBuiltInLearnspace(id: string): BuiltInLearnspace {
  const learnspace = builtInLearnspaces[id];
  if (!learnspace) {
    throw new Error(`Unknown built-in learnspace: ${id}`);
  }
  return learnspace;
}

export function getBuiltInLearnspaceIds(): string[] {
  return Object.keys(builtInLearnspaces);
}
