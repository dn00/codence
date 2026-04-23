import type { AppDatabase } from "../persistence/db.js";
import {
  artifactLineage,
  attempts,
  categories,
  evidenceRecords,
  itemQueue,
  items,
  learnspaces,
  plannerDecisionEvents,
  queue,
  selectionEvents,
  sessions,
  skillConfidence,
  skills,
  trackRuntimeState,
  trackTransitionEvents,
  tracks,
  users,
} from "../persistence/schema.js";

/**
 * Versioned JSON envelope for full-DB snapshots. The version string is
 * checked at import time; mismatches refuse to import rather than silently
 * load incompatible shapes. Bump on any breaking export-shape change
 * (not the DB schema itself — migrations handle those at startup).
 */
export const EXPORT_FORMAT_VERSION = "codence-export/1";

export interface ExportEnvelope {
  format: typeof EXPORT_FORMAT_VERSION;
  exportedAt: string;
  appVersion: string;
  tables: Record<string, unknown[]>;
}

// Order matters for import: FK parents before children. SQLite enforces FKs
// with pragma foreign_keys=ON, so violating this order breaks restores.
const TABLES = [
  { name: "users", table: users },
  { name: "learnspaces", table: learnspaces },
  { name: "categories", table: categories },
  { name: "skills", table: skills },
  { name: "items", table: items },
  { name: "tracks", table: tracks },
  { name: "track_runtime_state", table: trackRuntimeState },
  { name: "track_transition_events", table: trackTransitionEvents },
  { name: "planner_decision_events", table: plannerDecisionEvents },
  { name: "evidence_records", table: evidenceRecords },
  { name: "artifact_lineage", table: artifactLineage },
  { name: "sessions", table: sessions },
  { name: "attempts", table: attempts },
  { name: "selection_events", table: selectionEvents },
  { name: "queue", table: queue },
  { name: "item_queue", table: itemQueue },
  { name: "skill_confidence", table: skillConfidence },
] as const;

export function exportDatabase(db: AppDatabase, appVersion: string): ExportEnvelope {
  const snapshot: Record<string, unknown[]> = {};
  for (const { name, table } of TABLES) {
    snapshot[name] = db.select().from(table).all();
  }
  return {
    format: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    tables: snapshot,
  };
}
