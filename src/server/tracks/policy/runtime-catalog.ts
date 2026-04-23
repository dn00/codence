/**
 * Builds the domain catalog the policy compiler consumes (for prompt,
 * validator, and lowering) from the live DB, so that interpret-time
 * category/skill ids always match what the queue + UI will resolve.
 *
 * Benchmark fixtures (TRACK_V4_DOMAIN_FIXTURES) remain the source of
 * truth for the parity bench. Production callers pass a runtime catalog
 * instead; the compiler keeps the fixture fallback for bench-only paths.
 */
import type { AppDatabase } from "../../persistence/db.js";
import { categories as categoriesTable, skills as skillsTable } from "../../persistence/schema.js";
import type {
  TrackBenchmarkDomainFixtureV4,
} from "../v4/benchmark-fixtures.js";
import type { TrackV4DomainId } from "../v4/benchmark-schema.js";

export function buildDomainCatalogFromDb(
  db: AppDatabase,
  learnspaceId: string,
  domainId: TrackV4DomainId,
  label: string,
): TrackBenchmarkDomainFixtureV4 {
  const categoryRows = db.select().from(categoriesTable).all()
    .filter((c) => c.learnspaceId === learnspaceId);
  const validCategoryIds = new Set(categoryRows.map((c) => c.id));

  const skillRows = db.select().from(skillsTable).all()
    .filter((s) => s.learnspaceId === learnspaceId);

  const skills = skillRows.map((s) => ({
    id: s.id,
    name: s.name,
    // Prefer the canonical categoryId when it resolves; fall back to the
    // denormalized `category` label for skills that haven't been
    // categorized yet (nullable `category_id` during rollout).
    category: s.categoryId && validCategoryIds.has(s.categoryId)
      ? s.categoryId
      : s.category,
  }));

  return {
    id: domainId,
    label,
    skills,
    supportedCadenceBuckets: ["mock", "drill", "review", "recap"],
    supportsGeneratedContent: true,
    supportsGeneratedAssessment: false,
  };
}
