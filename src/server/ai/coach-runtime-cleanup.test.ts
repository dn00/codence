import { describe, test, expect, vi } from "vitest";
import {
  collectExpiredCoachSessions,
  cleanupExpiredCoachSessions,
} from "./coach-runtime-cleanup.js";
import type { CoachRuntimeState } from "../core/sessions.js";
import type { CoachRuntime } from "./coach-runtime.js";

function makeRuntimeState(overrides: Partial<CoachRuntimeState> = {}): CoachRuntimeState {
  return {
    backend: "claude-code",
    runtimeSessionId: "rt-123",
    startedAt: "2026-04-08T10:00:00Z",
    lastUsedAt: "2026-04-08T10:05:00Z",
    ...overrides,
  };
}

describe("coach runtime cleanup", () => {
  test("AC-3 cleanup leaves sessions within the idle ttl untouched", () => {
    const now = new Date("2026-04-08T10:10:00Z");
    const idleTtlMs = 30 * 60 * 1000; // 30 minutes

    const sessions = [
      { sessionId: "s1", coachRuntimeState: makeRuntimeState({ lastUsedAt: "2026-04-08T10:05:00Z" }) },
    ];

    const expired = collectExpiredCoachSessions(sessions, now, idleTtlMs);
    expect(expired).toHaveLength(0);
  });

  test("EC-1 failed provider release still clears stale local runtime state", async () => {
    const now = new Date("2026-04-08T11:00:00Z");
    const idleTtlMs = 30 * 60 * 1000; // 30 minutes

    const sessions = [
      { sessionId: "s1", coachRuntimeState: makeRuntimeState({ lastUsedAt: "2026-04-08T10:00:00Z", runtimeSessionId: "rt-expired" }) },
    ];

    const failingRuntime: CoachRuntime = {
      async sendTurn() { throw new Error("not implemented"); },
      async releaseSession() { throw new Error("Provider release failed"); },
    };

    const saveFn = vi.fn();
    await cleanupExpiredCoachSessions({
      sessions,
      now,
      idleTtlMs,
      coachRuntime: failingRuntime,
      saveCoachRuntimeState: saveFn,
    });

    // State was cleared despite provider failure
    expect(saveFn).toHaveBeenCalledWith("s1", null);
  });

  test("ERR-1 malformed lastUsedAt values are treated as expired", () => {
    const now = new Date("2026-04-08T11:00:00Z");
    const idleTtlMs = 30 * 60 * 1000;

    const sessions = [
      { sessionId: "s1", coachRuntimeState: makeRuntimeState({ lastUsedAt: "not-a-date" }) },
      { sessionId: "s2", coachRuntimeState: makeRuntimeState({ lastUsedAt: "" }) },
    ];

    const expired = collectExpiredCoachSessions(sessions, now, idleTtlMs);
    expect(expired).toHaveLength(2);
    expect(expired.map(e => e.sessionId)).toEqual(["s1", "s2"]);
  });
});
