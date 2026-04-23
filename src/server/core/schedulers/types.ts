import type { ItemQueueRow, QueueRow, SkillConfidence } from "../../persistence/schema.js";

export const SCHEDULER_IDS = ["sm5"] as const;

export type SchedulerId = (typeof SCHEDULER_IDS)[number];
export type SelectionTier = "overdue" | "due_today" | "weak" | "new";

export interface SchedulerDefinition {
  id: SchedulerId;
  label: string;
  description: string;
  resolveSkillTier(input: {
    now: Date;
    queueRow: QueueRow;
    confidence: SkillConfidence;
  }): SelectionTier | null;
  resolveItemTier(input: {
    now: Date;
    itemQueueRow: ItemQueueRow;
    confidence: SkillConfidence;
  }): SelectionTier | null;
}
