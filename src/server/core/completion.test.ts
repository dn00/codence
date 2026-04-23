import { eq } from "drizzle-orm";
import type { EvaluationService } from "../runtime-services.js";
import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import { createTestDatabase } from "../persistence/db.js";
import { createStubEvaluationService, evaluateAttemptStub } from "../ai/evaluation-service.js";
import { completeSessionAttempt, MissingPrimaryQueueRowError, SessionCompletionError } from "./completion.js";
import type { AttemptContext, StructuredEvaluation } from "./types.js";
import { createSession, saveSessionStep, abandonSession } from "./sessions.js";
import {
  attempts,
  items,
  learnspaces,
  queue,
  sessions,
  skillConfidence,
  skills,
  users,
} from "../persistence/schema.js";

function createNow(isoString: string): () => Date {
  return () => new Date(isoString);
}

function createCompletionDependencies(
  db: ReturnType<typeof createTestDatabase>,
  now: () => Date,
  evaluationService: EvaluationService = createStubEvaluationService(),
) {
  return {
    db,
    now,
    evaluationService,
  };
}

function createConfig(): LearnspaceConfig {
  return {
    id: "coding-interview-patterns",
    name: "LeetCode Patterns",
    description: "Completion fixture learnspace",
    familyId: "dsa",
    schedulerId: "sm5",
    builtInVersion: 1,
    protocol_steps: [
      {
        id: "understanding",
        label: "Understanding",
        instruction: "Restate the problem",
        agent_prompt: "Clarify the problem",
        editor: "text",
        layout: "inline",
      },
      {
        id: "approach",
        label: "Approach",
        instruction: "Choose the pattern",
        agent_prompt: "Discuss the approach",
        editor: "text",
        layout: "inline",
      },
      {
        id: "code",
        label: "Code",
        instruction: "Implement the solution",
        agent_prompt: "Discuss the code",
        editor: "code",
        layout: "full",
      },
    ],
    coaching_persona: "coach",
    evaluation_prompt: "evaluate",
    variant_prompt: "variant",
    executor: null,
    item_schema: {},
    test_harness_template: "",
    skills: [
      { id: "hash_map", name: "Hash Map", category: "arrays" },
      { id: "sliding_window", name: "Sliding Window", category: "arrays" },
    ],
    tags: ["google", "meta"],
    tag_weights: {
      google: {
        hash_map: 1.5,
        sliding_window: 1.2,
      },
      meta: {},
    },
    confidence_gated_protocol_threshold: 7,
    interleaving_confidence_threshold: 4,
  };
}

function createStubContext(
  config: LearnspaceConfig,
  stepDrafts: AttemptContext["stepDrafts"],
): AttemptContext {
  return {
    attemptId: "test-attempt",
    sessionId: "test-session",
    learnspaceId: config.id,
    itemId: "test-item",
    evaluationPromptTemplate: config.evaluation_prompt,
    itemTitle: "Test Item",
    itemContent: {},
    referenceSolution: null,
    protocolSteps: config.protocol_steps.map((step) => ({
      id: step.id,
      label: step.label,
      instruction: step.instruction,
      agentPrompt: step.agent_prompt,
      editor: step.editor,
    })),
    primarySkill: { id: "hash_map", name: "Hash Map" },
    secondarySkills: [],
    stepDrafts,
    testResults: null,
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
  };
}

function seedCompletionFixture() {
  const db = createTestDatabase();
  const userId = "user-1";
  const learnspaceId = "coding-interview-patterns";
  const config = createConfig();
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
      name: config.name,
      config: config as unknown as Record<string, unknown>,
      activeTag: null,
      interviewDate: "2026-04-20T00:00:00.000Z",
      createdAt,
      updatedAt: createdAt,
    })
    .run();

  db.insert(skills)
    .values(
      config.skills.map((skill) => ({
        id: skill.id,
        learnspaceId,
        name: skill.name,
        category: skill.category,
        createdAt,
      })),
    )
    .run();

  db.insert(items)
    .values([
      {
        id: "item-primary",
        learnspaceId,
        title: "Two Sum",
        content: {
          prompt: "solve two sum",
          function_name: "two_sum",
        },
        skillIds: ["hash_map", "sliding_window"],
        tags: ["google"],
        difficulty: "easy",
        source: "seed",
        createdAt,
      },
    ])
    .run();

  db.insert(queue)
    .values([
      {
        id: "queue-hash-map",
        learnspaceId,
        userId,
        skillId: "hash_map",
        intervalDays: 6,
        easeFactor: 2.5,
        dueDate: "2026-04-08T00:00:00.000Z",
        round: 2,
        lastOutcome: "failed",
        skipCount: 2,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "queue-window",
        learnspaceId,
        userId,
        skillId: "sliding_window",
        intervalDays: 3,
        easeFactor: 2.4,
        dueDate: "2026-04-09T00:00:00.000Z",
        round: 1,
        lastOutcome: null,
        skipCount: 0,
        createdAt,
        updatedAt: createdAt,
      },
    ])
    .run();

  db.insert(skillConfidence)
    .values([
      {
        learnspaceId,
        userId,
        skillId: "hash_map",
        score: 9,
        totalAttempts: 1,
        cleanSolves: 1,
        assistedSolves: 0,
        failedAttempts: 0,
        lastPracticedAt: "2026-04-01T00:00:00.000Z",
        trend: null,
      },
      {
        learnspaceId,
        userId,
        skillId: "sliding_window",
        score: 0,
        totalAttempts: 0,
        cleanSolves: 0,
        assistedSolves: 0,
        failedAttempts: 0,
        lastPracticedAt: null,
        trend: null,
      },
    ])
    .run();

  return { db, userId, learnspaceId, config };
}

