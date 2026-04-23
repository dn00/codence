import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "../persistence/db.js";
import { getBuiltInLearnspace, getBuiltInLearnspaceIds } from "../learnspaces/registry.js";
import { ensureSystemTracks } from "../tracks/service.js";
import {
  attempts,
  categories,
  itemQueue,
  items,
  learnspaces,
  queue,
  skillConfidence,
  skills,
  users,
  type Learnspace,
  type User,
} from "../persistence/schema.js";

export const DEFAULT_USER_ID = "local-user";
export const DEFAULT_LEARNSPACE_ID = "coding-interview-patterns";

export interface SeedDependencies {
  db: AppDatabase;
  now: () => Date;
}

export interface BootstrapResult {
  userId: string;
  learnspaceId: string;
}

function toIsoString(now: () => Date): string {
  return now().toISOString();
}

function buildSeedItemId(slug: string): string {
  return `seed-${slug}`;
}

export function getDefaultDatabasePath(): string {
  return path.join(os.homedir(), ".codence", "data.db");
}

export function bootstrapDefaultLearnspace({ db, now }: SeedDependencies): BootstrapResult {
  const timestamp = toIsoString(now);
  const existingUser = db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).get();

  if (!existingUser) {
    db.insert(users)
      .values({
        id: DEFAULT_USER_ID,
        displayName: "Local User",
        activeLearnspaceId: DEFAULT_LEARNSPACE_ID,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  }

  // Bootstrap all built-in learnspaces
  for (const learnspaceId of getBuiltInLearnspaceIds()) {
    bootstrapLearnspace(db, learnspaceId, timestamp);
  }

  const user = db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).get()!;
  return {
    userId: DEFAULT_USER_ID,
    learnspaceId: user.activeLearnspaceId ?? DEFAULT_LEARNSPACE_ID,
  };
}

