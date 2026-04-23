import { createTestDatabase } from "../persistence/db.js";
import {
  attempts,
  items,
  learnspaces,
  skillConfidence,
  skills,
  users,
} from "../persistence/schema.js";
import {
  buildAttemptCoachingSummary,
  loadCoachMemorySnapshot,
} from "./coach-memory.js";

function seedCoachMemoryFixture() {
  const db = createTestDatabase();
  const userId = "user-1";
  const learnspaceId = "coding-interview-patterns";
  const createdAt = "2026-04-01T00:00:00.000Z";

  db.insert(users)
    .values({
      id: userId,
      displayName: "Local User",
      activeLearnspaceId: learnspaceId,
      createdAt,
      updatedAt: createdAt,
    })
    .run();

  db.insert(learnspaces)
    .values({
      id: learnspaceId,
      userId,
      name: "Coding Interview Patterns",
      config: {},
      createdAt,
      updatedAt: createdAt,
    })
    .run();

  return { db, userId, learnspaceId, createdAt };
}

function insertSkillWithItem(
  db: ReturnType<typeof createTestDatabase>,
  input: {
    learnspaceId: string;
    createdAt: string;
    skillId: string;
    itemId?: string;
    title?: string;
  },
) {
  const itemId = input.itemId ?? `item-${input.skillId}`;

  db.insert(skills)
    .values({
      id: input.skillId,
      learnspaceId: input.learnspaceId,
      name: input.skillId,
      category: "arrays",
      createdAt: input.createdAt,
    })
    .run();

  db.insert(items)
    .values({
      id: itemId,
      learnspaceId: input.learnspaceId,
      title: input.title ?? itemId,
      content: {},
      skillIds: [input.skillId],
      tags: [],
      difficulty: "easy",
      source: "seed",
      createdAt: input.createdAt,
    })
    .run();

  return { itemId };
}

function insertConfidenceRow(
  db: ReturnType<typeof createTestDatabase>,
  input: {
    learnspaceId: string;
    userId: string;
    skillId: string;
    score?: number;
    totalAttempts?: number;
    cleanSolves?: number;
    assistedSolves?: number;
    failedAttempts?: number;
    trend?: string | null;
    lastPracticedAt?: string | null;
  },
) {
  db.insert(skillConfidence)
    .values({
      learnspaceId: input.learnspaceId,
      userId: input.userId,
      skillId: input.skillId,
      score: input.score ?? 0,
      totalAttempts: input.totalAttempts ?? 0,
      cleanSolves: input.cleanSolves ?? 0,
      assistedSolves: input.assistedSolves ?? 0,
      failedAttempts: input.failedAttempts ?? 0,
      lastPracticedAt: input.lastPracticedAt ?? null,
      trend: input.trend ?? null,
    })
    .run();
}

function insertAttempt(
  db: ReturnType<typeof createTestDatabase>,
  input: {
    id: string;
    learnspaceId: string;
    userId: string;
    itemId: string;
    startedAt: string;
    completedAt: string;
    outcome: "clean" | "assisted" | "failed";
    structuredEvaluation?: Record<string, unknown> | null;
    coachingMetadata?: Record<string, unknown> | null;
  },
) {
  db.insert(attempts)
    .values({
      id: input.id,
      learnspaceId: input.learnspaceId,
      userId: input.userId,
      itemId: input.itemId,
      sessionId: null,
      outcome: input.outcome,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      structuredEvaluation: input.structuredEvaluation ?? null,
      coachingMetadata: input.coachingMetadata ?? null,
    })
    .run();
}

