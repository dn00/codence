import Fastify from "fastify";
import { bootstrapDefaultLearnspace, DEFAULT_USER_ID } from "../core/bootstrap.js";
import { createTestDatabase } from "../persistence/db.js";
import { learnspaces, tracks, users } from "../persistence/schema.js";
import { registerLearnspaceRoutes } from "./learnspaces.js";

const TIMESTAMP = "2026-04-14T12:00:00.000Z";

function buildAppWithBrokenLearnspace() {
  const db = createTestDatabase();
  bootstrapDefaultLearnspace({ db, now: () => new Date(TIMESTAMP) });

  // Insert a user-generated learnspace with no runtime metadata. This row
  // must not be silently resolved via a built-in fallback, and must not
  // take down the /api/learnspaces list endpoint.
  db.insert(learnspaces)
    .values({
      id: "broken-custom",
      userId: DEFAULT_USER_ID,
      name: "Broken Custom",
      config: {
        id: "broken-custom",
        name: "Broken Custom",
        description: "No runtime metadata — should fail closed",
      } as Record<string, unknown>,
      source: "user-generated",
      activeTag: null,
      interviewDate: null,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    })
    .run();

  // Insert a learnspace that has valid runtime metadata but no policy
  // domain mapping — this is what the "policy tracks unsupported" UX
  // must render as 200 + `policyTracks.supported: false`, not 404.
  db.insert(learnspaces)
    .values({
      id: "unmapped-ok",
      userId: DEFAULT_USER_ID,
      name: "Unmapped OK",
      config: {
        id: "unmapped-ok",
        name: "Unmapped OK",
        description: "Valid runtime config, no policy domain",
        familyId: "dsa",
        schedulerId: "sm5",
        protocol_steps: [],
        coaching_persona: "",
        evaluation_prompt: "",
        variant_prompt: "",
        executor: null,
        item_schema: {},
        test_harness_template: "",
        skills: [],
        tags: [],
        tag_weights: {},
        confidence_gated_protocol_threshold: 7.0,
        interleaving_confidence_threshold: 4.0,
      } as Record<string, unknown>,
      source: "user-generated",
      activeTag: null,
      interviewDate: null,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    })
    .run();

  const app = Fastify();
  registerLearnspaceRoutes(app, { db, now: () => new Date(TIMESTAMP) });
  return { app, db };
}

