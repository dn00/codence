import type { SchedulerDefinition, SchedulerId } from "./types.js";
import { sm5Scheduler } from "./sm5-scheduler.js";

const schedulerRegistry: Record<SchedulerId, SchedulerDefinition> = {
  sm5: sm5Scheduler,
};

export function getScheduler(id: SchedulerId): SchedulerDefinition {
  const scheduler = schedulerRegistry[id];
  if (!scheduler) {
    throw new Error(`Unknown scheduler: ${id}`);
  }
  return scheduler;
}
