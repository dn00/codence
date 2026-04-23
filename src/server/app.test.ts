import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AppServices } from "./runtime-services.js";
import { resolveAppServices } from "./runtime-services.js";
import { createApp, type CreateAppOptions } from "./index.js";

const invalidServiceOverrides: CreateAppOptions["services"] = {
  executionAdapter: {
    // @ts-expect-error invalid service overrides should fail at compile time
    run: async () => ({ passed: 1, failed: 0, errors: [] }),
  },
};
void invalidServiceOverrides;

async function createClientDist(html = "<!doctype html><html><body><div id=\"root\"></div></body></html>") {
  const dir = await mkdtemp(path.join(os.tmpdir(), "codence-client-"));
  await writeFile(path.join(dir, "index.html"), html, "utf8");
  await writeFile(path.join(dir, "asset.txt"), "asset", "utf8");
  return dir;
}

async function createTempDbPath(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "codence-db-"));
  return path.join(dir, "codence.sqlite");
}

describe("server scaffold shell", () => {
  test("AC-1 returns health payload from the Fastify app", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({ clientDistDir, dbPath });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/health"
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("ok");
      expect(body.service).toBe("codence");
      expect(body.diagnostics).toBeTruthy();
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-2 serves the built client shell from the configured dist directory", async () => {
    const clientDistDir = await createClientDist("<!doctype html><html><body>Codence shell</body></html>");
    const dbPath = await createTempDbPath();
    const app = await createApp({ clientDistDir, dbPath });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/"
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.body).toContain("Codence shell");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("AC-3 preserves unknown api routes as api misses", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const app = await createApp({ clientDistDir, dbPath });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/missing"
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: "Not Found"
      });
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("EC-1 falls back to the client shell for non-api browser routes", async () => {
    const clientDistDir = await createClientDist("<!doctype html><html><body>Codence shell</body></html>");
    const dbPath = await createTempDbPath();
    const app = await createApp({ clientDistDir, dbPath });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/practice"
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("Codence shell");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("ERR-1 returns a clear error when the client bundle is missing", async () => {
    const clientDistDir = await mkdtemp(path.join(os.tmpdir(), "codence-missing-client-"));
    const dbPath = await createTempDbPath();
    const app = await createApp({ clientDistDir, dbPath });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/"
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        error: "Client bundle not found"
      });
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("AC-1 createApp registers the practice routes while preserving health and static-shell behavior", async () => {
    const clientDistDir = await createClientDist("<!doctype html><html><body>Codence shell</body></html>");
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      const healthResponse = await app.inject({
        method: "GET",
        url: "/api/health",
      });
      const learnspaceResponse = await app.inject({
        method: "GET",
        url: "/api/learnspaces/coding-interview-patterns",
      });
      const progressResponse = await app.inject({
        method: "GET",
        url: "/api/progress",
      });
      const shellResponse = await app.inject({
        method: "GET",
        url: "/practice",
      });

      expect(healthResponse.statusCode).toBe(200);
      expect(learnspaceResponse.statusCode).toBe(200);
      expect(progressResponse.statusCode).toBe(200);
      expect(shellResponse.statusCode).toBe(200);
      expect(learnspaceResponse.json()).toEqual(
        expect.objectContaining({
          id: "coding-interview-patterns",
          familyId: "dsa",
          schedulerId: "sm5",
          activeTrackId: "track-coding-interview-patterns-recommended",
          activeTrack: expect.objectContaining({
            slug: "recommended",
          }),
          tracks: expect.arrayContaining([
            expect.objectContaining({ slug: "recommended" }),
            expect.objectContaining({ slug: "explore" }),
          ]),
          family: expect.objectContaining({
            id: "dsa",
            archetypes: ["protocol_solve"],
          }),
        }),
      );
      expect(shellResponse.body).toContain("Codence shell");
      await expect(stat(dbPath)).resolves.toBeDefined();
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });

  test("M2 AC-1 createApp exposes track activation on the active learnspace", async () => {
    const clientDistDir = await createClientDist("<!doctype html><html><body>Codence shell</body></html>");
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-12T12:00:00.000Z"),
    });

    try {
      const before = await app.inject({
        method: "GET",
        url: "/api/learnspaces/coding-interview-patterns",
      });
      expect(before.statusCode).toBe(200);
      expect(before.json().activeTrack.slug).toBe("recommended");

      const activate = await app.inject({
        method: "POST",
        url: "/api/tracks/track-coding-interview-patterns-weakest_pattern/activate",
      });
      expect(activate.statusCode).toBe(200);
      expect(activate.json()).toEqual(
        expect.objectContaining({
          activeTrackId: "track-coding-interview-patterns-weakest_pattern",
          activeTrack: expect.objectContaining({
            slug: "weakest_pattern",
          }),
        }),
      );

      const progress = await app.inject({
        method: "GET",
        url: "/api/progress",
      });
      expect(progress.statusCode).toBe(200);
      expect(progress.json()).toEqual(
        expect.objectContaining({
          tracks: expect.arrayContaining([
            expect.objectContaining({ slug: "recommended" }),
            expect.objectContaining({ slug: "weakest_pattern" }),
          ]),
          learnspace: expect.objectContaining({
            activeTrackId: "track-coding-interview-patterns-weakest_pattern",
            activeTrack: expect.objectContaining({
              slug: "weakest_pattern",
            }),
          }),
        }),
      );
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("AC-2 createApp accepts partial service overrides while preserving existing options shape", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    const evaluationService: AppServices["evaluationService"] = {
      evaluateAttempt: () => ({
        outcome: "assisted",
        diagnosis: "override",
        severity: "moderate",
        approach_correct: false,
        per_step_quality: {},
        mistakes: [],
        strengths: [],
        coaching_summary: "override",
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
      const response = await app.inject({
        method: "GET",
        url: "/api/health",
      });

      expect(response.statusCode).toBe(200);
      const healthBody = response.json();
      expect(healthBody.status).toBe("ok");
      expect(healthBody.service).toBe("codence");
      expect(healthBody.diagnostics).toBeTruthy();
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("AC-3 createApp materializes default local services when overrides are omitted", () => {
    const services = resolveAppServices();

    expect(typeof services.evaluationService.evaluateAttempt).toBe("function");
    expect(typeof services.executionAdapter.execute).toBe("function");
    expect(typeof services.completionLLM.complete).toBe("function");
    expect(typeof services.coachRuntime.sendTurn).toBe("function");
  });
  test("AC-4 route registration still uses explicit dependency objects after service wiring lands", async () => {
    const clientDistDir = await createClientDist("<!doctype html><html><body>Codence shell</body></html>");
    const dbPath = await createTempDbPath();
    const app = await createApp({
      clientDistDir,
      dbPath,
      now: () => new Date("2026-04-08T12:00:00.000Z"),
    });

    try {
      const healthResponse = await app.inject({
        method: "GET",
        url: "/api/health",
      });
      const learnspaceResponse = await app.inject({
        method: "GET",
        url: "/api/learnspaces/coding-interview-patterns",
      });
      const sessionResponse = await app.inject({
        method: "GET",
        url: "/api/sessions/missing-session",
      });

      expect(healthResponse.statusCode).toBe(200);
      expect(learnspaceResponse.statusCode).toBe(200);
      expect(sessionResponse.statusCode).toBe(404);
      expect(learnspaceResponse.json()).toEqual(
        expect.objectContaining({
          familyId: "dsa",
          schedulerId: "sm5",
        }),
      );
      expect(sessionResponse.json()).toEqual({
        error: "Session not found",
      });
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("EC-1 partial service overrides fall back to defaults for unspecified services", () => {
    const evaluationService: AppServices["evaluationService"] = {
      evaluateAttempt: () => ({
        outcome: "clean",
        diagnosis: "override",
        severity: "minor",
        approach_correct: true,
        per_step_quality: {},
        mistakes: [],
        strengths: ["override"],
        coaching_summary: "override",
        evaluation_source: "llm",
        retry_recovered: false,
      }),
    };

    const services = resolveAppServices({ evaluationService });

    expect(services.evaluationService).toBe(evaluationService);
    expect(typeof services.executionAdapter.execute).toBe("function");
    expect(typeof services.completionLLM.complete).toBe("function");
    expect(typeof services.coachRuntime.sendTurn).toBe("function");
  });
  test("AC-5 runtime service seams preserve backend-owned session truth and do not require provider thread state", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();
    type EvalInput = Parameters<AppServices["evaluationService"]["evaluateAttempt"]>[0];
    let capturedEvaluationInput = null as EvalInput | null;
    const evaluationService: AppServices["evaluationService"] = {
      evaluateAttempt(input) {
        capturedEvaluationInput = input;
        return {
          outcome: "assisted",
          diagnosis: "captured",
          severity: "moderate",
          approach_correct: false,
          per_step_quality: {},
          mistakes: [],
          strengths: [],
          coaching_summary: "captured",
          evaluation_source: "llm",
          retry_recovered: false,
        };
      },
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

      await app.inject({
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

      expect(complete.statusCode).toBe(200);
      expect(capturedEvaluationInput?.sessionId).toBe(queueBody.session.sessionId);
      expect(capturedEvaluationInput?.attemptId).toBe(queueBody.session.attemptId);
      expect(capturedEvaluationInput?.coachingTranscript).toEqual([]);
      expect(capturedEvaluationInput?.testResults ?? null).toBeNull();
      expect(capturedEvaluationInput?.protocolSteps.map((step) => step.id)).toContain("code");
    } finally {
      await app.close();
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
  test("ERR-1 createApp fails clearly when completion is wired without an evaluation service", async () => {
    const clientDistDir = await createClientDist();
    const dbPath = await createTempDbPath();

    try {
      await expect(
        createApp({
          clientDistDir,
          dbPath,
          services: {
            evaluationService: undefined as unknown as AppServices["evaluationService"],
          },
        }),
      ).rejects.toThrow("Codence evaluation service is not configured");
    } finally {
      await rm(path.dirname(dbPath), { recursive: true, force: true });
      await rm(clientDistDir, { recursive: true, force: true });
    }
  });
});