function bootstrapLearnspace(db: AppDatabase, learnspaceId: string, timestamp: string): void {
  const builtIn = getBuiltInLearnspace(learnspaceId);

  const existingLearnspace = db
    .select()
    .from(learnspaces)
    .where(eq(learnspaces.id, learnspaceId))
    .get();

  if (!existingLearnspace) {
    db.insert(learnspaces)
      .values({
        id: learnspaceId,
        userId: DEFAULT_USER_ID,
        name: builtIn.config.name,
        config: builtIn.config as unknown as Record<string, unknown>,
        source: "built-in",
        activeTag: null,
        interviewDate: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  } else if (existingLearnspace.source === "built-in") {
    const existingConfig = existingLearnspace.config as Record<string, unknown> | null;
    const existingBuiltInVersion =
      typeof existingConfig?.builtInVersion === "number" ? existingConfig.builtInVersion : 0;
    const nextBuiltInVersion =
      typeof builtIn.config.builtInVersion === "number" ? builtIn.config.builtInVersion : 0;
    const missingRuntimeMetadata =
      typeof existingConfig?.familyId !== "string" ||
      typeof existingConfig?.schedulerId !== "string";

    if (existingBuiltInVersion < nextBuiltInVersion || missingRuntimeMetadata) {
      db.update(learnspaces)
        .set({
          config: builtIn.config as unknown as Record<string, unknown>,
          name: builtIn.config.name,
          source: "built-in",
          updatedAt: timestamp,
        })
        .where(eq(learnspaces.id, learnspaceId))
        .run();
    }
  }

  ensureSystemTracks(db, {
    userId: DEFAULT_USER_ID,
    learnspaceId,
    now: () => new Date(timestamp),
  });

  const currentLearnspace = db
    .select()
    .from(learnspaces)
    .where(eq(learnspaces.id, learnspaceId))
    .get();

  if (currentLearnspace?.source !== "built-in") {
    return;
  }

  for (const category of builtIn.config.categories ?? []) {
    const existing = db.select().from(categories).where(eq(categories.id, category.id)).get();
    if (!existing) {
      db.insert(categories)
        .values({
          id: category.id,
          learnspaceId,
          label: category.label,
          description: category.description ?? null,
          createdAt: timestamp,
        })
        .run();
    } else if (existing.label !== category.label || (existing.description ?? null) !== (category.description ?? null)) {
      db.update(categories)
        .set({ label: category.label, description: category.description ?? null })
        .where(eq(categories.id, category.id))
        .run();
    }
  }

  for (const skill of builtIn.config.skills) {
    const existingSkill = db.select().from(skills).where(eq(skills.id, skill.id)).get();
    const categoryId = skill.categoryId ?? null;
    if (!existingSkill) {
      db.insert(skills)
        .values({
          id: skill.id,
          learnspaceId: learnspaceId,
          name: skill.name,
          category: skill.category,
          categoryId,
          createdAt: timestamp,
        })
        .run();
    } else if (
      existingSkill.name !== skill.name
      || existingSkill.category !== skill.category
      || existingSkill.categoryId !== categoryId
    ) {
      db.update(skills)
        .set({ name: skill.name, category: skill.category, categoryId })
        .where(eq(skills.id, skill.id))
        .run();
    }

    const existingQueueRow = db
      .select()
      .from(queue)
      .all()
      .find(
        (row) =>
          row.learnspaceId === learnspaceId &&
          row.userId === DEFAULT_USER_ID &&
          row.skillId === skill.id,
      );
    if (!existingQueueRow) {
      db.insert(queue)
        .values({
          id: `queue-${learnspaceId}-${skill.id}`,
          learnspaceId: learnspaceId,
          userId: DEFAULT_USER_ID,
          skillId: skill.id,
          intervalDays: 1,
          easeFactor: 2.5,
          dueDate: null,
          round: 0,
          lastOutcome: null,
          skipCount: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    }

    const existingConfidence = db
      .select()
      .from(skillConfidence)
      .all()
      .find(
        (row) =>
          row.learnspaceId === learnspaceId &&
          row.userId === DEFAULT_USER_ID &&
          row.skillId === skill.id,
      );
    if (!existingConfidence) {
      db.insert(skillConfidence)
        .values({
          learnspaceId: learnspaceId,
          userId: DEFAULT_USER_ID,
          skillId: skill.id,
          score: 0,
          totalAttempts: 0,
          cleanSolves: 0,
          assistedSolves: 0,
          failedAttempts: 0,
          lastPracticedAt: null,
          trend: null,
        })
        .run();
    }
  }

  // Sync seed items: add new, update existing, retire removed
  const activeSeedIds = new Set<string>();

  for (const seedItem of builtIn.seedItems) {
    const seedItemId = buildSeedItemId(seedItem.slug);
    activeSeedIds.add(seedItemId);

    const existingItem = db.select().from(items).where(eq(items.id, seedItemId)).get();

    if (!existingItem) {
      // Check for a legacy ID (seed-{function_name}) and update it in place.
      // Can't change the primary key because sessions/attempts reference it.
      const legacyId = `seed-${seedItem.function_name}`;
      const legacyItem = legacyId !== seedItemId
        ? db.select().from(items).where(eq(items.id, legacyId)).get()
        : null;

      if (legacyItem) {
        // Update legacy row in place — keep old ID, add slug
        activeSeedIds.add(legacyId);
        db.update(items)
          .set({
            slug: seedItem.slug,
            title: seedItem.title,
            content: {
              prompt: seedItem.prompt,
              function_name: seedItem.function_name,
              test_cases: seedItem.test_cases,
              reference_solution: seedItem.reference_solution,
            },
            skillIds: seedItem.skill_ids,
            tags: seedItem.tags,
            difficulty: seedItem.difficulty,
            status: "active",
            retiredAt: null,
          })
          .where(eq(items.id, legacyId))
          .run();
      } else {
        db.insert(items)
          .values({
            id: seedItemId,
            learnspaceId: learnspaceId,
            slug: seedItem.slug,
            title: seedItem.title,
            content: {
              prompt: seedItem.prompt,
              function_name: seedItem.function_name,
              test_cases: seedItem.test_cases,
              reference_solution: seedItem.reference_solution,
            },
            skillIds: seedItem.skill_ids,
            tags: seedItem.tags,
            difficulty: seedItem.difficulty,
            source: "seed",
            status: "active",
            createdAt: timestamp,
          })
          .run();
      }
    } else {
      // Update existing item content, keep history intact
      db.update(items)
        .set({
          slug: seedItem.slug,
          title: seedItem.title,
          content: {
            prompt: seedItem.prompt,
            function_name: seedItem.function_name,
            test_cases: seedItem.test_cases,
            reference_solution: seedItem.reference_solution,
          },
          skillIds: seedItem.skill_ids,
          tags: seedItem.tags,
          difficulty: seedItem.difficulty,
          status: "active",
          retiredAt: null,
        })
        .where(eq(items.id, seedItemId))
        .run();
    }
  }

  // Retire seed items that are no longer in the source
  const allSeedItems = db.select().from(items).all()
    .filter((item) => item.source === "seed" && item.learnspaceId === learnspaceId);
  for (const item of allSeedItems) {
    if (!activeSeedIds.has(item.id)) {
      db.update(items)
        .set({ status: "retired", retiredAt: timestamp })
        .where(eq(items.id, item.id))
        .run();
    }
  }

  // Hydrate item_queue: ensure every active item has a queue row
  hydrateItemQueue(db, learnspaceId, timestamp);
}

function hydrateItemQueue(db: AppDatabase, learnspaceId: string, timestamp: string): void {
  const activeItems = db.select().from(items).all()
    .filter((item) => item.learnspaceId === learnspaceId && item.status !== "retired");
  const existingItemQueueRows = db.select().from(itemQueue).all()
    .filter((row) => row.learnspaceId === learnspaceId && row.userId === DEFAULT_USER_ID);
  const existingItemIds = new Set(existingItemQueueRows.map((row) => row.itemId));

  // Load attempts for deriving SRS state from history
  const allAttempts = db.select().from(attempts).all()
    .filter((a) => a.learnspaceId === learnspaceId && a.userId === DEFAULT_USER_ID && a.completedAt !== null && a.outcome !== "abandoned");

  // Group attempts by item, sorted by completion time
  const attemptsByItem = new Map<string, Array<{ outcome: string; completedAt: string }>>();
  for (const attempt of allAttempts) {
    if (!attempt.outcome || !attempt.completedAt) continue;
    const list = attemptsByItem.get(attempt.itemId) ?? [];
    list.push({ outcome: attempt.outcome, completedAt: attempt.completedAt });
    attemptsByItem.set(attempt.itemId, list);
  }

  // Load existing skill-level queue rows for seeding ease factor
  const skillQueueRows = db.select().from(queue).all()
    .filter((row) => row.learnspaceId === learnspaceId && row.userId === DEFAULT_USER_ID);
  const skillQueueBySkillId = new Map(skillQueueRows.map((row) => [row.skillId, row]));

  for (const item of activeItems) {
    if (existingItemIds.has(item.id)) continue;

    const primarySkillId = (item.skillIds ?? [])[0] ?? "unknown";
    const itemAttempts = attemptsByItem.get(item.id) ?? [];

    let intervalDays = 1;
    let easeFactor = 2.5;
    let round = 0;
    let dueDate: string | null = null;
    let lastOutcome: string | null = null;

    if (itemAttempts.length > 0) {
      // Derive SRS state from attempt history
      const sorted = [...itemAttempts].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
      const lastAttempt = sorted[sorted.length - 1];
      lastOutcome = lastAttempt.outcome;

      // Use the skill-level queue's ease factor as a starting point
      const skillQueue = skillQueueBySkillId.get(primarySkillId);
      if (skillQueue) {
        easeFactor = skillQueue.easeFactor;
        intervalDays = skillQueue.intervalDays;
        round = Math.min(sorted.length, skillQueue.round);
      } else {
        round = sorted.length;
      }

      // Compute due date from last completion + interval
      const lastCompletedMs = new Date(lastAttempt.completedAt).getTime();
      dueDate = new Date(lastCompletedMs + intervalDays * 24 * 60 * 60 * 1000).toISOString();
    }

    db.insert(itemQueue)
      .values({
        id: `iq-${learnspaceId}-${item.id}`,
        learnspaceId,
        userId: DEFAULT_USER_ID,
        itemId: item.id,
        skillId: primarySkillId,
        intervalDays,
        easeFactor,
        round,
        dueDate,
        // Mirror dueDate on seed: this is our best reconstruction of when the
        // scheduler would have placed the review. For fresh items (dueDate
        // null) scheduledDate stays null — no review has been scheduled yet.
        scheduledDate: dueDate,
        lastOutcome,
        skipCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  }
}

export function getDefaultUser(db: AppDatabase): User {
  const user = db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).get();
  if (!user) {
    throw new Error("Default user not found");
  }
  return user;
}

export function getLearnspaceById(db: AppDatabase, learnspaceId: string): Learnspace | undefined {
  return db.select().from(learnspaces).where(eq(learnspaces.id, learnspaceId)).get();
}

export function getActiveLearnspace(db: AppDatabase): Learnspace {
  const user = getDefaultUser(db);
  const learnspaceId = user.activeLearnspaceId ?? DEFAULT_LEARNSPACE_ID;
  const learnspace = getLearnspaceById(db, learnspaceId);

  if (!learnspace) {
    throw new Error("Active learnspace not found");
  }

  return learnspace;
}

export function setLearnspaceActiveTag(
  { db, now }: SeedDependencies,
  learnspaceId: string,
  activeTag: string | null,
): Learnspace {
  db.update(learnspaces)
    .set({
      activeTag,
      updatedAt: toIsoString(now),
    })
    .where(eq(learnspaces.id, learnspaceId))
    .run();

  const learnspace = getLearnspaceById(db, learnspaceId);
  if (!learnspace) {
    throw new Error("Learnspace not found");
  }
  return learnspace;
}

export function activateLearnspace(
  { db, now }: SeedDependencies,
  learnspaceId: string,
): Learnspace {
  db.update(users)
    .set({
      activeLearnspaceId: learnspaceId,
      updatedAt: toIsoString(now),
    })
    .where(eq(users.id, DEFAULT_USER_ID))
    .run();

  const learnspace = getLearnspaceById(db, learnspaceId);
  if (!learnspace) {
    throw new Error("Learnspace not found");
  }
  return learnspace;
}
