import type { SchedulerDefinition } from "./types.js";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function nextUtcDay(date: Date): Date {
  return new Date(startOfUtcDay(date).getTime() + 24 * 60 * 60 * 1000);
}

export const sm5Scheduler: SchedulerDefinition = {
  id: "sm5",
  label: "SM-5",
  description: "Default spaced-repetition scheduler used for DSA review timing.",
  resolveSkillTier({ now, queueRow, confidence }) {
    if (queueRow.dueDate) {
      const due = new Date(queueRow.dueDate);
      if (!Number.isNaN(due.getTime())) {
        const dayStart = startOfUtcDay(now).getTime();
        const dayEnd = nextUtcDay(now).getTime();

        if (due.getTime() < dayStart) {
          return "overdue";
        }
        if (due.getTime() >= dayStart && due.getTime() < dayEnd) {
          return "due_today";
        }
      }
    }

    if (confidence.totalAttempts === 0) {
      return "new";
    }

    if (confidence.totalAttempts > 0 && confidence.score < 5) {
      return "weak";
    }

    return null;
  },
  resolveItemTier({ now, itemQueueRow, confidence }) {
    if (itemQueueRow.dueDate) {
      const due = new Date(itemQueueRow.dueDate);
      if (!Number.isNaN(due.getTime())) {
        const dayStart = startOfUtcDay(now).getTime();
        const dayEnd = nextUtcDay(now).getTime();

        if (due.getTime() < dayStart) {
          return "overdue";
        }
        if (due.getTime() >= dayStart && due.getTime() < dayEnd) {
          return "due_today";
        }
      }
    }

    if (itemQueueRow.round === 0 && !itemQueueRow.dueDate) {
      return "new";
    }

    if (itemQueueRow.round > 0 && confidence.score < 5) {
      return "weak";
    }

    return null;
  },
};
