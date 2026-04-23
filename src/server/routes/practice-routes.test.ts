import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { vi } from "vitest";
import * as coachMemory from "../ai/coach-memory.js";
import type { AppServices } from "../runtime-services.js";
import { createApp } from "../index.js";
import { createDatabase } from "../persistence/db.js";
import { attempts, itemQueue, queue, sessions, skillConfidence } from "../persistence/schema.js";
import { createStubCoachRuntime, type CoachRuntime } from "../ai/coach-runtime.js";
import type { CoachRuntimeState } from "../core/sessions.js";

async function createClientDist(
  html = "<!doctype html><html><body><div id=\"root\"></div></body></html>",
) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "codence-client-"));
  await writeFile(path.join(dir, "index.html"), html, "utf8");
  return dir;
}

async function createTempDbPath(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "codence-db-"));
  return path.join(dir, "codence.sqlite");
}

describe("practice routes", () => {
  test("AC-4 complete route payload stays compatible with the shipped practice UI flow", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const evaluationService: AppServices["evaluationService"] = {
      evaluateAttempt: () => ({
        outcome: "clean",
        diagnosis: "route override",
        severity: "minor",
        approach_correct: true,
        per_step_quality: {
          code: "strong",
        },
        mistakes: [],
        strengths: ["route override"],
        coaching_summary: "Route-compatible summary.",
        evaluation_source: "llm",
        retry_recovered: false,
      }),
    };
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { evaluationService },
    });

    try {
      await app.inject({
        method: "POST",
        url: "/api/onboarding",
        payload: { activeTag: null },
      });
      const queueNext = await app.inject({
        method: "POST",
        url: "/api/queue/next",
      });
      const queueBody = queueNext.json();

      // Save enough steps to pass the step_completion_rate threshold (>= 0.3)
      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${queueBody.session.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      const complete = await app.inject({
        method: "POST",
        url: `/api/sessions/${queueBody.session.sessionId}/complete`,
      });

      expect(complete.statusCode).toBe(200);
      expect(complete.json()).toEqual(
        expect.objectContaining({
          sessionId: queueBody.session.sessionId,
          attemptId: queueBody.session.attemptId,
          outcome: "assisted",
          evaluation: expect.objectContaining({
            outcome: "clean",
            diagnosis: "route override",
            coaching_summary: "Route-compatible summary.",
          }),
          primarySkill: expect.objectContaining({
            skillId: expect.any(String),
            score: expect.any(Number),
            nextDueDate: expect.any(String),
          }),
        }),
      );
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("AC-2 returns typed success payloads for onboarding queue session completion and progress routes", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      const onboarding = await app.inject({
        method: "POST",
        url: "/api/onboarding",
        payload: { activeTag: null },
      });
      const onboardingBody = onboarding.json();

      const queueNext = await app.inject({
        method: "POST",
        url: "/api/queue/next",
      });
      const queueBody = queueNext.json();

      // Save enough steps for completion override threshold
      for (const stepId of ["understanding", "approach"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${queueBody.session.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      const autosave = await app.inject({
        method: "PATCH",
        url: `/api/sessions/${queueBody.session.sessionId}/step`,
        payload: {
          stepId: "code",
          content: "def climb_stairs(n): return n",
        },
      });
      const complete = await app.inject({
        method: "POST",
        url: `/api/sessions/${queueBody.session.sessionId}/complete`,
      });
      const progress = await app.inject({
        method: "GET",
        url: "/api/progress",
      });

      expect(onboarding.statusCode).toBe(200);
      expect(onboardingBody).toEqual({
        userId: expect.any(String),
        learnspaceId: "coding-interview-patterns",
        activeTag: null,
        llmConfigured: false,
        coachConfigured: false,
        completionConfigured: false,
      });
      expect(queueNext.statusCode).toBe(200);
      expect(queueBody).toEqual({
        session: expect.objectContaining({
          sessionId: expect.any(String),
          attemptId: expect.any(String),
          learnspaceId: "coding-interview-patterns",
          status: "created",
        }),
        selection: expect.objectContaining({
          queueId: expect.any(String),
          skillId: expect.any(String),
          skillName: expect.any(String),
          item: expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            difficulty: expect.stringMatching(/^(easy|medium|hard)$/),
          }),
        }),
      });
      expect(autosave.statusCode).toBe(200);
      expect(autosave.json()).toEqual(
        expect.objectContaining({
          sessionId: queueBody.session.sessionId,
          currentStep: "code",
          status: "in_progress",
        }),
      );
      expect(complete.statusCode).toBe(200);
      expect(complete.json()).toEqual(
        expect.objectContaining({
          sessionId: queueBody.session.sessionId,
          attemptId: queueBody.session.attemptId,
          outcome: expect.stringMatching(/^(clean|assisted|failed)$/),
          evaluation: expect.objectContaining({
            outcome: expect.stringMatching(/^(clean|assisted|failed)$/),
            coaching_summary: expect.any(String),
          }),
          primarySkill: expect.objectContaining({
            skillId: expect.any(String),
            score: expect.any(Number),
            nextDueDate: expect.any(String),
          }),
        }),
      );
      expect(progress.statusCode).toBe(200);
      expect(progress.json()).toEqual(
        expect.objectContaining({
          learnspace: expect.objectContaining({
            id: "coding-interview-patterns",
            activeTag: null,
          }),
          skills: expect.any(Array),
          recentAttempts: expect.any(Array),
        }),
      );
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("AC-3 exercises onboarding queue-next step autosave completion and progress end-to-end with the real temp database", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      const onboarding = await app.inject({
        method: "POST",
        url: "/api/onboarding",
        payload: { activeTag: null },
      });
      expect(onboarding.statusCode).toBe(200);

      const queueNext = await app.inject({
        method: "POST",
        url: "/api/queue/next",
      });
      const queueBody = queueNext.json();
      expect(typeof queueBody.selection.skillId).toBe("string");
      expect(typeof queueBody.selection.item.title).toBe("string");

      // Save enough steps to pass step_completion_rate threshold
      for (const stepId of ["understanding", "approach"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${queueBody.session.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      const autosave = await app.inject({
        method: "PATCH",
        url: `/api/sessions/${queueBody.session.sessionId}/step`,
        payload: {
          stepId: "code",
          content: "def climb_stairs(n): return n",
        },
      });
      expect(autosave.statusCode).toBe(200);

      const complete = await app.inject({
        method: "POST",
        url: `/api/sessions/${queueBody.session.sessionId}/complete`,
      });
      const completionBody = complete.json();
      expect(complete.statusCode).toBe(200);
      // 3 of 6 steps filled (50%) → stub evaluator returns "assisted" (not all steps), no override
      expect(completionBody.outcome).toBe("assisted");

      const progress = await app.inject({
        method: "GET",
        url: "/api/progress",
      });
      const progressBody = progress.json();

      expect(progressBody.recentAttempts).toHaveLength(1);
      expect(progressBody.recentAttempts[0]).toEqual(
        expect.objectContaining({
          attemptId: queueBody.session.attemptId,
          itemTitle: expect.any(String),
          outcome: "assisted",
          primarySkillId: queueBody.selection.skillId,
        }),
      );
      expect(
        progressBody.skills.find((skill: { skillId: string }) => skill.skillId === queueBody.selection.skillId),
      ).toEqual(
        expect.objectContaining({
          totalAttempts: 1,
          lastOutcome: "assisted",
        }),
      );
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("EC-1 queue-next auto-abandons stale sessions before returning replacement work", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const firstApp = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await firstApp.inject({
        method: "POST",
        url: "/api/onboarding",
        payload: { activeTag: null },
      });
      const firstQueue = await firstApp.inject({
        method: "POST",
        url: "/api/queue/next",
      });
      const firstSessionId = firstQueue.json().session.sessionId;

      await firstApp.close();

      const secondApp = await createApp({
        clientDistDir,
        dbPath,
        now: () => new Date("2026-04-09T13:00:00.000Z"),
      });

      try {
        const replacement = await secondApp.inject({
          method: "POST",
          url: "/api/queue/next",
        });
        const replacementBody = replacement.json();
        const staleSession = await secondApp.inject({
          method: "GET",
          url: `/api/sessions/${firstSessionId}`,
        });

        expect(replacement.statusCode).toBe(200);
        expect(replacementBody.session.sessionId).not.toBe(firstSessionId);
        expect(staleSession.statusCode).toBe(200);
        expect(staleSession.json()).toEqual(
          expect.objectContaining({
            sessionId: firstSessionId,
            status: "abandoned",
          }),
        );
      } finally {
        await secondApp.close();
      }
    } finally {
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("ERR-1 returns 404 json errors for unknown learnspace and session ids", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      const learnspaceResponse = await app.inject({
        method: "GET",
        url: "/api/learnspaces/missing-learnspace",
      });
      const sessionResponse = await app.inject({
        method: "GET",
        url: "/api/sessions/missing-session",
      });

      expect(learnspaceResponse.statusCode).toBe(404);
      expect(learnspaceResponse.json()).toEqual({
        error: "Learnspace not found",
      });
      expect(sessionResponse.statusCode).toBe(404);
      expect(sessionResponse.json()).toEqual({
        error: "Session not found",
      });
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("AC-1 drill-down returns items with solve counts", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const evaluationService: AppServices["evaluationService"] = {
      evaluateAttempt: () => ({
        outcome: "clean",
        diagnosis: "good",
        severity: "minor",
        approach_correct: true,
        per_step_quality: { code: "strong" },
        mistakes: [{ type: "off-by-one", description: "loop bound", step: "code" }],
        strengths: ["clarity"],
        coaching_summary: "Great progress on sliding window.",
        evaluation_source: "llm",
        retry_recovered: false,
      }),
    };
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { evaluationService },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding" });
      const q1 = await app.inject({ method: "POST", url: "/api/queue/next" });
      const q1Body = q1.json();
      const skillId = q1Body.selection.skillId;

      // Complete session to create an attempt
      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${q1Body.session.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      await app.inject({
        method: "POST",
        url: `/api/sessions/${q1Body.session.sessionId}/complete`,
      });

      const drilldown = await app.inject({
        method: "GET",
        url: `/api/skills/${skillId}/drilldown`,
      });

      expect(drilldown.statusCode).toBe(200);
      const body = drilldown.json();
      expect(body.skillId).toBe(skillId);
      expect(body.itemsPracticed.length).toBeGreaterThan(0);
      expect(body.itemsPracticed[0]).toEqual(
        expect.objectContaining({
          itemId: expect.any(String),
          title: expect.any(String),
          solveCount: expect.any(Number),
        }),
      );
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("AC-2 drill-down returns mistake patterns", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const evaluationService: AppServices["evaluationService"] = {
      evaluateAttempt: () => ({
        outcome: "assisted",
        diagnosis: "some issues",
        severity: "moderate",
        approach_correct: true,
        per_step_quality: { code: "partial" },
        mistakes: [{ type: "off-by-one", description: "loop bound", step: "code" }],
        strengths: [],
        coaching_summary: "Watch your loop bounds.",
        evaluation_source: "llm",
        retry_recovered: false,
      }),
    };
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { evaluationService },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding" });
      const q1 = await app.inject({ method: "POST", url: "/api/queue/next" });
      const q1Body = q1.json();
      const skillId = q1Body.selection.skillId;

      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${q1Body.session.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      await app.inject({
        method: "POST",
        url: `/api/sessions/${q1Body.session.sessionId}/complete`,
      });

      const drilldown = await app.inject({
        method: "GET",
        url: `/api/skills/${skillId}/drilldown`,
      });

      const body = drilldown.json();
      expect(body.commonMistakes.length).toBeGreaterThan(0);
      expect(body.commonMistakes[0]).toEqual(
        expect.objectContaining({
          type: expect.any(String),
          count: expect.any(Number),
        }),
      );
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("AC-3 drill-down returns coaching insights", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const evaluationService: AppServices["evaluationService"] = {
      evaluateAttempt: () => ({
        outcome: "clean",
        diagnosis: "good",
        severity: "minor",
        approach_correct: true,
        per_step_quality: { code: "strong" },
        mistakes: [],
        strengths: ["clarity"],
        coaching_summary: "Your invariant precision improved.",
        evaluation_source: "llm",
        retry_recovered: false,
      }),
    };
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { evaluationService },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding" });
      const q1 = await app.inject({ method: "POST", url: "/api/queue/next" });
      const q1Body = q1.json();
      const skillId = q1Body.selection.skillId;

      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${q1Body.session.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      await app.inject({
        method: "POST",
        url: `/api/sessions/${q1Body.session.sessionId}/complete`,
      });

      const drilldown = await app.inject({
        method: "GET",
        url: `/api/skills/${skillId}/drilldown`,
      });

      const body = drilldown.json();
      expect(body.coachingInsights.length).toBeGreaterThan(0);
      expect(typeof body.coachingInsights[0]).toBe("string");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-2 drilldown reuses coach memory snapshot for mistakes and insights", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const snapshotSpy = vi
      .spyOn(coachMemory, "loadCoachMemorySnapshot")
      .mockReturnValue({
        skillId: "arrays_and_hashing",
        score: 8,
        totalAttempts: 5,
        cleanSolves: 3,
        assistedSolves: 1,
        failedAttempts: 1,
        trend: "declining",
        topMistakes: ["forced-from-snapshot"],
        commonMistakes: [
          { type: "forced-from-snapshot", count: 7, severity: "critical" },
        ],
        recentInsights: ["Snapshot insight from shared projection."],
        coachingPatterns: {
          avgHelpLevel: 0.75,
          fullSolutionRate: 0.2,
          stuckRate: 0.4,
          latestUnderstanding: "partial",
          recurringNotableMistakes: ["forced-from-snapshot"],
        },
      });
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding" });
      const queueNext = await app.inject({ method: "POST", url: "/api/queue/next" });
      const skillId = queueNext.json().selection.skillId as string;

      const drilldown = await app.inject({
        method: "GET",
        url: `/api/skills/${skillId}/drilldown`,
      });

      expect(drilldown.statusCode).toBe(200);
      expect(snapshotSpy).toHaveBeenCalled();
      expect(drilldown.json()).toEqual(
        expect.objectContaining({
          trend: "declining",
          commonMistakes: [
            { type: "forced-from-snapshot", count: 7, severity: "critical" },
          ],
          coachingInsights: ["Snapshot insight from shared projection."],
        }),
      );
    } finally {
      snapshotSpy.mockRestore();
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-3 progress surfaces return persisted trend values", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding" });
      const queueNext = await app.inject({ method: "POST", url: "/api/queue/next" });
      const skillId = queueNext.json().selection.skillId as string;
      const db = createDatabase(dbPath);

      db.update(skillConfidence)
        .set({ trend: "stable" })
        .where(eq(skillConfidence.skillId, skillId))
        .run();

      const progress = await app.inject({
        method: "GET",
        url: "/api/progress",
      });
      const drilldown = await app.inject({
        method: "GET",
        url: `/api/skills/${skillId}/drilldown`,
      });

      const progressSkill = progress.json().skills.find(
        (skill: { skillId: string }) => skill.skillId === skillId,
      );

      expect(progressSkill.trend).toBe("stable");
      expect(drilldown.json().trend).toBe("stable");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("AC-4 progress includes estimatedMinutes", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const evaluationService: AppServices["evaluationService"] = {
      evaluateAttempt: () => ({
        outcome: "clean",
        diagnosis: "good",
        severity: "minor",
        approach_correct: true,
        per_step_quality: { code: "strong" },
        mistakes: [],
        strengths: [],
        coaching_summary: "Well done.",
        evaluation_source: "llm",
        retry_recovered: false,
      }),
    };
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { evaluationService },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding" });
      const q1 = await app.inject({ method: "POST", url: "/api/queue/next" });
      const q1Body = q1.json();

      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${q1Body.session.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      await app.inject({
        method: "POST",
        url: `/api/sessions/${q1Body.session.sessionId}/complete`,
      });

      const progress = await app.inject({
        method: "GET",
        url: "/api/progress",
      });

      const body = progress.json();
      expect(body).toHaveProperty("estimatedMinutes");
      // With one completed attempt, should have a numeric estimate
      expect(typeof body.estimatedMinutes).toBe("number");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("EC-1 empty drill-down for unpracticed skill", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding" });

      // Use an existing skill that has no attempts yet
      const drilldown = await app.inject({
        method: "GET",
        url: "/api/skills/dp_1d/drilldown",
      });

      expect(drilldown.statusCode).toBe(200);
      const body = drilldown.json();
      expect(body.itemsPracticed).toEqual([]);
      expect(body.commonMistakes).toEqual([]);
      expect(body.coachingInsights).toEqual([]);
      expect(body.totalAttempts).toBe(0);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("EC-2 null time estimate with no completions", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding" });

      const progress = await app.inject({
        method: "GET",
        url: "/api/progress",
      });

      expect(progress.json().estimatedMinutes).toBeNull();
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("ERR-1 unknown skill returns 404", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding" });

      const drilldown = await app.inject({
        method: "GET",
        url: "/api/skills/nonexistent-skill/drilldown",
      });

      expect(drilldown.statusCode).toBe(404);
      expect(drilldown.json()).toEqual({ error: expect.any(String) });
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-2 evaluation and variant generation remain on the completion adapter", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    // Use a custom evaluation service (completion path) with NO coach runtime
    const evaluationService: AppServices["evaluationService"] = {
      evaluateAttempt: () => ({
        outcome: "clean",
        diagnosis: "completion-only eval",
        severity: "minor",
        approach_correct: true,
        per_step_quality: { code: "strong" },
        mistakes: [],
        strengths: ["uses completion adapter"],
        coaching_summary: "Evaluated via completion path.",
        evaluation_source: "llm",
        retry_recovered: false,
      }),
    };
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { evaluationService },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
      const q1 = await app.inject({ method: "POST", url: "/api/queue/next" });
      const q1Body = q1.json();

      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${q1Body.session.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      const complete = await app.inject({
        method: "POST",
        url: `/api/sessions/${q1Body.session.sessionId}/complete`,
      });

      expect(complete.statusCode).toBe(200);
      expect(complete.json().evaluation.diagnosis).toBe("completion-only eval");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-3 skip, complete, and auto-abandon release and clear coach runtime state", async () => {
    const releaseCalls: Array<{ appSessionId: string; runtimeSessionId: string | null }> = [];
    const coachRuntime: CoachRuntime = {
      async sendTurn(input) {
        return {
          text: "Coaching response.",
          metadata: { help_level: 0.1, information_revealed: [], user_appears_stuck: false, user_understanding: "partial", notable_mistake: null, gave_full_solution: false },
          runtimeSessionId: "claude-session-for-release",
          backend: "claude-code",
        };
      },
      async releaseSession(input) {
        releaseCalls.push(input);
      },
    };
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { coachRuntime },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });

      // Session 1: coach then complete → should release
      const q1 = await app.inject({ method: "POST", url: "/api/queue/next" });
      const s1Id = q1.json().session.sessionId;
      await app.inject({
        method: "POST",
        url: `/api/sessions/${s1Id}/coach`,
        payload: { message: "Help me", currentStepId: "understanding" },
      });
      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${s1Id}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      releaseCalls.length = 0;
      await app.inject({ method: "POST", url: `/api/sessions/${s1Id}/complete` });

      // Verify release was called for complete
      expect(releaseCalls.some(c => c.runtimeSessionId === "claude-session-for-release")).toBe(true);

      // Verify runtime state was cleared
      const db = createDatabase(dbPath);
      const row1 = db.select().from(sessions).where(eq(sessions.id, s1Id)).get();
      expect(row1?.coachRuntimeState).toBeNull();

      // Session 2: coach then skip → should release
      const q2 = await app.inject({ method: "POST", url: "/api/queue/next" });
      const s2Id = q2.json().session.sessionId;
      await app.inject({
        method: "POST",
        url: `/api/sessions/${s2Id}/coach`,
        payload: { message: "Help again", currentStepId: "understanding" },
      });
      releaseCalls.length = 0;
      await app.inject({ method: "POST", url: `/api/sessions/${s2Id}/skip` });

      expect(releaseCalls.some(c => c.runtimeSessionId === "claude-session-for-release")).toBe(true);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("EC-1 onboarding reports coach and completion availability independently", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { coachRuntime: createStubCoachRuntime() },
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/onboarding",
        payload: { activeTag: null },
      });

      const body = response.json();
      expect(body).toHaveProperty("coachConfigured");
      expect(body).toHaveProperty("completionConfigured");
      // Stub coach runtime IS configured (it's a real implementation, not unconfigured)
      expect(body.coachConfigured).toBe(true);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("AC-1 cleanup releases expired coach runtime sessions from queue-next and coach entry points", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const releaseSpy = vi.fn().mockResolvedValue(undefined);
    const coachRuntime: CoachRuntime = {
      async sendTurn() {
        return {
          text: "stub",
          metadata: null,
          runtimeSessionId: "rt-old",
          backend: "stub" as const,
        };
      },
      releaseSession: releaseSpy,
    };
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { coachRuntime },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
      const qn1 = await app.inject({ method: "POST", url: "/api/queue/next" });
      const sess1 = qn1.json().session;

      // Send a coach turn to create runtime state
      await app.inject({
        method: "POST",
        url: `/api/sessions/${sess1.sessionId}/coach`,
        payload: { message: "Help", currentStepId: "understanding" },
      });

      // Verify runtime state exists
      const db1 = createDatabase(dbPath);
      const row1 = db1.select().from(sessions).where(eq(sessions.id, sess1.sessionId)).get();
      expect((row1?.coachRuntimeState as CoachRuntimeState | null)?.runtimeSessionId).toBe("rt-old");

      // Now get the next queue item — this abandons the old session and should trigger cleanup
      // The old session had runtime state that gets cleared via abandonOpenSessions
      const qn2 = await app.inject({ method: "POST", url: "/api/queue/next" });
      expect(qn2.statusCode).toBe(200);

      // The abandoned session's runtime state should be cleared
      const db2 = createDatabase(dbPath);
      const row2 = db2.select().from(sessions).where(eq(sessions.id, sess1.sessionId)).get();
      expect(row2?.coachRuntimeState).toBeNull();
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-2 cleanup clears runtime state without deleting transcript or drafts", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const coachRuntime: CoachRuntime = {
      async sendTurn() {
        return {
          text: "coaching response",
          metadata: { help_level: 0.2, information_revealed: [], user_appears_stuck: false, user_understanding: "partial" as const, notable_mistake: null, gave_full_solution: false },
          runtimeSessionId: "rt-keep",
          backend: "stub" as const,
        };
      },
      async releaseSession() {},
    };
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { coachRuntime },
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
      const qn1 = await app.inject({ method: "POST", url: "/api/queue/next" });
      const sess1 = qn1.json().session;

      // Coach turn to create runtime state and messages
      await app.inject({
        method: "POST",
        url: `/api/sessions/${sess1.sessionId}/coach`,
        payload: { message: "question", currentStepId: "understanding" },
      });

      // Autosave a step draft
      await app.inject({
        method: "PATCH",
        url: `/api/sessions/${sess1.sessionId}/step`,
        payload: { stepId: "understanding", content: "My draft content" },
      });

      // Verify messages and drafts exist
      const db1 = createDatabase(dbPath);
      const row1 = db1.select().from(sessions).where(eq(sessions.id, sess1.sessionId)).get();
      expect((row1?.messages as unknown[])?.length).toBeGreaterThan(0);
      expect((row1?.stepInteractions as Record<string, unknown>)?.understanding).toBeTruthy();

      // Trigger abandon via queue/next → clears runtime state
      await app.inject({ method: "POST", url: "/api/queue/next" });

      // Verify: runtime state cleared, but messages and drafts preserved
      const db2 = createDatabase(dbPath);
      const row2 = db2.select().from(sessions).where(eq(sessions.id, sess1.sessionId)).get();
      expect(row2?.coachRuntimeState).toBeNull();
      expect((row2?.messages as unknown[])?.length).toBeGreaterThan(0);
      expect((row2?.stepInteractions as Record<string, unknown>)?.understanding).toBeTruthy();
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-1 health diagnostics report coach and completion backend status", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      const response = await app.inject({ method: "GET", url: "/api/health" });
      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.status).toBe("ok");
      expect(body.diagnostics).toBeTruthy();
      expect(typeof body.diagnostics.coach.configured).toBe("boolean");
      expect(typeof body.diagnostics.completion.configured).toBe("boolean");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-2 health diagnostics include session reuse and expiration counters", async () => {
    const { resetProcessCounters } = await import("../ai/runtime-diagnostics.js");
    resetProcessCounters();
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: { coachRuntime: createStubCoachRuntime() },
    });

    try {
      // Set up session and send coach turns
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
      const qn = await app.inject({ method: "POST", url: "/api/queue/next" });
      const sess = qn.json().session;

      // First turn — starts a runtime session
      await app.inject({
        method: "POST",
        url: `/api/sessions/${sess.sessionId}/coach`,
        payload: { message: "Help", currentStepId: "understanding" },
      });

      // Second turn — resumes the runtime session
      await app.inject({
        method: "POST",
        url: `/api/sessions/${sess.sessionId}/coach`,
        payload: { message: "More help", currentStepId: "understanding" },
      });

      const response = await app.inject({ method: "GET", url: "/api/health" });
      const body = response.json();

      expect(body.diagnostics.coach.activeSessions).toBeGreaterThanOrEqual(1);
      expect(body.diagnostics.coach.resumedTurns).toBeGreaterThanOrEqual(1);
      expect(typeof body.diagnostics.coach.expiredSessionsCleared).toBe("number");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("EC-1 unconfigured environments still return a valid diagnostics payload", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    // Pass explicit unconfigured runtimes
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
      services: {
        coachConfigured: false,
        completionConfigured: false,
      },
    });

    try {
      const response = await app.inject({ method: "GET", url: "/api/health" });
      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.diagnostics.coach.configured).toBe(false);
      expect(body.diagnostics.coach.activeSessions).toBe(0);
      expect(body.diagnostics.completion.configured).toBe(false);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("ERR-1 diagnostics route returns default values before any runtime activity", async () => {
    const { resetProcessCounters } = await import("../ai/runtime-diagnostics.js");
    resetProcessCounters();
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      const response = await app.inject({ method: "GET", url: "/api/health" });
      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.diagnostics.coach.activeSessions).toBe(0);
      expect(body.diagnostics.coach.expiredSessionsCleared).toBe(0);
      expect(body.diagnostics.coach.resumedTurns).toBe(0);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("ERR-2 returns 400 json errors for invalid step payloads and unsupported onboarding tags", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      const badOnboarding = await app.inject({
        method: "POST",
        url: "/api/onboarding",
        payload: { activeTag: "unsupported-company" },
      });

      await app.inject({
        method: "POST",
        url: "/api/onboarding",
        payload: { activeTag: null },
      });
      const queueNext = await app.inject({
        method: "POST",
        url: "/api/queue/next",
      });
      const sessionId = queueNext.json().session.sessionId;

      const badStep = await app.inject({
        method: "PATCH",
        url: `/api/sessions/${sessionId}/step`,
        payload: {
          stepId: "",
          content: "draft",
        },
      });

      expect(badOnboarding.statusCode).toBe(400);
      expect(badOnboarding.json()).toEqual({
        error: "Unsupported activeTag",
      });
      expect(badStep.statusCode).toBe(400);
      expect(badStep.json()).toEqual({
        error: "Invalid session step payload",
      });
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-1 queue route accepts explicit track ids", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });

      const response = await app.inject({
        method: "POST",
        url: "/api/queue/next",
        payload: { trackId: "track-coding-interview-patterns-recommended" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.session).toBeDefined();
      expect(body.selection).toBeDefined();
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-3 queue route defaults to the active track when trackId is omitted", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });

      // No body at all
      const noBody = await app.inject({
        method: "POST",
        url: "/api/queue/next",
      });
      expect(noBody.statusCode).toBe(200);

      // Complete that session first
      const sess1 = noBody.json().session;
      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${sess1.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      await app.inject({ method: "POST", url: `/api/sessions/${sess1.sessionId}/complete` });

      // Empty object body
      const emptyBody = await app.inject({
        method: "POST",
        url: "/api/queue/next",
        payload: {},
      });
      expect(emptyBody.statusCode).toBe(200);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("EC-1 queue route ignores unrelated request keys", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });

      const response = await app.inject({
        method: "POST",
        url: "/api/queue/next",
        payload: { trackId: "track-coding-interview-patterns-recommended", extraField: "ignored", anotherKey: 42 },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().session).toBeDefined();
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-1 sessions started from any track still persist attempts confidence and queue updates normally", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });

      // Start session with weakest_pattern track
      const queueNext = await app.inject({
        method: "POST",
        url: "/api/queue/next",
        payload: { trackId: "track-coding-interview-patterns-weakest_pattern" },
      });
      expect(queueNext.statusCode).toBe(200);
      const sess = queueNext.json().session;
      const skillId = queueNext.json().selection.skillId;

      // Fill steps and complete
      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${sess.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      const complete = await app.inject({
        method: "POST",
        url: `/api/sessions/${sess.sessionId}/complete`,
      });
      expect(complete.statusCode).toBe(200);
      expect(complete.json().outcome).toBeDefined();

      // Verify progress was persisted normally
      const progress = await app.inject({ method: "GET", url: "/api/progress" });
      const progressBody = progress.json();
      expect(progressBody.recentAttempts).toHaveLength(1);
      expect(progressBody.recentAttempts[0].attemptId).toBe(sess.attemptId);
      const skill = progressBody.skills.find((s: { skillId: string }) => s.skillId === skillId);
      expect(skill.totalAttempts).toBe(1);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-2 progress and drilldown remain track agnostic after mixed-track sessions", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });

      // Session 1: recommended (default)
      const q1 = await app.inject({ method: "POST", url: "/api/queue/next" });
      const s1 = q1.json().session;
      const skill1 = q1.json().selection.skillId;
      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${s1.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      await app.inject({ method: "POST", url: `/api/sessions/${s1.sessionId}/complete` });

      // Session 2: weakest_pattern track
      const q2 = await app.inject({
        method: "POST",
        url: "/api/queue/next",
        payload: { trackId: "track-coding-interview-patterns-weakest_pattern" },
      });
      const s2 = q2.json().session;
      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${s2.sessionId}/step`,
          payload: { stepId, content: `${stepId} v2` },
        });
      }
      await app.inject({ method: "POST", url: `/api/sessions/${s2.sessionId}/complete` });

      // Progress should show both attempts without mode-specific buckets
      const progress = await app.inject({ method: "GET", url: "/api/progress" });
      const progressBody = progress.json();
      expect(progressBody.recentAttempts.length).toBeGreaterThanOrEqual(2);

      // Drilldown for the first skill should work normally
      const drilldown = await app.inject({ method: "GET", url: `/api/skills/${skill1}/drilldown` });
      expect(drilldown.statusCode).toBe(200);
      expect(drilldown.json().skillId).toBe(skill1);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("ERR-1 non-default tracks do not introduce new completion failures", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });

      // Start from explore track
      const q = await app.inject({
        method: "POST",
        url: "/api/queue/next",
        payload: { trackId: "track-coding-interview-patterns-explore" },
      });
      expect(q.statusCode).toBe(200);
      const sess = q.json().session;

      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${sess.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }

      // Completion should succeed normally — no mode-originated error
      const complete = await app.inject({
        method: "POST",
        url: `/api/sessions/${sess.sessionId}/complete`,
      });
      expect(complete.statusCode).toBe(200);
      expect(complete.json().outcome).toBeDefined();
      expect(complete.json().primarySkill).toBeDefined();
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-1 progress and drilldown payloads include richer interpreted fields", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });

      // Complete a session to generate data
      const q = await app.inject({ method: "POST", url: "/api/queue/next" });
      const sess = q.json().session;
      const skillId = q.json().selection.skillId;
      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${sess.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      await app.inject({ method: "POST", url: `/api/sessions/${sess.sessionId}/complete` });

      // Check progress has insightsSummary
      const progress = await app.inject({ method: "GET", url: "/api/progress" });
      const progressBody = progress.json();
      expect(progressBody.insightsSummary).toBeDefined();
      expect(progressBody.insightsSummary).toHaveProperty("improvingSkillCount");
      expect(progressBody.insightsSummary).toHaveProperty("decliningSkillCount");

      // Check drilldown has helpDependence and behaviorSummary
      const drilldown = await app.inject({ method: "GET", url: `/api/skills/${skillId}/drilldown` });
      const drilldownBody = drilldown.json();
      expect(drilldownBody.helpDependence).toBeDefined();
      expect(drilldownBody.helpDependence).toHaveProperty("label");
      expect(typeof drilldownBody.behaviorSummary).toBe("string");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-2 interpreted progress fields are derived from existing persisted signals only", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
      const q = await app.inject({ method: "POST", url: "/api/queue/next" });
      const sess = q.json().session;
      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${sess.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      await app.inject({ method: "POST", url: `/api/sessions/${sess.sessionId}/complete` });

      const progress = await app.inject({ method: "GET", url: "/api/progress" });
      const body = progress.json();

      // insightsSummary should have skill IDs that reference actual skills
      const validSkillIds = new Set(body.skills.map((s: { skillId: string }) => s.skillId));
      if (body.insightsSummary.strongestSkillId) {
        expect(validSkillIds.has(body.insightsSummary.strongestSkillId)).toBe(true);
      }
      if (body.insightsSummary.weakestSkillId) {
        expect(validSkillIds.has(body.insightsSummary.weakestSkillId)).toBe(true);
      }
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-3 drilldown exposes user-facing help dependence semantics", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
      const q = await app.inject({ method: "POST", url: "/api/queue/next" });
      const sess = q.json().session;
      const skillId = q.json().selection.skillId;
      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${sess.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      await app.inject({ method: "POST", url: `/api/sessions/${sess.sessionId}/complete` });

      const drilldown = await app.inject({ method: "GET", url: `/api/skills/${skillId}/drilldown` });
      const body = drilldown.json();
      expect(body.helpDependence.label).toMatch(/^(independent|guided|help-heavy)$/);
      expect(typeof body.helpDependence.avgHelpLevel).toBe("number");
      expect(typeof body.helpDependence.fullSolutionRate).toBe("number");
      expect(typeof body.helpDependence.stuckRate).toBe("number");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("EC-1 sparse-history users still receive safe interpreted payload defaults", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });

      // Don't complete any sessions — sparse history
      const progress = await app.inject({ method: "GET", url: "/api/progress" });
      const body = progress.json();
      expect(body.insightsSummary).toBeDefined();
      expect(body.insightsSummary.strongestSkillId).toBeNull();
      expect(body.insightsSummary.weakestSkillId).toBeNull();
      expect(body.insightsSummary.improvingSkillCount).toBe(0);
      expect(body.insightsSummary.decliningSkillCount).toBe(0);

      // Drilldown for any skill should also return safe defaults
      const skillId = body.skills[0]?.skillId;
      if (skillId) {
        const drilldown = await app.inject({ method: "GET", url: `/api/skills/${skillId}/drilldown` });
        const dd = drilldown.json();
        expect(dd.helpDependence.label).toBe("independent");
        expect(dd.behaviorSummary).toBeTruthy();
      }
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("ERR-1 missing memory fields do not break progress routes", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir, dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });

      // Both routes should succeed even with zero history
      const progress = await app.inject({ method: "GET", url: "/api/progress" });
      expect(progress.statusCode).toBe(200);
      expect(progress.json().insightsSummary).toBeDefined();

      const skills = progress.json().skills;
      if (skills.length > 0) {
        const drilldown = await app.inject({ method: "GET", url: `/api/skills/${skills[0].skillId}/drilldown` });
        expect(drilldown.statusCode).toBe(200);
        expect(drilldown.json().helpDependence).toBeDefined();
        expect(drilldown.json().behaviorSummary).toBeDefined();
      }
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("M3 AC-1 skill reset preserves immutable sessions and attempts", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-12T12:00:00.000Z"),
    });

    try {
      await app.inject({ method: "POST", url: "/api/onboarding", payload: { activeTag: null } });
      const queueNext = await app.inject({ method: "POST", url: "/api/queue/next" });
      expect(queueNext.statusCode).toBe(200);
      const queueBody = queueNext.json();
      const skillId = queueBody.selection.skillId;

      for (const stepId of ["understanding", "approach", "code"]) {
        await app.inject({
          method: "PATCH",
          url: `/api/sessions/${queueBody.session.sessionId}/step`,
          payload: { stepId, content: `${stepId} content` },
        });
      }
      const complete = await app.inject({
        method: "POST",
        url: `/api/sessions/${queueBody.session.sessionId}/complete`,
      });
      expect(complete.statusCode).toBe(200);

      const reset = await app.inject({
        method: "POST",
        url: `/api/skills/${skillId}/reset`,
      });
      expect(reset.statusCode).toBe(200);

      const db = createDatabase(dbPath);
      const persistedAttempts = db.select().from(attempts).all();
      const persistedSessions = db.select().from(sessions).all();
      const confidence = db.select().from(skillConfidence).all().find((row) => row.skillId === skillId);
      const skillQueue = db.select().from(queue).all().find((row) => row.skillId === skillId);
      const itemQueues = db.select().from(itemQueue).all().filter((row) => row.skillId === skillId);

      expect(persistedAttempts).toHaveLength(1);
      expect(persistedSessions).toHaveLength(1);
      expect(confidence).toEqual(
        expect.objectContaining({
          score: 0,
          totalAttempts: 0,
          cleanSolves: 0,
          assistedSolves: 0,
          failedAttempts: 0,
          lastPracticedAt: null,
          trend: null,
        }),
      );
      expect(skillQueue).toEqual(expect.objectContaining({ round: 0, dueDate: null, scheduledDate: null, lastOutcome: null }));
      expect(
        itemQueues.every((row) => row.round === 0 && row.dueDate === null && row.scheduledDate === null && row.lastOutcome === null),
      ).toBe(true);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
});
