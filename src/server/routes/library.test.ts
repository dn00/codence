import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../index.js";
import { createStubCompletionLLM } from "../ai/llm-adapter.js";

async function createClientDist() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "codence-client-"));
  await writeFile(path.join(dir, "index.html"), "<!doctype html><div id=\"root\"></div>", "utf8");
  return dir;
}

async function createTempDbPath(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "codence-db-"));
  return path.join(dir, "codence.sqlite");
}

describe("library routes", () => {
  test("items endpoint lists, creates, edits, and retires full item objects", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-13T12:00:00.000Z"),
    });

    try {
      const skills = await app.inject({ method: "GET", url: "/api/skills" });
      expect(skills.statusCode).toBe(200);
      const skillId = skills.json().skills[0].id;

      const create = await app.inject({
        method: "POST",
        url: "/api/items",
        payload: {
          title: "Custom Pair Sum",
          difficulty: "easy",
          skillIds: [skillId],
          prompt: "Find the pair.",
          tags: ["custom"],
        },
      });
      expect(create.statusCode).toBe(201);
      expect(create.json().item).toEqual(expect.objectContaining({
        id: expect.stringMatching(/^custom-/),
        title: "Custom Pair Sum",
        content: expect.objectContaining({ prompt: "Find the pair." }),
        skillIds: [skillId],
        source: "custom",
        status: "active",
      }));

      const itemId = create.json().item.id;
      const update = await app.inject({
        method: "PATCH",
        url: `/api/items/${itemId}`,
        payload: {
          title: "Custom Pair Sum Revised",
          difficulty: "medium",
          skillIds: [skillId],
          prompt: "Find the revised pair.",
        },
      });
      expect(update.statusCode).toBe(200);
      expect(update.json().item).toEqual(expect.objectContaining({
        title: "Custom Pair Sum Revised",
        difficulty: "medium",
        content: expect.objectContaining({ prompt: "Find the revised pair." }),
      }));

      const retire = await app.inject({ method: "POST", url: `/api/items/${itemId}/retire` });
      expect(retire.statusCode).toBe(200);
      expect(retire.json().item.status).toBe("retired");

      const list = await app.inject({ method: "GET", url: "/api/items?status=retired" });
      expect(list.statusCode).toBe(200);
      expect(list.json().items.some((item: { id: string; status: string }) => item.id === itemId && item.status === "retired")).toBe(true);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("skills and tracks endpoints return full read models", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-13T12:00:00.000Z"),
    });

    try {
      const skills = await app.inject({ method: "GET", url: "/api/skills" });
      const tracks = await app.inject({ method: "GET", url: "/api/tracks" });

      expect(skills.statusCode).toBe(200);
      expect(skills.json().skills[0]).toEqual(expect.objectContaining({
        id: expect.any(String),
        learnspaceId: "coding-interview-patterns",
        name: expect.any(String),
        category: expect.any(String),
        totalAttempts: expect.any(Number),
        score: expect.any(Number),
        itemCount: expect.any(Number),
      }));

      expect(tracks.statusCode).toBe(200);
      expect(tracks.json().tracks).toHaveLength(4);
      expect(tracks.json().tracks[0]).toEqual(expect.objectContaining({
        id: expect.any(String),
        learnspaceId: "coding-interview-patterns",
        spec: expect.objectContaining({
          version: "2",
          scopePolicy: expect.any(Object),
          generationPolicy: expect.any(Object),
        }),
        program: expect.objectContaining({
          version: "2",
          nodes: expect.any(Array),
        }),
        analytics: expect.objectContaining({
          completedAttempts: expect.any(Number),
          generatedAttempts: expect.any(Number),
        }),
      }));
      expect(tracks.json().tracks[0]).not.toHaveProperty("intent");
      expect(tracks.json().tracks[0]).not.toHaveProperty("plan");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("interpret endpoint returns compiled outcome with preview", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const compiledPolicy = {
      scope: {
        includeSkillIds: ["arrays_and_hashing"],
        excludeSkillIds: [],
        includeCategories: [],
        excludeCategories: [],
      },
      allocation: {},
      pacing: { weekdayMinutes: 30, sessionsPerWeek: 3 },
      sessionComposition: { reviewShare: 0.6, newShare: 0.4 },
      difficulty: { mode: "adaptive", targetBand: "medium" },
      progression: { mode: "linear" },
      review: { scheduler: "sm5" },
      adaptation: {},
      cadence: [],
      contentSource: { generatedAllowed: true },
    };
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-17T12:00:00.000Z"),
      services: {
        completionLLM: createStubCompletionLLM([
          JSON.stringify({ outcome: "compiled", policy: compiledPolicy }),
        ]),
      },
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/tracks/interpret",
        payload: { goal: "Array patterns 30 min on weekdays, 3x per week" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.outcome).toBe("compiled");
      expect(body.policy).toEqual(compiledPolicy);
      expect(body.preview.spec.scopePolicy.refs).toEqual([
        { dimension: "skill", value: "arrays_and_hashing" },
      ]);
      expect(body.preview.spec.pacingPolicy.weekdayTimeBudgetMinutes).toBe(30);
      expect(body.compilerVersion).toMatch(/^\d+\.\d+\.\d+$/);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("interpret endpoint returns clarify and reject outcomes", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-17T12:00:00.000Z"),
      services: {
        completionLLM: createStubCompletionLLM([
          JSON.stringify({ outcome: "clarify", question: "Daily or weekly cadence?" }),
          JSON.stringify({ outcome: "reject", reason: "Spiral not supported", unsupportedFields: ["progression.mode=spiral"] }),
        ]),
      },
    });

    try {
      const clarify = await app.inject({
        method: "POST",
        url: "/api/tracks/interpret",
        payload: { goal: "Some ambiguous goal" },
      });
      expect(clarify.statusCode).toBe(200);
      expect(clarify.json().outcome).toBe("clarify");
      expect(clarify.json().question).toBe("Daily or weekly cadence?");

      const reject = await app.inject({
        method: "POST",
        url: "/api/tracks/interpret",
        payload: { goal: "Spiral progression" },
      });
      expect(reject.statusCode).toBe(200);
      expect(reject.json().outcome).toBe("reject");
      expect(reject.json().unsupportedFields).toEqual(["progression.mode=spiral"]);
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("interpret endpoint returns compiler_error 502 on repeated invalid JSON", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-17T12:00:00.000Z"),
      services: {
        completionLLM: createStubCompletionLLM(["not json", "still not json"]),
      },
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/tracks/interpret",
        payload: { goal: "anything" },
      });
      expect(response.statusCode).toBe(502);
      expect(response.json().error).toBe("compiler_error");
      expect(response.json().stage).toBe("json");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("POST /api/tracks with policy payload persists policy columns", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-17T12:00:00.000Z"),
    });

    try {
      const payload = {
        goal: "Focused graph practice with daily cadence",
        name: "Graph Sprint",
        policy: {
          scope: {
            includeSkillIds: ["graphs"],
            excludeSkillIds: [],
            includeCategories: [],
            excludeCategories: [],
          },
          allocation: {},
          pacing: { sessionsPerWeek: 5 },
          sessionComposition: { reviewShare: 0.5, newShare: 0.5 },
          difficulty: { mode: "adaptive", targetBand: "medium" },
          progression: { mode: "linear" },
          review: { scheduler: "sm5" },
          adaptation: {},
          cadence: [],
          contentSource: { generatedAllowed: true },
        },
        policyOutcome: "compiled",
        compilerVersion: "1.0.0",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/tracks",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const track = response.json().track;
      expect(track.spec.scopePolicy.refs).toEqual([
        { dimension: "skill", value: "graphs" },
      ]);
      expect(track.policy).toBeTruthy();
      expect(track.policyOutcome).toBe("compiled");
      expect(track.policyCompilerVersion).toBe("1.0.0");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("POST /api/tracks with policy containing spiral progression is rejected", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-17T12:00:00.000Z"),
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/tracks",
        payload: {
          goal: "anything",
          policy: {
            scope: {
              includeSkillIds: [],
              excludeSkillIds: [],
              includeCategories: [],
              excludeCategories: [],
            },
            allocation: {},
            pacing: {},
            sessionComposition: {},
            difficulty: { mode: "adaptive" },
            progression: { mode: "spiral" },
            review: { scheduler: "sm5" },
            adaptation: {},
            cadence: [],
            contentSource: {},
          },
          policyOutcome: "compiled",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().unsupportedFields).toContain("progression.mode=spiral");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
});
