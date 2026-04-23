/**
 * Process-local runtime diagnostics counters.
 * These are in-memory only — not durable, not telemetry.
 */

export interface RuntimeDiagnostics {
  coach: {
    configured: boolean;
    backend: string | null;
    activeSessions: number;
    expiredSessionsCleared: number;
    resumedTurns: number;
  };
  completion: {
    configured: boolean;
    backend: string | null;
  };
}

let expiredSessionsCleared = 0;
let resumedTurns = 0;

export function incrementExpiredSessions(count: number): void {
  expiredSessionsCleared += count;
}

export function incrementResumedTurns(): void {
  resumedTurns += 1;
}

export function getProcessCounters(): { expiredSessionsCleared: number; resumedTurns: number } {
  return { expiredSessionsCleared, resumedTurns };
}

/** Reset counters — primarily for testing. */
export function resetProcessCounters(): void {
  expiredSessionsCleared = 0;
  resumedTurns = 0;
}
