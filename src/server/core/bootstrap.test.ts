import { eq } from "drizzle-orm";
import { bootstrapDefaultLearnspace, DEFAULT_LEARNSPACE_ID } from "./bootstrap.js";
import { createTestDatabase } from "../persistence/db.js";
import { items, learnspaces, skills } from "../persistence/schema.js";

describe("bootstrapDefaultLearnspace", () => {
  test("seeds built-in learnspaces with source metadata and runtime config metadata", () => {
    const db = createTestDatabase();
    bootstrapDefaultLearnspace({ db, now: () => new Date("2026-04-13T12:00:00.000Z") });

    const learnspace = db
      .select()
      .from(learnspaces)
      .where(eq(learnspaces.id, DEFAULT_LEARNSPACE_ID))
      .get();

    expect(learnspace?.source).toBe("built-in");
    expect(learnspace?.config).toEqual(
      expect.objectContaining({
        familyId: "dsa",
        schedulerId: "sm5",
        builtInVersion: 4,
      }),
    );
  });

  test("does not overwrite a user-edited built-in learnspace definition on boot", () => {
    const db = createTestDatabase();
    bootstrapDefaultLearnspace({ db, now: () => new Date("2026-04-13T12:00:00.000Z") });

    const current = db
      .select()
      .from(learnspaces)
      .where(eq(learnspaces.id, DEFAULT_LEARNSPACE_ID))
      .get();
    const editedConfig = {
      ...(current?.config ?? {}),
      description: "User-edited description",
    };
    const editedSkill = db
      .select()
      .from(skills)
      .all()
      .find((row) => row.learnspaceId === DEFAULT_LEARNSPACE_ID);
    const editedItem = db
      .select()
      .from(items)
      .all()
      .find((row) => row.learnspaceId === DEFAULT_LEARNSPACE_ID && row.source === "seed");

    expect(current).toBeTruthy();
    expect(editedSkill).toBeTruthy();
    expect(editedItem).toBeTruthy();

    db.update(learnspaces)
      .set({
        source: "user-edited",
        name: "Custom Learnspace Name",
        config: editedConfig,
        updatedAt: "2026-04-13T12:05:00.000Z",
      })
      .where(eq(learnspaces.id, DEFAULT_LEARNSPACE_ID))
      .run();
    db.update(skills)
      .set({ name: "Custom Skill Name" })
      .where(eq(skills.id, editedSkill!.id))
      .run();
    db.update(items)
      .set({ title: "Custom Item Title" })
      .where(eq(items.id, editedItem!.id))
      .run();

    bootstrapDefaultLearnspace({ db, now: () => new Date("2026-04-13T13:00:00.000Z") });

    const learnspace = db
      .select()
      .from(learnspaces)
      .where(eq(learnspaces.id, DEFAULT_LEARNSPACE_ID))
      .get();
    const skill = db.select().from(skills).where(eq(skills.id, editedSkill!.id)).get();
    const item = db.select().from(items).where(eq(items.id, editedItem!.id)).get();

    expect(learnspace?.source).toBe("user-edited");
    expect(learnspace?.name).toBe("Custom Learnspace Name");
    expect(learnspace?.config).toEqual(
      expect.objectContaining({
        description: "User-edited description",
      }),
    );
    expect(skill?.name).toBe("Custom Skill Name");
    expect(item?.title).toBe("Custom Item Title");
  });

  test("resyncs built-in skill names and categories when the DB row drifted", () => {
    const db = createTestDatabase();
    bootstrapDefaultLearnspace({ db, now: () => new Date("2026-04-14T00:00:00.000Z") });

    const original = db
      .select()
      .from(skills)
      .all()
      .find((row) => row.learnspaceId === DEFAULT_LEARNSPACE_ID);
    expect(original).toBeTruthy();

    db.update(skills)
      .set({ name: "Drifted Name", category: "drifted-category" })
      .where(eq(skills.id, original!.id))
      .run();

    bootstrapDefaultLearnspace({ db, now: () => new Date("2026-04-14T01:00:00.000Z") });

    const resynced = db.select().from(skills).where(eq(skills.id, original!.id)).get();
    expect(resynced?.name).toBe(original!.name);
    expect(resynced?.category).toBe(original!.category);
  });

  test("backfills runtime metadata onto stale built-in rows before runtime resolution", () => {
    const db = createTestDatabase();
    bootstrapDefaultLearnspace({ db, now: () => new Date("2026-04-14T00:00:00.000Z") });

    const current = db
      .select()
      .from(learnspaces)
      .where(eq(learnspaces.id, DEFAULT_LEARNSPACE_ID))
      .get();
    expect(current).toBeTruthy();

    const staleConfig = {
      ...(current?.config ?? {}),
    } as Record<string, unknown>;
    delete staleConfig.familyId;
    delete staleConfig.schedulerId;
    delete staleConfig.builtInVersion;

    db.update(learnspaces)
      .set({
        source: "built-in",
        config: staleConfig,
        updatedAt: "2026-04-14T00:05:00.000Z",
      })
      .where(eq(learnspaces.id, DEFAULT_LEARNSPACE_ID))
      .run();

    bootstrapDefaultLearnspace({ db, now: () => new Date("2026-04-14T01:00:00.000Z") });

    const repaired = db
      .select()
      .from(learnspaces)
      .where(eq(learnspaces.id, DEFAULT_LEARNSPACE_ID))
      .get();
    expect(repaired?.config).toEqual(
      expect.objectContaining({
        familyId: "dsa",
        schedulerId: "sm5",
        builtInVersion: 4,
      }),
    );
  });
});
