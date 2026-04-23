import type { CoachRuntimeState } from "../core/sessions.js";
import type { CoachRuntime } from "./coach-runtime.js";

interface SessionWithRuntimeState {
  sessionId: string;
  coachRuntimeState: CoachRuntimeState;
}

/**
 * Identify sessions whose coach runtime state is older than the idle TTL.
 * Malformed lastUsedAt values are treated as expired.
 */
export function collectExpiredCoachSessions(
  sessions: Array<{ sessionId: string; coachRuntimeState: CoachRuntimeState | null }>,
  now: Date,
  idleTtlMs: number,
): SessionWithRuntimeState[] {
  const expired: SessionWithRuntimeState[] = [];

  for (const session of sessions) {
    if (!session.coachRuntimeState) continue;

    const lastUsed = new Date(session.coachRuntimeState.lastUsedAt);
    const isExpired =
      isNaN(lastUsed.getTime()) ||
      now.getTime() - lastUsed.getTime() >= idleTtlMs;

    if (isExpired) {
      expired.push({
        sessionId: session.sessionId,
        coachRuntimeState: session.coachRuntimeState,
      });
    }
  }

  return expired;
}

/**
 * Release and clear expired coach runtime sessions.
 * Provider release is best-effort — local state is always cleared.
 */
export async function cleanupExpiredCoachSessions(opts: {
  sessions: Array<{ sessionId: string; coachRuntimeState: CoachRuntimeState | null }>;
  now: Date;
  idleTtlMs: number;
  coachRuntime: CoachRuntime;
  saveCoachRuntimeState: (sessionId: string, state: null) => void;
}): Promise<number> {
  const expired = collectExpiredCoachSessions(opts.sessions, opts.now, opts.idleTtlMs);

  for (const entry of expired) {
    // Best-effort provider release
    try {
      await opts.coachRuntime.releaseSession({
        appSessionId: entry.sessionId,
        runtimeSessionId: entry.coachRuntimeState.runtimeSessionId,
      });
    } catch {
      // Provider release failed — still clear local state
    }

    // Always clear persisted runtime state
    opts.saveCoachRuntimeState(entry.sessionId, null);
  }

  return expired.length;
}