describe("coach memory normalization", () => {
  test("AC-2 summarizes help reveal stuck and understanding fields deterministically", () => {
    const summary = buildAttemptCoachingSummary([
      {
        role: "assistant",
        content: "Start by checking the hash map invariant.",
        createdAt: "2026-04-08T12:00:00Z",
        metadata: {
          help_level: 0.25,
          information_revealed: ["pattern_hint", "edge_case"],
          user_appears_stuck: true,
          user_understanding: "partial",
          notable_mistake: "missed duplicates",
          gave_full_solution: false,
        },
      },
      {
        role: "assistant",
        content: "You still need to handle duplicates.",
        createdAt: "2026-04-08T12:01:00Z",
        metadata: {
          help_level: 0.5,
          information_revealed: ["edge_case", "complexity_hint"],
          user_appears_stuck: false,
          user_understanding: "solid",
          notable_mistake: "missed duplicates",
          gave_full_solution: false,
        },
      },
      {
        role: "assistant",
        content: "Now think about index ordering.",
        createdAt: "2026-04-08T12:02:00Z",
        metadata: {
          help_level: 0.75,
          information_revealed: ["complexity_hint"],
          user_appears_stuck: true,
          user_understanding: "strong",
          notable_mistake: "index bookkeeping",
          gave_full_solution: true,
        },
      },
    ]);

    expect(summary).toEqual({
      coach_turns: 3,
      avg_help_level: 0.5,
      max_help_level: 0.75,
      stuck_turns: 2,
      full_solution_turns: 1,
      latest_understanding: "strong",
      recurring_notable_mistakes: ["missed duplicates", "index bookkeeping"],
      information_revealed: ["complexity_hint", "edge_case", "pattern_hint"],
    });
  });

  test("ERR-1 ignores malformed message metadata during summary extraction", () => {
    const summary = buildAttemptCoachingSummary([
      {
        role: "assistant",
        content: "bad",
        createdAt: "2026-04-08T12:00:00Z",
        metadata: {
          help_level: "high",
          information_revealed: ["pattern_hint"],
          user_appears_stuck: false,
          user_understanding: "partial",
          notable_mistake: null,
          gave_full_solution: false,
        },
      },
      {
        role: "assistant",
        content: "also bad",
        createdAt: "2026-04-08T12:00:30Z",
        metadata: {
          help_level: 0.3,
          information_revealed: "pattern_hint",
          user_appears_stuck: false,
          user_understanding: "partial",
          notable_mistake: null,
          gave_full_solution: false,
        },
      },
      {
        role: "assistant",
        content: "valid",
        createdAt: "2026-04-08T12:01:00Z",
        metadata: {
          help_level: 0.4,
          information_revealed: ["pattern_hint"],
          user_appears_stuck: false,
          user_understanding: "solid",
          notable_mistake: "forgot return",
          gave_full_solution: false,
        },
      },
    ]);

    expect(summary).toEqual({
      coach_turns: 1,
      avg_help_level: 0.4,
      max_help_level: 0.4,
      stuck_turns: 0,
      full_solution_turns: 0,
      latest_understanding: "solid",
      recurring_notable_mistakes: ["forgot return"],
      information_revealed: ["pattern_hint"],
    });
  });

  test("AC-1 loads coach memory snapshot from confidence evaluations and coaching summaries", () => {
    const { db, userId, learnspaceId, createdAt } = seedCoachMemoryFixture();
    const { itemId } = insertSkillWithItem(db, {
      learnspaceId,
      createdAt,
      skillId: "hash_map",
      title: "Two Sum",
    });

    insertConfidenceRow(db, {
      learnspaceId,
      userId,
      skillId: "hash_map",
      score: 6.5,
      totalAttempts: 4,
      cleanSolves: 1,
      assistedSolves: 2,
      failedAttempts: 1,
      lastPracticedAt: "2026-04-06T00:00:00Z",
    });

    insertAttempt(db, {
      id: "attempt-1",
      learnspaceId,
      userId,
      itemId,
      startedAt: "2026-04-05T00:00:00Z",
      completedAt: "2026-04-05T00:10:00Z",
      outcome: "failed",
      structuredEvaluation: {
        severity: "critical",
        mistakes: [
          { type: "off_by_one", description: "loop bound", step: "code" },
          {
            type: "wrong_data_structure",
            description: "used two pointers",
            step: "approach",
          },
        ],
        coaching_summary: "Re-check data structure choice.",
      },
      coachingMetadata: {
        coach_turns: 1,
        avg_help_level: 0.9,
        max_help_level: 0.9,
        stuck_turns: 0,
        full_solution_turns: 1,
        latest_understanding: "confused",
        recurring_notable_mistakes: ["missed duplicates"],
        information_revealed: ["full_solution"],
      },
    });
    insertAttempt(db, {
      id: "attempt-2",
      learnspaceId,
      userId,
      itemId,
      startedAt: "2026-04-06T00:00:00Z",
      completedAt: "2026-04-06T00:10:00Z",
      outcome: "assisted",
      structuredEvaluation: {
        severity: "moderate",
        mistakes: [{ type: "off_by_one", description: "boundary", step: "code" }],
        coaching_summary: "Watch boundaries.",
      },
      coachingMetadata: {
        coach_turns: 2,
        avg_help_level: 0.6,
        max_help_level: 0.8,
        stuck_turns: 1,
        full_solution_turns: 0,
        latest_understanding: "partial",
        recurring_notable_mistakes: ["missed duplicates"],
        information_revealed: ["pattern_hint"],
      },
    });

    const snapshot = loadCoachMemorySnapshot(db, "hash_map", learnspaceId, userId);

    expect(snapshot).toEqual({
      skillId: "hash_map",
      score: 6.5,
      totalAttempts: 4,
      cleanSolves: 1,
      assistedSolves: 2,
      failedAttempts: 1,
      trend: null,
      topMistakes: ["off_by_one", "wrong_data_structure"],
      commonMistakes: [
        { type: "off_by_one", count: 2, severity: "critical" },
        { type: "wrong_data_structure", count: 1, severity: "critical" },
      ],
      recentInsights: ["Watch boundaries.", "Re-check data structure choice."],
      coachingPatterns: {
        avgHelpLevel: 0.7,
        fullSolutionRate: 0.3333,
        stuckRate: 0.3333,
        latestUnderstanding: "partial",
        recurringNotableMistakes: ["missed duplicates"],
      },
    });
  });

  test("AC-2 computes improving stable and declining trends from two outcome windows", () => {
    const { db, userId, learnspaceId, createdAt } = seedCoachMemoryFixture();

    for (const skillId of ["improving", "stable", "declining"]) {
      insertSkillWithItem(db, { learnspaceId, createdAt, skillId });
      insertConfidenceRow(db, {
        learnspaceId,
        userId,
        skillId,
        totalAttempts: 6,
        lastPracticedAt: "2026-04-06T00:00:00Z",
      });
    }

    const outcomesBySkill: Record<string, Array<"clean" | "assisted" | "failed">> = {
      improving: ["failed", "failed", "assisted", "assisted", "clean", "clean"],
      stable: ["failed", "assisted", "clean", "failed", "assisted", "clean"],
      declining: ["clean", "clean", "assisted", "assisted", "failed", "failed"],
    };

    for (const [skillId, outcomes] of Object.entries(outcomesBySkill)) {
      const itemId = `item-${skillId}`;
      outcomes.forEach((outcome, index) => {
        insertAttempt(db, {
          id: `${skillId}-attempt-${index}`,
          learnspaceId,
          userId,
          itemId,
          startedAt: `2026-04-0${index + 1}T00:00:00Z`,
          completedAt: `2026-04-0${index + 1}T00:10:00Z`,
          outcome,
        });
      });
    }

    expect(loadCoachMemorySnapshot(db, "improving", learnspaceId, userId).trend).toBe(
      "improving",
    );
    expect(loadCoachMemorySnapshot(db, "stable", learnspaceId, userId).trend).toBe(
      "stable",
    );
    expect(loadCoachMemorySnapshot(db, "declining", learnspaceId, userId).trend).toBe(
      "declining",
    );
  });

  test("AC-3 aggregates recurring notable mistakes and help dependence from coaching summaries", () => {
    const { db, userId, learnspaceId, createdAt } = seedCoachMemoryFixture();
    const { itemId } = insertSkillWithItem(db, {
      learnspaceId,
      createdAt,
      skillId: "graphs",
      title: "Clone Graph",
    });

    insertConfidenceRow(db, {
      learnspaceId,
      userId,
      skillId: "graphs",
      score: 4.5,
      totalAttempts: 3,
      assistedSolves: 2,
      failedAttempts: 1,
      lastPracticedAt: "2026-04-06T00:00:00Z",
    });

    insertAttempt(db, {
      id: "graphs-1",
      learnspaceId,
      userId,
      itemId,
      startedAt: "2026-04-04T00:00:00Z",
      completedAt: "2026-04-04T00:05:00Z",
      outcome: "failed",
      coachingMetadata: {
        coach_turns: 2,
        avg_help_level: 0.8,
        max_help_level: 1,
        stuck_turns: 1,
        full_solution_turns: 1,
        latest_understanding: "partial",
        recurring_notable_mistakes: ["forgot visited set", "lost node mapping"],
        information_revealed: ["full_solution"],
      },
    });
    insertAttempt(db, {
      id: "graphs-2",
      learnspaceId,
      userId,
      itemId,
      startedAt: "2026-04-05T00:00:00Z",
      completedAt: "2026-04-05T00:05:00Z",
      outcome: "assisted",
      coachingMetadata: {
        coach_turns: 3,
        avg_help_level: 0.7,
        max_help_level: 0.8,
        stuck_turns: 2,
        full_solution_turns: 0,
        latest_understanding: "solid",
        recurring_notable_mistakes: ["forgot visited set"],
        information_revealed: ["pattern_hint"],
      },
    });

    const snapshot = loadCoachMemorySnapshot(db, "graphs", learnspaceId, userId);

    expect(snapshot.coachingPatterns).toEqual({
      avgHelpLevel: 0.74,
      fullSolutionRate: 0.2,
      stuckRate: 0.6,
      latestUnderstanding: "solid",
      recurringNotableMistakes: ["forgot visited set"],
    });
  });

  test("EC-1 returns zeroed coach memory snapshot for skills with no completed attempts", () => {
    const { db, userId, learnspaceId, createdAt } = seedCoachMemoryFixture();
    insertSkillWithItem(db, {
      learnspaceId,
      createdAt,
      skillId: "dynamic_programming",
      title: "Climbing Stairs",
    });
    insertConfidenceRow(db, {
      learnspaceId,
      userId,
      skillId: "dynamic_programming",
      score: 0,
      totalAttempts: 0,
      cleanSolves: 0,
      assistedSolves: 0,
      failedAttempts: 0,
      trend: null,
    });

    expect(
      loadCoachMemorySnapshot(db, "dynamic_programming", learnspaceId, userId),
    ).toEqual({
      skillId: "dynamic_programming",
      score: 0,
      totalAttempts: 0,
      cleanSolves: 0,
      assistedSolves: 0,
      failedAttempts: 0,
      trend: null,
      topMistakes: [],
      commonMistakes: [],
      recentInsights: [],
      coachingPatterns: {
        avgHelpLevel: 0,
        fullSolutionRate: 0,
        stuckRate: 0,
        latestUnderstanding: null,
        recurringNotableMistakes: [],
      },
    });
  });

  test("ERR-1 skips malformed historical payloads while building coach memory snapshot", () => {
    const { db, userId, learnspaceId, createdAt } = seedCoachMemoryFixture();
    const { itemId } = insertSkillWithItem(db, {
      learnspaceId,
      createdAt,
      skillId: "trees",
      title: "Invert Tree",
    });

    insertConfidenceRow(db, {
      learnspaceId,
      userId,
      skillId: "trees",
      score: 5,
      totalAttempts: 2,
      cleanSolves: 1,
      assistedSolves: 1,
      failedAttempts: 0,
    });

    insertAttempt(db, {
      id: "trees-bad",
      learnspaceId,
      userId,
      itemId,
      startedAt: "2026-04-04T00:00:00Z",
      completedAt: "2026-04-04T00:05:00Z",
      outcome: "assisted",
      structuredEvaluation: { mistakes: "not-an-array", coaching_summary: 42 },
      coachingMetadata: { avg_help_level: "high" },
    });
    insertAttempt(db, {
      id: "trees-good",
      learnspaceId,
      userId,
      itemId,
      startedAt: "2026-04-05T00:00:00Z",
      completedAt: "2026-04-05T00:05:00Z",
      outcome: "clean",
      structuredEvaluation: {
        severity: "minor",
        mistakes: [{ type: "base_case", description: "missed null check", step: "code" }],
        coaching_summary: "Null checks are now consistent.",
      },
      coachingMetadata: {
        coach_turns: 1,
        avg_help_level: 0.2,
        max_help_level: 0.2,
        stuck_turns: 0,
        full_solution_turns: 0,
        latest_understanding: "strong",
        recurring_notable_mistakes: [],
        information_revealed: ["edge_case"],
      },
    });

    const snapshot = loadCoachMemorySnapshot(db, "trees", learnspaceId, userId);

    expect(snapshot.commonMistakes).toEqual([
      { type: "base_case", count: 1, severity: "minor" },
    ]);
    expect(snapshot.recentInsights).toEqual(["Null checks are now consistent."]);
    expect(snapshot.coachingPatterns).toEqual({
      avgHelpLevel: 0.2,
      fullSolutionRate: 0,
      stuckRate: 0,
      latestUnderstanding: "strong",
      recurringNotableMistakes: [],
    });
  });
});
