import { eq } from "drizzle-orm";
import { createTestDatabase } from "../persistence/db.js";
import { learnspaces, queue, skillConfidence, skills, users } from "../persistence/schema.js";
import { activateTrack, ensureSystemTracks, getActiveTrack, listLearnspaceTracks } from "./service.js";

describe("track service", () => {
  test("M2 AC-1 seeds the built-in DSA system tracks and defaults the learnspace to recommended", () => {
    const db = createTestDatabase();
    const timestamp = "2026-04-12T10:00:00.000Z";

    db.insert(users)
      .values({
        id: "user-1",
        displayName: "Local User",
        activeLearnspaceId: "coding-interview-patterns",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    db.insert(learnspaces)
      .values({
        id: "coding-interview-patterns",
        userId: "user-1",
        name: "Coding Interview Patterns",
        config: {
          id: "coding-interview-patterns",
          name: "Coding Interview Patterns",
          protocol_steps: [],
          skills: [],
          tag_weights: {},
          interleaving_confidence_threshold: 4,
          confidence_gated_protocol_threshold: 7,
        },
        activeTag: null,
        interviewDate: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    db.insert(skills)
      .values({
        id: "hash_map",
        learnspaceId: "coding-interview-patterns",
        name: "Hash Map",
        category: "arrays",
        createdAt: timestamp,
      })
      .run();

    const tracks = ensureSystemTracks(db, {
      userId: "user-1",
      learnspaceId: "coding-interview-patterns",
      now: () => new Date(timestamp),
    });

    const learnspace = db
      .select()
      .from(learnspaces)
      .where(eq(learnspaces.id, "coding-interview-patterns"))
      .get();

    expect(tracks.map((track) => track.slug)).toEqual(
      expect.arrayContaining([
        "recommended",
        "explore",
        "weakest_pattern",
        "foundations",
      ]),
    );
    expect(tracks[0]).toEqual(expect.objectContaining({
      spec: expect.objectContaining({ version: "2" }),
      program: expect.objectContaining({ version: "2" }),
    }));
    expect(tracks[0]).not.toHaveProperty("intent");
    expect(tracks[0]).not.toHaveProperty("plan");
    expect(learnspace?.activeTrackId).toBe("track-coding-interview-patterns-recommended");
    expect(getActiveTrack(db, { userId: "user-1", learnspace: learnspace! }).slug).toBe("recommended");
  });

  test("M2 AC-2 activating a track changes recommendation policy without touching queue memory tables", () => {
    const db = createTestDatabase();
    const timestamp = "2026-04-12T10:00:00.000Z";

    db.insert(users)
      .values({
        id: "user-1",
        displayName: "Local User",
        activeLearnspaceId: "coding-interview-patterns",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    db.insert(learnspaces)
      .values({
        id: "coding-interview-patterns",
        userId: "user-1",
        name: "Coding Interview Patterns",
        config: {
          id: "coding-interview-patterns",
          name: "Coding Interview Patterns",
          protocol_steps: [],
          skills: [],
          tag_weights: {},
          interleaving_confidence_threshold: 4,
          confidence_gated_protocol_threshold: 7,
        },
        activeTag: null,
        interviewDate: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    db.insert(skills)
      .values({
        id: "hash_map",
        learnspaceId: "coding-interview-patterns",
        name: "Hash Map",
        category: "arrays",
        createdAt: timestamp,
      })
      .run();

    db.insert(queue)
      .values({
        id: "queue-hash-map",
        learnspaceId: "coding-interview-patterns",
        userId: "user-1",
        skillId: "hash_map",
        intervalDays: 3,
        easeFactor: 2.3,
        dueDate: "2026-04-14T00:00:00.000Z",
        round: 2,
        lastOutcome: "clean",
        skipCount: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    db.insert(skillConfidence)
      .values({
        learnspaceId: "coding-interview-patterns",
        userId: "user-1",
        skillId: "hash_map",
        score: 6.2,
        totalAttempts: 4,
        cleanSolves: 3,
        assistedSolves: 1,
        failedAttempts: 0,
        lastPracticedAt: "2026-04-10T00:00:00.000Z",
        trend: "improving",
      })
      .run();

    ensureSystemTracks(db, {
      userId: "user-1",
      learnspaceId: "coding-interview-patterns",
      now: () => new Date(timestamp),
    });

    const queueBefore = db.select().from(queue).where(eq(queue.id, "queue-hash-map")).get();
    const confidenceBefore = db.select().from(skillConfidence).all()[0];

    const activeTrack = activateTrack(db, {
      userId: "user-1",
      learnspaceId: "coding-interview-patterns",
      trackId: "track-coding-interview-patterns-weakest_pattern",
      now: () => new Date("2026-04-12T11:00:00.000Z"),
    });

    const learnspace = db
      .select()
      .from(learnspaces)
      .where(eq(learnspaces.id, "coding-interview-patterns"))
      .get();
    const queueAfter = db.select().from(queue).where(eq(queue.id, "queue-hash-map")).get();
    const confidenceAfter = db.select().from(skillConfidence).all()[0];

    expect(activeTrack.slug).toBe("weakest_pattern");
    expect(learnspace?.activeTrackId).toBe("track-coding-interview-patterns-weakest_pattern");
    expect(queueAfter).toEqual(queueBefore);
    expect(confidenceAfter).toEqual(confidenceBefore);
    expect(listLearnspaceTracks(db, "user-1", "coding-interview-patterns")).toHaveLength(4);
  });
});
