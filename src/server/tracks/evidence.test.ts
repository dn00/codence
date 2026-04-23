import { describe, expect, test } from "vitest";
import { buildEvidenceRecordFromCompletion } from "./evidence.js";

describe("buildEvidenceRecordFromCompletion", () => {
  test("maps evaluation mistakes and attempt features into a deterministic evidence record", () => {
    const evidence = buildEvidenceRecordFromCompletion({
      userId: "user-1",
      learnspaceId: "ls1",
      trackId: "track-1",
      artifactId: "item-1",
      sessionId: "session-1",
      attemptId: "attempt-1",
      observedAt: "2026-04-15T12:00:00.000Z",
      outcome: "failed",
      evaluation: {
        outcome: "failed",
        diagnosis: "test",
        severity: "moderate",
        approach_correct: false,
        per_step_quality: {},
        mistakes: [
          { type: "off_by_one", description: "Wrong boundary", step: "code" },
          { type: "missing_edge_case", description: "Missed empty", step: "verify" },
        ],
        strengths: ["good decomposition"],
        coaching_summary: "summary",
        evaluation_source: "llm",
        retry_recovered: false,
      },
      attemptFeatures: {
        solution_revealed: false,
        total_help_level: 0.8,
        coach_turns: 2,
        tests_passed: false,
        execution_required: true,
        execution_present: true,
        step_completion_rate: 0.25,
      },
      primarySkillId: "graphs",
    });

    expect(evidence.trackId).toBe("track-1");
    expect(evidence.mistakePatterns.map((m) => m.kind)).toEqual(["off_by_one", "missing_edge_case"]);
    expect(evidence.strengthSignals.map((s) => s.kind)).toEqual(["good decomposition"]);
    expect(evidence.communicationSignals).toEqual([{ kind: "high_help_dependency", weight: 0.8 }]);
    expect(evidence.difficultyMismatch).toEqual({
      direction: "too_hard",
      scopeRefs: [{ dimension: "skill", value: "graphs" }],
    });
    expect(evidence.fatigueOrAvoidance).toEqual({ level: "medium" });
  });
});