function seedPrimaryTrendHistory(
  db: ReturnType<typeof createTestDatabase>,
  input: {
    learnspaceId: string;
    userId: string;
    outcomes: Array<"clean" | "assisted" | "failed">;
  },
) {
  const counts = {
    clean: input.outcomes.filter((outcome) => outcome === "clean").length,
    assisted: input.outcomes.filter((outcome) => outcome === "assisted").length,
    failed: input.outcomes.filter((outcome) => outcome === "failed").length,
  };

  db.delete(attempts).where(eq(attempts.learnspaceId, input.learnspaceId)).run();
  db.update(skillConfidence)
    .set({
      score: 5,
      totalAttempts: input.outcomes.length,
      cleanSolves: counts.clean,
      assistedSolves: counts.assisted,
      failedAttempts: counts.failed,
      lastPracticedAt: input.outcomes.length
        ? `2026-04-0${input.outcomes.length}T00:10:00.000Z`
        : null,
      trend: null,
    })
    .where(eq(skillConfidence.skillId, "hash_map"))
    .run();

  input.outcomes.forEach((outcome, index) => {
    const day = String(index + 1).padStart(2, "0");
    db.insert(attempts)
      .values({
        id: `history-${index}`,
        learnspaceId: input.learnspaceId,
        userId: input.userId,
        itemId: "item-primary",
        sessionId: null,
        outcome,
        startedAt: `2026-04-${day}T00:00:00.000Z`,
        completedAt: `2026-04-${day}T00:10:00.000Z`,
        structuredEvaluation: {
          severity: outcome === "failed" ? "critical" : "moderate",
          mistakes: [],
          coaching_summary: `${outcome} summary`,
        },
        coachingMetadata: {
          coach_turns: 0,
          avg_help_level: 0,
          max_help_level: 0,
          stuck_turns: 0,
          full_solution_turns: 0,
          latest_understanding: null,
          recurring_notable_mistakes: [],
          information_revealed: [],
        },
      })
      .run();
  });
}