describe("learnspace routes — graceful failure on broken rows", () => {
  test("GET /api/learnspaces returns valid rows in learnspaces and broken rows in invalidLearnspaces", async () => {
    const { app } = buildAppWithBrokenLearnspace();

    try {
      const response = await app.inject({ method: "GET", url: "/api/learnspaces" });

      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        learnspaces: Array<{ id: string }>;
        invalidLearnspaces?: Array<{ id: string; name: string; error: string }>;
      };

      // Valid rows from bootstrapDefaultLearnspace must still be returned.
      expect(body.learnspaces.length).toBeGreaterThan(0);
      expect(body.learnspaces.find((row) => row.id === "coding-interview-patterns")).toBeTruthy();

      // Broken row should surface in invalidLearnspaces with its id and an error message.
      expect(body.invalidLearnspaces).toBeTruthy();
      expect(body.invalidLearnspaces).toHaveLength(1);
      expect(body.invalidLearnspaces![0]).toEqual(
        expect.objectContaining({
          id: "broken-custom",
          name: "Broken Custom",
        }),
      );
      expect(typeof body.invalidLearnspaces![0].error).toBe("string");
      expect(body.invalidLearnspaces![0].error.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  test("GET /api/learnspaces/:id returns 422 with a structured error for an unresolvable row", async () => {
    const { app } = buildAppWithBrokenLearnspace();

    try {
      const response = await app.inject({ method: "GET", url: "/api/learnspaces/broken-custom" });

      expect(response.statusCode).toBe(422);
      const body = response.json() as { error: string; learnspaceId: string };
      expect(body.learnspaceId).toBe("broken-custom");
      expect(typeof body.error).toBe("string");
      expect(body.error.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  test("POST /api/learnspaces/:id/switch returns 422 without mutating activeLearnspaceId for an unresolvable row", async () => {
    const { app, db } = buildAppWithBrokenLearnspace();

    try {
      const before = db.select().from(users).all().find((user) => user.id === DEFAULT_USER_ID);
      expect(before?.activeLearnspaceId).toBe("coding-interview-patterns");

      const response = await app.inject({ method: "POST", url: "/api/learnspaces/broken-custom/switch" });

      expect(response.statusCode).toBe(422);

      const after = db.select().from(users).all().find((user) => user.id === DEFAULT_USER_ID);
      expect(after?.activeLearnspaceId).toBe("coding-interview-patterns");
      const brokenLearnspace = db
        .select()
        .from(learnspaces)
        .all()
        .find((row) => row.id === "broken-custom");
      const brokenTracks = db
        .select()
        .from(tracks)
        .all()
        .filter((track) => track.learnspaceId === "broken-custom");
      expect(brokenLearnspace?.activeTrackId).toBeNull();
      expect(brokenTracks).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  test("POST /api/learnspaces/:id/activate returns 422 without mutating activeLearnspaceId for an unresolvable row", async () => {
    const { app, db } = buildAppWithBrokenLearnspace();

    try {
      const before = db.select().from(users).all().find((user) => user.id === DEFAULT_USER_ID);
      expect(before?.activeLearnspaceId).toBe("coding-interview-patterns");

      const response = await app.inject({ method: "POST", url: "/api/learnspaces/broken-custom/activate" });

      expect(response.statusCode).toBe(422);

      const after = db.select().from(users).all().find((user) => user.id === DEFAULT_USER_ID);
      expect(after?.activeLearnspaceId).toBe("coding-interview-patterns");
    } finally {
      await app.close();
    }
  });

  test("GET /api/learnspaces/:id/tracks returns 422 with a structured error for an unresolvable row", async () => {
    const { app } = buildAppWithBrokenLearnspace();

    try {
      const response = await app.inject({ method: "GET", url: "/api/learnspaces/broken-custom/tracks" });

      expect(response.statusCode).toBe(422);
      const body = response.json() as { error: string; learnspaceId: string };
      expect(body.learnspaceId).toBe("broken-custom");
      expect(typeof body.error).toBe("string");
      expect(body.error.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  test("GET /api/learnspaces/:id returns 200 for a valid built-in row", async () => {
    const { app } = buildAppWithBrokenLearnspace();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/learnspaces/coding-interview-patterns",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as { id: string; familyId: string };
      expect(body.id).toBe("coding-interview-patterns");
      expect(body.familyId).toBe("dsa");
    } finally {
      await app.close();
    }
  });

  test("GET /api/learnspaces/:id advertises policy track capability", async () => {
    const { app } = buildAppWithBrokenLearnspace();

    try {
      const supported = await app.inject({
        method: "GET",
        url: "/api/learnspaces/coding-interview-patterns",
      });
      expect(supported.statusCode).toBe(200);
      expect(supported.json().policyTracks).toEqual({
        supported: true,
        domainId: "coding-interview-patterns",
      });

      const unsupported = await app.inject({
        method: "GET",
        url: "/api/learnspaces/unmapped-ok",
      });
      expect(unsupported.statusCode).toBe(200);
      expect(unsupported.json().policyTracks).toEqual(expect.objectContaining({
        supported: false,
        reason: expect.stringContaining("unmapped-ok"),
      }));
    } finally {
      await app.close();
    }
  });

  test("GET /api/learnspaces omits invalidLearnspaces when all rows resolve cleanly", async () => {
    const db = createTestDatabase();
    bootstrapDefaultLearnspace({ db, now: () => new Date(TIMESTAMP) });
    const app = Fastify();
    registerLearnspaceRoutes(app, { db, now: () => new Date(TIMESTAMP) });

    try {
      const response = await app.inject({ method: "GET", url: "/api/learnspaces" });

      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        learnspaces: Array<{ id: string }>;
        invalidLearnspaces?: unknown;
      };
      expect(body.learnspaces.length).toBeGreaterThan(0);
      expect(body.invalidLearnspaces).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});
