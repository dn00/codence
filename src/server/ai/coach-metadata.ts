import type {
  CoachingMetadata,
  UserUnderstanding,
} from "../core/types.js";

const USER_UNDERSTANDINGS: UserUnderstanding[] = [
  "confused",
  "partial",
  "solid",
  "strong",
];

function isUserUnderstanding(value: unknown): value is UserUnderstanding {
  return (
    typeof value === "string" &&
    USER_UNDERSTANDINGS.includes(value as UserUnderstanding)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function isCoachingMetadata(value: unknown): value is CoachingMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.help_level === "number" &&
    Number.isFinite(record.help_level) &&
    isStringArray(record.information_revealed) &&
    typeof record.user_appears_stuck === "boolean" &&
    isUserUnderstanding(record.user_understanding) &&
    (record.notable_mistake === null || typeof record.notable_mistake === "string") &&
    typeof record.gave_full_solution === "boolean"
  );
}

export function normalizeCoachingMetadata(value: unknown): CoachingMetadata | null {
  return isCoachingMetadata(value) ? value : null;
}