describe("completion bridge", async () => {
  test("AC-1 returns a full structured stub evaluation for clean assisted and failed draft sets", async () => {
    const config = createConfig();

    const clean = evaluateAttemptStub(
      createStubContext(config, {
        understanding: {
          content: "Understand the constraints",
          updatedAt: "2026-04-08T12:00:00.000Z",
        },
        approach: {
          content: "Use a hash map",
          updatedAt: "2026-04-08T12:01:00.000Z",
        },
        code: {
          content: "def two_sum(nums, target): return []",
          updatedAt: "2026-04-08T12:02:00.000Z",
        },
      }),
    );
    const assisted = evaluateAttemptStub(
      createStubContext(config, {
        understanding: {
          content: "Understand the constraints",
          updatedAt: "2026-04-08T12:00:00.000Z",
        },
      }),
    );
    const failed = evaluateAttemptStub(createStubContext(config, {}));

    expect(clean).toEqual(
      expect.objectContaining({
        outcome: "clean",
        severity: "minor",
        approach_correct: true,
        coaching_summary: expect.any(String),
      }),
    );
    expect(assisted).toEqual(
      expect.objectContaining({
        outcome: "assisted",
        severity: "moderate",
        approach_correct: false,
      }),
    );
    expect(failed).toEqual(
      expect.objectContaining({
        outcome: "failed",
        severity: "critical",
        approach_correct: false,
      }),
    );
  });
  test("AC-2 copies saved drafts into work_snapshot and marks the session and attempt completed", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );
    saveSessionStep(
      { db, now: createNow("2026-04-08T12:01:00.000Z") },
      {
        sessionId: session.sessionId,
        stepId: "understanding",
        content: "Clarify the array constraints",
      },
    );
    saveSessionStep(
      { db, now: createNow("2026-04-08T12:02:00.000Z") },
      {
        sessionId: session.sessionId,
        stepId: "code",
        content: "def two_sum(nums, target): return []",
      },
    );

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    const persistedAttempt = db
      .select()
      .from(attempts)
      .where(eq(attempts.id, session.attemptId))
      .get();

    expect(result.outcome).toBe("assisted");
    expect(result.sessionId).toBe(session.sessionId);
    expect(persistedAttempt?.workSnapshot).toEqual({
      understanding: {
        content: "Clarify the array constraints",
        updatedAt: "2026-04-08T12:01:00.000Z",
      },
      code: {
        content: "def two_sum(nums, target): return []",
        updatedAt: "2026-04-08T12:02:00.000Z",
      },
    });
    expect(persistedAttempt?.completedAt).toBe("2026-04-08T12:10:00.000Z");
    expect(persistedAttempt?.structuredEvaluation).toEqual(result.evaluation);
  });
  test("AC-3 updates the primary queue row through shared SM-2 logic and resets skip_count after successful completion", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        {
          sessionId: session.sessionId,
          stepId,
          content: `${stepId} content`,
        },
      );
    }

    await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    const queueRow = db.select().from(queue).where(eq(queue.id, "queue-hash-map")).get();

    expect(queueRow).toEqual(
      expect.objectContaining({
        intervalDays: 6,
        easeFactor: 2.6,
        round: 3,
        lastOutcome: "clean",
        skipCount: 0,
        dueDate: "2026-04-14T12:10:00.000Z",
      }),
    );
  });
  test("AC-4 primary row bumps integer counters while secondary row receives a cascaded blended score without counter drift", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        {
          sessionId: session.sessionId,
          stepId,
          content: `${stepId} content`,
        },
      );
    }

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    const primary = db
      .select()
      .from(skillConfidence)
      .where(eq(skillConfidence.skillId, "hash_map"))
      .get();
    const secondary = db
      .select()
      .from(skillConfidence)
      .where(eq(skillConfidence.skillId, "sliding_window"))
      .get();

    expect(result.primarySkill).toEqual({
      skillId: "hash_map",
      score: 10,
      trend: null,
      nextDueDate: "2026-04-14T12:10:00.000Z",
    });
    expect(primary).toEqual(
      expect.objectContaining({
        totalAttempts: 2,
        cleanSolves: 2,
        assistedSolves: 0,
        failedAttempts: 0,
        score: 10,
        lastPracticedAt: "2026-04-08T12:10:00.000Z",
      }),
    );
    // Secondary counters and lastPracticedAt stay frozen (primary row owns
    // those). The row's score is cascaded to reflect the new secondary-weight
    // evidence derived from the attempts table.
    expect(secondary).toEqual(
      expect.objectContaining({
        totalAttempts: 0,
        cleanSolves: 0,
        assistedSolves: 0,
        failedAttempts: 0,
        score: 10,
        lastPracticedAt: null,
      }),
    );
  });
  test("EC-1 returns assisted with step-level quality detail when only some steps have content", async () => {
    const config = createConfig();

    const evaluation = evaluateAttemptStub(
      createStubContext(config, {
        understanding: {
          content: "I understand the constraints",
          updatedAt: "2026-04-08T12:00:00.000Z",
        },
      }),
    );

    expect(evaluation.outcome).toBe("assisted");
    expect(evaluation.per_step_quality).toEqual({
      understanding: "solid",
      approach: "missing",
      code: "missing",
    });
    expect(evaluation.coaching_summary.length).toBeGreaterThan(0);
  });
  test("ERR-1 rejects completion for missing abandoned or already-completed sessions", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();

    await expect(
      completeSessionAttempt(
        createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
        { sessionId: "missing-session" },
      ),
    ).rejects.toThrow(SessionCompletionError);

    const abandoned = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );
    abandonSession(
      { db, now: createNow("2026-04-08T12:05:00.000Z") },
      { sessionId: abandoned.sessionId },
    );
    await expect(
      completeSessionAttempt(
        createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
        { sessionId: abandoned.sessionId },
      ),
    ).rejects.toThrow("Only active sessions can be completed");

    const completed = createSession(
      { db, now: createNow("2026-04-08T13:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );
    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T13:0${index + 1}:00.000Z`) },
        {
          sessionId: completed.sessionId,
          stepId,
          content: `${stepId} content`,
        },
      );
    }
    await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T13:10:00.000Z")),
      { sessionId: completed.sessionId },
    );
    await expect(
      completeSessionAttempt(
        createCompletionDependencies(db, createNow("2026-04-08T13:20:00.000Z")),
        { sessionId: completed.sessionId },
      ),
    ).rejects.toThrow("Only active sessions can be completed");
  });
  test("ERR-2 fails clearly when the primary skill queue row is missing at completion time", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    saveSessionStep(
      { db, now: createNow("2026-04-08T12:01:00.000Z") },
      {
        sessionId: session.sessionId,
        stepId: "code",
        content: "def two_sum(nums, target): return []",
      },
    );

    db.delete(queue).where(eq(queue.id, "queue-hash-map")).run();

    await expect(
      completeSessionAttempt(
        createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
        { sessionId: session.sessionId },
      ),
    ).rejects.toThrow(MissingPrimaryQueueRowError);
    await expect(
      completeSessionAttempt(
        createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
        { sessionId: session.sessionId },
      ),
    ).rejects.toThrow("Missing queue row for primary skill: hash_map");
  });

  test("concurrent completion claims the session once and does not double-apply mastery writes", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        {
          sessionId: session.sessionId,
          stepId,
          content: `${stepId} content`,
        },
      );
    }

    let started = 0;
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    const evaluationService: EvaluationService = {
      evaluateAttempt: async () => {
        started += 1;
        if (started === 2) {
          releaseGate();
        }
        await gate;
        return {
          outcome: "clean",
          diagnosis: "Concurrent clean solve",
          severity: "minor",
          approach_correct: true,
          per_step_quality: {
            understanding: "solid",
            approach: "solid",
            code: "solid",
          },
          mistakes: [],
          strengths: ["Complete solve"],
          coaching_summary: "Completed successfully.",
          evaluation_source: "stub",
          retry_recovered: false,
        };
      },
    };

    const deps = createCompletionDependencies(
      db,
      createNow("2026-04-08T12:10:00.000Z"),
      evaluationService,
    );

    const [first, second] = await Promise.allSettled([
      completeSessionAttempt(deps, { sessionId: session.sessionId }),
      completeSessionAttempt(deps, { sessionId: session.sessionId }),
    ]);

    expect([first.status, second.status].sort()).toEqual(["fulfilled", "rejected"]);
    const rejected = first.status === "rejected" ? first.reason : second.status === "rejected" ? second.reason : null;
    expect(rejected).toBeInstanceOf(SessionCompletionError);
    expect(String(rejected)).toContain("Session already completed");

    const sessionRow = db.select().from(sessions).where(eq(sessions.id, session.sessionId)).get();
    const attemptRow = db.select().from(attempts).where(eq(attempts.id, session.attemptId)).get();
    const queueRow = db.select().from(queue).where(eq(queue.id, "queue-hash-map")).get();
    const primary = db
      .select()
      .from(skillConfidence)
      .where(eq(skillConfidence.skillId, "hash_map"))
      .get();

    expect(sessionRow?.status).toBe("completed");
    expect(attemptRow?.outcome).toBe("clean");
    expect(queueRow?.round).toBe(3);
    expect(primary).toEqual(
      expect.objectContaining({
        totalAttempts: 2,
        cleanSolves: 2,
        assistedSolves: 0,
        failedAttempts: 0,
      }),
    );
  });
  test("AC-1 CompletionResponse exposes StructuredEvaluation rather than a stub-specific return type", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    saveSessionStep(
      { db, now: createNow("2026-04-08T12:01:00.000Z") },
      {
        sessionId: session.sessionId,
        stepId: "understanding",
        content: "Work saved",
      },
    );

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );
    const evaluation: StructuredEvaluation = result.evaluation;

    expect(evaluation.coaching_summary.length).toBeGreaterThan(0);
  });
  test("AC-2 completeSessionAttempt uses the injected evaluation service for outcome and persisted structuredEvaluation", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    const evaluationService: EvaluationService = {
      evaluateAttempt: () => ({
        outcome: "failed",
        diagnosis: "Injected evaluator",
        severity: "critical",
        approach_correct: false,
        per_step_quality: {
          understanding: "missing",
          approach: "missing",
          code: "missing",
        },
        mistakes: [
          {
            type: "missing-work",
            description: "No meaningful work",
            step: "code",
          },
        ],
        strengths: [],
        coaching_summary: "Injected evaluator summary.",
        evaluation_source: "stub",
        retry_recovered: false,
      }),
    };

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z"), evaluationService),
      { sessionId: session.sessionId },
    );
    const persistedAttempt = db
      .select()
      .from(attempts)
      .where(eq(attempts.id, session.attemptId))
      .get();

    expect(result.outcome).toBe("failed");
    expect(result.evaluation.diagnosis).toBe("Injected evaluator");
    expect(persistedAttempt?.structuredEvaluation).toEqual(result.evaluation);
  });
  test("AC-3 completion preserves attempt queue and confidence persistence after evaluator extraction", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        {
          sessionId: session.sessionId,
          stepId,
          content: `${stepId} content`,
        },
      );
    }

    await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    const persistedAttempt = db
      .select()
      .from(attempts)
      .where(eq(attempts.id, session.attemptId))
      .get();
    const queueRow = db.select().from(queue).where(eq(queue.id, "queue-hash-map")).get();
    const primary = db
      .select()
      .from(skillConfidence)
      .where(eq(skillConfidence.skillId, "hash_map"))
      .get();

    expect(persistedAttempt?.workSnapshot).toBeTruthy();
    expect(persistedAttempt?.testResults ?? null).toBeNull();
    expect(persistedAttempt?.coachingMetadata).toEqual({
      coach_turns: 0,
      avg_help_level: 0,
      max_help_level: 0,
      stuck_turns: 0,
      full_solution_turns: 0,
      latest_understanding: null,
      recurring_notable_mistakes: [],
      information_revealed: [],
    });
    expect(queueRow).toEqual(
      expect.objectContaining({
        round: 3,
        lastOutcome: "clean",
      }),
    );
    expect(primary).toEqual(
      expect.objectContaining({
        totalAttempts: 2,
        cleanSolves: 2,
      }),
    );
  });
  test("EC-1 completion accepts deterministic test evaluators without changing route semantics", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    // Save enough steps to pass the step_completion_rate threshold
    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    const evaluationService: EvaluationService = {
      evaluateAttempt: () => ({
        outcome: "clean",
        diagnosis: "Deterministic evaluator",
        severity: "minor",
        approach_correct: true,
        per_step_quality: {
          understanding: "strong",
          approach: "strong",
          code: "strong",
        },
        mistakes: [],
        strengths: ["Consistent result"],
        coaching_summary: "Deterministic summary.",
        evaluation_source: "stub",
        retry_recovered: false,
      }),
    };

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z"), evaluationService),
      { sessionId: session.sessionId },
    );

    expect(result).toEqual(
      expect.objectContaining({
        sessionId: session.sessionId,
        attemptId: session.attemptId,
        outcome: "clean",
        evaluation: expect.objectContaining({
          diagnosis: "Deterministic evaluator",
          coaching_summary: "Deterministic summary.",
        }),
        primarySkill: expect.objectContaining({
          skillId: "hash_map",
          nextDueDate: expect.any(String),
        }),
      }),
    );
  });
  test("overrides outcome to failed when test results have failures", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    // Inject failing test results on the attempt row
    db.update(attempts)
      .set({ testResults: { passed: 2, failed: 1, errors: [] } })
      .where(eq(attempts.id, session.attemptId))
      .run();

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    // The stub evaluator would return "clean" (all steps filled), but the
    // test-result override should force it to "failed".
    expect(result.outcome).toBe("failed");
    // The stored evaluation preserves the original evaluator outcome
    expect(result.evaluation.outcome).toBe("clean");
  });
  test("overrides outcome to failed when test results have errors", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    saveSessionStep(
      { db, now: createNow("2026-04-08T12:01:00.000Z") },
      { sessionId: session.sessionId, stepId: "understanding", content: "work" },
    );

    db.update(attempts)
      .set({ testResults: { passed: 0, failed: 0, errors: ["SyntaxError: invalid syntax"] } })
      .where(eq(attempts.id, session.attemptId))
      .run();

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    expect(result.outcome).toBe("failed");
  });
  test("preserves evaluator outcome when testResults is null", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    // testResults is null by default (no execution)
    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    expect(result.outcome).toBe("clean");
  });
  test("preserves evaluator outcome when all tests pass", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    db.update(attempts)
      .set({ testResults: { passed: 5, failed: 0, errors: [] } })
      .where(eq(attempts.id, session.attemptId))
      .run();

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    expect(result.outcome).toBe("clean");
  });
  test("overrides assisted to failed when tests fail", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    // Fill only some steps so the stub evaluator returns "assisted"
    saveSessionStep(
      { db, now: createNow("2026-04-08T12:01:00.000Z") },
      { sessionId: session.sessionId, stepId: "understanding", content: "work" },
    );

    db.update(attempts)
      .set({ testResults: { passed: 1, failed: 2, errors: [] } })
      .where(eq(attempts.id, session.attemptId))
      .run();

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    // Evaluator would say "assisted", but tests failed → override to "failed"
    expect(result.evaluation.outcome).toBe("assisted");
    expect(result.outcome).toBe("failed");
  });
  test("computes and persists attempt features", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    const persistedAttempt = db
      .select()
      .from(attempts)
      .where(eq(attempts.id, session.attemptId))
      .get();

    const features = persistedAttempt?.attemptFeatures as Record<string, unknown> | null;
    expect(features).not.toBeNull();
    expect(features?.step_completion_rate).toBe(1); // 3/3 steps filled
    expect(features?.coach_turns).toBe(0);
    expect(features?.solution_revealed).toBe(false);
    expect(features?.tests_passed).toBeNull(); // no executor
  });
  test("gave_full_solution overrides outcome to failed", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    // Inject coaching messages with gave_full_solution
    db.update(sessions)
      .set({
        messages: [
          { role: "user", content: "help", createdAt: "2026-04-08T12:04:00Z" },
          { role: "assistant", content: "Here is the solution.", createdAt: "2026-04-08T12:04:01Z", metadata: { help_level: 1.0, information_revealed: ["full_solution"], user_appears_stuck: true, user_understanding: "confused", notable_mistake: null, gave_full_solution: true } },
        ],
      })
      .where(eq(sessions.id, session.sessionId))
      .run();

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    // Stub evaluator returns "clean" (all steps filled), but gave_full_solution overrides
    expect(result.outcome).toBe("failed");
  });
  test("high help_level caps outcome at assisted", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    // Inject messages with high help_level (avg > 0.7)
    db.update(sessions)
      .set({
        messages: [
          { role: "user", content: "help 1", createdAt: "2026-04-08T12:04:00Z" },
          { role: "assistant", content: "hint 1", createdAt: "2026-04-08T12:04:01Z", metadata: { help_level: 0.8, information_revealed: ["approach_outline"], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false } },
          { role: "user", content: "help 2", createdAt: "2026-04-08T12:05:00Z" },
          { role: "assistant", content: "hint 2", createdAt: "2026-04-08T12:05:01Z", metadata: { help_level: 0.9, information_revealed: ["fix_code"], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false } },
        ],
      })
      .where(eq(sessions.id, session.sessionId))
      .run();

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    // Stub evaluator returns "clean", but avg help_level 0.85 > 0.7 → capped at "assisted"
    expect(result.outcome).toBe("assisted");
  });

  test("M4 AC-4 executable DSA sessions without a test run are capped at assisted", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const executableConfig = {
      ...createConfig(),
      executor: { type: "python-subprocess" as const, timeout_ms: 5000, memory_mb: 256 },
      test_harness_template: "run tests",
    };
    db.update(learnspaces)
      .set({ config: executableConfig as Record<string, unknown> })
      .where(eq(learnspaces.id, learnspaceId))
      .run();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    expect(result.outcome).toBe("assisted");
    const persistedAttempt = db.select().from(attempts).where(eq(attempts.id, session.attemptId)).get();
    const features = persistedAttempt?.attemptFeatures as Record<string, unknown> | null;
    expect(features?.execution_required).toBe(true);
    expect(features?.execution_present).toBe(false);
  });
  test("low step completion rate forces outcome to failed", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    // Only save 1 step — rate = 1/3 = 0.33 which is >= 0.3, need 0 steps to trigger
    // Actually the config has 3 steps, 0 steps means 0.0 < 0.3 → failed

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    expect(result.outcome).toBe("failed");
  });
  test("handles completion with no coaching interactions", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    // No coaching → no overrides fire, all steps filled → "clean"
    expect(result.outcome).toBe("clean");
    const persistedAttempt = db.select().from(attempts).where(eq(attempts.id, session.attemptId)).get();
    const features = persistedAttempt?.attemptFeatures as Record<string, unknown> | null;
    expect(features?.coach_turns).toBe(0);
    expect(features?.solution_revealed).toBe(false);
    expect(features?.total_help_level).toBe(0);
  });
  test("override precedence: failed beats assisted", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    // Inject both: failing tests AND high help level AND gave_full_solution
    db.update(attempts)
      .set({ testResults: { passed: 1, failed: 2, errors: [] } })
      .where(eq(attempts.id, session.attemptId))
      .run();
    db.update(sessions)
      .set({
        messages: [
          { role: "user", content: "help", createdAt: "2026-04-08T12:04:00Z" },
          { role: "assistant", content: "solution", createdAt: "2026-04-08T12:04:01Z", metadata: { help_level: 1.0, information_revealed: ["full_solution"], user_appears_stuck: true, user_understanding: "confused", notable_mistake: null, gave_full_solution: true } },
        ],
      })
      .where(eq(sessions.id, session.sessionId))
      .run();

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    // Multiple overrides all point to "failed"
    expect(result.outcome).toBe("failed");
  });

  test("AC-1 persists normalized coaching summary on completed attempts", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    db.update(sessions)
      .set({
        messages: [
          { role: "user", content: "help", createdAt: "2026-04-08T12:04:00Z" },
          {
            role: "assistant",
            content: "Try a hash map.",
            createdAt: "2026-04-08T12:04:01Z",
            metadata: {
              help_level: 0.4,
              information_revealed: ["pattern_hint", "edge_case"],
              user_appears_stuck: true,
              user_understanding: "partial",
              notable_mistake: "missed duplicates",
              gave_full_solution: false,
            },
          },
          { role: "user", content: "more help", createdAt: "2026-04-08T12:05:00Z" },
          {
            role: "assistant",
            content: "Watch duplicate handling again.",
            createdAt: "2026-04-08T12:05:01Z",
            metadata: {
              help_level: 0.8,
              information_revealed: ["complexity_hint", "edge_case"],
              user_appears_stuck: false,
              user_understanding: "solid",
              notable_mistake: "missed duplicates",
              gave_full_solution: false,
            },
          },
        ],
      })
      .where(eq(sessions.id, session.sessionId))
      .run();

    await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    const persistedAttempt = db
      .select()
      .from(attempts)
      .where(eq(attempts.id, session.attemptId))
      .get();

    expect(persistedAttempt?.coachingMetadata).toEqual({
      coach_turns: 2,
      avg_help_level: 0.6,
      max_help_level: 0.8,
      stuck_turns: 1,
      full_solution_turns: 0,
      latest_understanding: "solid",
      recurring_notable_mistakes: ["missed duplicates"],
      information_revealed: ["complexity_hint", "edge_case", "pattern_hint"],
    });
  });

  test("AC-3 existing outcome overrides still apply after coaching summary persistence", async () => {
    const fullSolutionFixture = seedCompletionFixture();
    const fullSolutionSession = createSession(
      { db: fullSolutionFixture.db, now: createNow("2026-04-08T12:00:00.000Z") },
      {
        userId: fullSolutionFixture.userId,
        learnspaceId: fullSolutionFixture.learnspaceId,
        itemId: "item-primary",
      },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db: fullSolutionFixture.db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: fullSolutionSession.sessionId, stepId, content: `${stepId} content` },
      );
    }

    fullSolutionFixture.db.update(sessions)
      .set({
        messages: [
          {
            role: "assistant",
            content: "Here is the full solution.",
            createdAt: "2026-04-08T12:04:01Z",
            metadata: {
              help_level: 1,
              information_revealed: ["full_solution"],
              user_appears_stuck: true,
              user_understanding: "confused",
              notable_mistake: null,
              gave_full_solution: true,
            },
          },
        ],
      })
      .where(eq(sessions.id, fullSolutionSession.sessionId))
      .run();

    const fullSolutionResult = await completeSessionAttempt(
      createCompletionDependencies(fullSolutionFixture.db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: fullSolutionSession.sessionId },
    );

    expect(fullSolutionResult.outcome).toBe("failed");

    const highHelpFixture = seedCompletionFixture();
    const highHelpSession = createSession(
      { db: highHelpFixture.db, now: createNow("2026-04-08T12:20:00.000Z") },
      {
        userId: highHelpFixture.userId,
        learnspaceId: highHelpFixture.learnspaceId,
        itemId: "item-primary",
      },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db: highHelpFixture.db, now: createNow(`2026-04-08T12:2${index + 1}:00.000Z`) },
        { sessionId: highHelpSession.sessionId, stepId, content: `${stepId} content` },
      );
    }

    highHelpFixture.db.update(sessions)
      .set({
        messages: [
          {
            role: "assistant",
            content: "Hint one.",
            createdAt: "2026-04-08T12:24:01Z",
            metadata: {
              help_level: 0.8,
              information_revealed: ["pattern_hint"],
              user_appears_stuck: false,
              user_understanding: "partial",
              notable_mistake: null,
              gave_full_solution: false,
            },
          },
          {
            role: "assistant",
            content: "Hint two.",
            createdAt: "2026-04-08T12:25:01Z",
            metadata: {
              help_level: 0.9,
              information_revealed: ["fix_code"],
              user_appears_stuck: false,
              user_understanding: "partial",
              notable_mistake: null,
              gave_full_solution: false,
            },
          },
        ],
      })
      .where(eq(sessions.id, highHelpSession.sessionId))
      .run();

    const highHelpResult = await completeSessionAttempt(
      createCompletionDependencies(highHelpFixture.db, createNow("2026-04-08T12:30:00.000Z")),
      { sessionId: highHelpSession.sessionId },
    );

    expect(highHelpResult.outcome).toBe("assisted");
  });

  test("EC-1 writes zeroed coaching summary when no coach turns occurred", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    const persistedAttempt = db
      .select()
      .from(attempts)
      .where(eq(attempts.id, session.attemptId))
      .get();

    expect(persistedAttempt?.coachingMetadata).toEqual({
      coach_turns: 0,
      avg_help_level: 0,
      max_help_level: 0,
      stuck_turns: 0,
      full_solution_turns: 0,
      latest_understanding: null,
      recurring_notable_mistakes: [],
      information_revealed: [],
    });
  });

  test("AC-1 completion persists deterministic trend for the primary skill", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    seedPrimaryTrendHistory(db, {
      learnspaceId,
      userId,
      outcomes: ["failed", "failed", "assisted", "assisted", "clean"],
    });

    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    const primary = db
      .select()
      .from(skillConfidence)
      .where(eq(skillConfidence.skillId, "hash_map"))
      .get();

    expect(result.primarySkill.trend).toBe("improving");
    expect(primary?.trend).toBe("improving");
  });

  test("EC-1 secondary skill updates do not overwrite primary trend classification", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    seedPrimaryTrendHistory(db, {
      learnspaceId,
      userId,
      outcomes: ["failed", "failed", "assisted", "assisted", "clean"],
    });
    db.update(skillConfidence)
      .set({
        score: 2,
        totalAttempts: 4,
        cleanSolves: 0,
        assistedSolves: 1,
        failedAttempts: 3,
        lastPracticedAt: "2026-04-04T00:10:00.000Z",
        trend: "declining",
      })
      .where(eq(skillConfidence.skillId, "sliding_window"))
      .run();

    const session = createSession(
      { db, now: createNow("2026-04-08T12:20:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:2${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:30:00.000Z")),
      { sessionId: session.sessionId },
    );

    const primary = db
      .select()
      .from(skillConfidence)
      .where(eq(skillConfidence.skillId, "hash_map"))
      .get();
    const secondary = db
      .select()
      .from(skillConfidence)
      .where(eq(skillConfidence.skillId, "sliding_window"))
      .get();

    expect(primary?.trend).toBe("improving");
    expect(secondary?.trend).toBe("declining");
  });

  test("EC-1 existing assistant messages without coachAction remain readable", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    // Persist messages: mix of old-style (no coachAction) and new-style (with coachAction)
    db.update(sessions)
      .set({
        messages: [
          { role: "user", content: "help me", createdAt: "2026-04-08T12:00:01Z" },
          {
            role: "assistant",
            content: "Sure!",
            createdAt: "2026-04-08T12:00:02Z",
            metadata: { help_level: 0.3, information_revealed: ["hint_a"], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false },
            // No coachAction — old-style message
          },
          { role: "user", content: "what about edge cases?", createdAt: "2026-04-08T12:00:03Z" },
          {
            role: "assistant",
            content: "Think about duplicates.",
            createdAt: "2026-04-08T12:00:04Z",
            metadata: { help_level: 0.4, information_revealed: ["edge_case"], user_appears_stuck: false, user_understanding: "solid", notable_mistake: null, gave_full_solution: false },
            coachAction: "give_hint", // New-style message with coachAction
          },
        ],
      })
      .where(eq(sessions.id, session.sessionId))
      .run();

    // Completion should work fine — both old and new message formats
    await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    const persistedAttempt = db
      .select()
      .from(attempts)
      .where(eq(attempts.id, session.attemptId))
      .get();

    // The coaching summary should include metadata from both messages
    const coachingMeta = persistedAttempt?.coachingMetadata as Record<string, unknown>;
    expect(coachingMeta.coach_turns).toBe(2);
    expect(coachingMeta.information_revealed).toContain("hint_a");
    expect(coachingMeta.information_revealed).toContain("edge_case");
  });

  test("ERR-1 trend remains null when not enough history exists", async () => {
    const { db, userId, learnspaceId } = seedCompletionFixture();
    const session = createSession(
      { db, now: createNow("2026-04-08T12:00:00.000Z") },
      { userId, learnspaceId, itemId: "item-primary" },
    );

    for (const [index, stepId] of ["understanding", "approach", "code"].entries()) {
      saveSessionStep(
        { db, now: createNow(`2026-04-08T12:0${index + 1}:00.000Z`) },
        { sessionId: session.sessionId, stepId, content: `${stepId} content` },
      );
    }

    const result = await completeSessionAttempt(
      createCompletionDependencies(db, createNow("2026-04-08T12:10:00.000Z")),
      { sessionId: session.sessionId },
    );

    const primary = db
      .select()
      .from(skillConfidence)
      .where(eq(skillConfidence.skillId, "hash_map"))
      .get();

    expect(result.primarySkill.trend).toBeNull();
    expect(primary?.trend).toBeNull();
  });
});
