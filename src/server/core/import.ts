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
import {
  EXPORT_FORMAT_VERSION,
  type ExportEnvelope,
} from "./export.js";

// Parent-first for inserts, child-first for deletes so foreign-key constraints
// aren't violated either way.
const IMPORT_ORDER = [
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

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

/**
 * Replaces the current database contents with the envelope's tables. The
 * operation is destructive — existing rows are truncated before inserting.
 * Callers should back up the target DB first (or run against a fresh path).
 *
 * Wrapped in a single transaction so partial failures leave the DB unchanged.
 * Rejects envelopes with an unrecognized format version rather than silently
 * loading incompatible shapes.
 */
export function importDatabase(db: AppDatabase, envelope: ExportEnvelope): void {
  if (envelope.format !== EXPORT_FORMAT_VERSION) {
    throw new ImportError(
      `Unsupported export format ${envelope.format}; expected ${EXPORT_FORMAT_VERSION}. ` +
      `Exports from a newer Codence version cannot be loaded by an older binary.`,
    );
  }

  // Drizzle's better-sqlite3 driver exposes the raw handle via `.run` but
  // transactions are cleanest through the underlying `better-sqlite3` API.
  // We use drizzle's `transaction()` wrapper which maps to BEGIN/COMMIT.
  db.transaction((tx) => {
    // Delete children first (reverse order) so FK constraints don't trip.
    for (const { table } of [...IMPORT_ORDER].reverse()) {
      tx.delete(table).run();
    }
    for (const { name, table } of IMPORT_ORDER) {
      const rows = envelope.tables[name];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      // Drizzle's insert typing is strict per-table and doesn't generalize
      // across a heterogeneous list. Rows came from a matching
      // exportDatabase call (same schema version checked above), so the
      // cast through `never` is safe.
      tx.insert(table as never).values(rows as never[]).run();
    }
  });
}
