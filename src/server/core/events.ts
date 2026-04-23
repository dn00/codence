import { randomUUID } from "node:crypto";
import { selectionEvents, type NewSelectionEvent } from "../persistence/schema.js";
import type { AppDatabase } from "../persistence/db.js";
import type { QueueSelection } from "./selection-types.js";

export interface RecordSelectionEventInput {
  id?: string;
  sessionId: string;
  attemptId: string;
  userId: string;
  learnspaceId: string;
  selection: QueueSelection;
  createdAt: string;
}

export function createSelectionEventId(): string {
  return `selection-${randomUUID()}`;
}

export function recordSelectionEvent(
  db: AppDatabase,
  input: RecordSelectionEventInput,
): string {
  const id = input.id ?? createSelectionEventId();
  const row: NewSelectionEvent = {
    id,
    sessionId: input.sessionId,
    attemptId: input.attemptId,
    learnspaceId: input.learnspaceId,
    userId: input.userId,
    trackId: input.selection.trackId,
    artifactId: input.selection.item.id,
    schedulerIds: input.selection.selectionReason.schedulerIds,
    candidateSnapshot: {
      queueId: input.selection.queueId,
      skillId: input.selection.skillId,
      skillName: input.selection.skillName,
      tier: input.selection.tier,
      dueDate: input.selection.dueDate,
      confidenceScore: input.selection.confidenceScore,
      artifact: {
        id: input.selection.item.id,
        title: input.selection.item.title,
        difficulty: input.selection.item.difficulty,
        skillIds: input.selection.item.skillIds,
        tags: input.selection.item.tags,
        source: input.selection.item.source,
        status: input.selection.item.status,
      },
    },
    selectedReason: input.selection.selectionReason as unknown as Record<string, unknown>,
    createdAt: input.createdAt,
  };

  db.insert(selectionEvents).values(row).run();
  return id;
}
