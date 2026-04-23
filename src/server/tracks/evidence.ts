import { randomUUID } from "node:crypto";
import type { AppDatabase } from "../persistence/db.js";
import { evidenceRecords } from "../persistence/schema.js";
import type { AttemptFeatures, StructuredEvaluation } from "../core/types.js";
import type { EvidenceRecordV2 } from "./types.js";

export function buildEvidenceRecordFromCompletion(input: {
  userId: string;
  learnspaceId: string;
  trackId: string;
  artifactId: string;
  sessionId: string;
  attemptId: string;
  observedAt: string;
  outcome: string;
  evaluation: StructuredEvaluation;
  attemptFeatures: AttemptFeatures;
  primarySkillId: string;
}): EvidenceRecordV2 {
  const mistakes = Array.isArray(input.evaluation.mistakes) ? input.evaluation.mistakes : [];
  const strengths = Array.isArray(input.evaluation.strengths) ? input.evaluation.strengths : [];
  return {
    version: "2",
    id: `evidence-${randomUUID()}`,
    userId: input.userId,
    learnspaceId: input.learnspaceId,
    trackId: input.trackId,
    artifactId: input.artifactId,
    sessionId: input.sessionId,
    attemptId: input.attemptId,
    observedAt: input.observedAt,
    source: "deterministic_runtime",
    scopeRefs: [{ dimension: "skill", value: input.primarySkillId }],
    outcome: {
      result:
        input.outcome === "clean" || input.outcome === "assisted" || input.outcome === "failed"
          ? input.outcome
          : "unknown",
      severity:
        input.evaluation.severity === "minor" || input.evaluation.severity === "moderate" || input.evaluation.severity === "critical"
          ? input.evaluation.severity
          : null,
    },
    mistakePatterns: mistakes.map((mistake) => ({
      kind: mistake.type,
      scopeRefs: [{ dimension: "skill", value: input.primarySkillId }],
    })),
    strengthSignals: strengths.map((strength) => ({
      kind: strength,
      scopeRefs: [{ dimension: "skill", value: input.primarySkillId }],
    })),
    communicationSignals:
      input.attemptFeatures.total_help_level > 0.7
        ? [{ kind: "high_help_dependency", weight: input.attemptFeatures.total_help_level }]
        : [],
    difficultyMismatch:
      input.outcome === "failed"
        ? { direction: "too_hard", scopeRefs: [{ dimension: "skill", value: input.primarySkillId }] }
        : input.outcome === "clean" && input.attemptFeatures.total_help_level < 0.15
          ? { direction: "too_easy", scopeRefs: [{ dimension: "skill", value: input.primarySkillId }] }
          : null,
    noveltyTolerance: null,
    fatigueOrAvoidance:
      input.attemptFeatures.step_completion_rate < 0.4
        ? { level: "medium" }
        : null,
    readinessSignals:
      input.outcome === "clean"
        ? [{ kind: "clean_completion", scopeRefs: [{ dimension: "skill", value: input.primarySkillId }] }]
        : [],
    confidenceCalibration: null,
  };
}

export function persistEvidenceRecord(
  db: AppDatabase,
  record: EvidenceRecordV2,
): void {
  db.insert(evidenceRecords)
    .values({
      id: record.id,
      trackId: record.trackId ?? null,
      learnspaceId: record.learnspaceId,
      userId: record.userId,
      artifactId: record.artifactId,
      sessionId: record.sessionId,
      attemptId: record.attemptId,
      evidence: record,
      createdAt: record.observedAt,
    })
    .run();
}
