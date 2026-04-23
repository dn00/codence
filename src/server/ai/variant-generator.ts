// This module is the `protocol_solve` / `code_problem` variant generator.
// It is NOT a general learnspace/content generation system — it produces
// new code-problem items (function signature, test cases, reference
// solution) validated by the code executor. A future generic generation
// boundary would dispatch by target archetype (protocol_solve, recall,
// explain, artifact_review, ...) and target artifact schema; this file
// should stay the code-problem implementation behind that dispatcher, not
// grow into the dispatcher itself.
import { randomUUID } from "node:crypto";
import type { AppDatabase } from "../persistence/db.js";
import type { Item } from "../persistence/schema.js";
import { artifactLineage, items } from "../persistence/schema.js";
import type { LearnspaceConfig, TestCase } from "../learnspaces/config-types.js";
import type { CompletionLLM } from "./llm-adapter.js";
import type { ExecutionAdapter, ExecutionResult } from "../execution/executor.js";
import { buildTestHarness } from "../execution/executor.js";

export interface VariantGeneratorInput {
  parentItem: Item;
  skillId: string;
  skillName: string;
  difficulty: "easy" | "medium" | "hard";
  learnspaceConfig: LearnspaceConfig;
  learnspaceId: string;
  generatedForTrackId?: string | null;
  targetMistakes?: string[];
}

export interface VariantGeneratorDependencies {
  completionLLM: CompletionLLM;
  executionAdapter: ExecutionAdapter;
  db: AppDatabase;
  now: () => Date;
}

export interface VariantGeneratorResult {
  item: Item;
  validated: boolean;
}

interface ParsedVariant {
  title: string;
  prompt: string;
  function_name: string;
  difficulty: string;
  test_cases: TestCase[];
  reference_solution: string;
  skill_ids: string[];
  tags: string[];
  target_mistakes?: string[];
}

export function assembleVariantPrompt(input: VariantGeneratorInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const parentContent = input.parentItem.content ?? {};
  const reference =
    typeof parentContent.reference_solution === "string"
      ? parentContent.reference_solution
      : "(no reference solution)";

  let filled = input.learnspaceConfig.variant_prompt
    .replace(/\{skill_name\}/g, input.skillName)
    .replace(/\{item_content\}/g, JSON.stringify(parentContent, null, 2))
    .replace(/\{reference\}/g, reference)
    .replace(/\{difficulty\}/g, input.difficulty)
    .replace(/\{item_schema\}/g, JSON.stringify(input.learnspaceConfig.item_schema, null, 2));

  if (input.targetMistakes && input.targetMistakes.length > 0) {
    const mistakeList = input.targetMistakes
      .map((m) => `- ${m}`)
      .join("\n");
    filled += `\n\nAdditionally, design this problem to specifically test these areas where the user has struggled:\n${mistakeList}\n\nThe problem should create scenarios where these mistake patterns are likely to surface if the user hasn't corrected them.`;
  }

  const systemPrompt = [
    "You are generating a practice item variant. Return ONLY a valid JSON object matching the required schema.",
    "Do not include any text before or after the JSON.",
  ].join("\n");

  return { systemPrompt, userPrompt: filled };
}

function extractJSON(raw: string): unknown | null {
  // Strip markdown code fences if present
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return null;

  try {
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
}

function isValidVariant(obj: unknown): obj is ParsedVariant {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.title !== "string") return false;
  if (typeof o.prompt !== "string") return false;
  if (typeof o.function_name !== "string") return false;
  if (typeof o.difficulty !== "string") return false;
  if (!Array.isArray(o.test_cases) || o.test_cases.length === 0) return false;
  if (typeof o.reference_solution !== "string") return false;
  if (!Array.isArray(o.skill_ids)) return false;
  if (!Array.isArray(o.tags)) return false;
  return true;
}

async function callLLMAndParse(
  completionLLM: CompletionLLM,
  systemPrompt: string,
  userPrompt: string,
): Promise<ParsedVariant | null> {
  const raw = await completionLLM.complete(systemPrompt, userPrompt);
  const parsed = extractJSON(raw);
  if (!parsed || !isValidVariant(parsed)) return null;
  return parsed;
}

async function validateViaExecution(
  executionAdapter: ExecutionAdapter,
  config: LearnspaceConfig,
  variant: ParsedVariant,
): Promise<boolean> {
  const harness = buildTestHarness(
    config.test_harness_template,
    variant.function_name,
    variant.test_cases,
  );
  const result: ExecutionResult = await executionAdapter.execute(
    variant.reference_solution,
    harness,
  );
  return result.failed === 0 && result.errors.length === 0;
}

function persistVariant(
  db: AppDatabase,
  now: () => Date,
  input: VariantGeneratorInput,
  variant: ParsedVariant,
): Item {
  const id = randomUUID();
  const content: Record<string, unknown> = {
    title: variant.title,
    prompt: variant.prompt,
    function_name: variant.function_name,
    difficulty: variant.difficulty,
    test_cases: variant.test_cases,
    reference_solution: variant.reference_solution,
    skill_ids: variant.skill_ids,
    tags: variant.tags,
  };

  if (input.targetMistakes && input.targetMistakes.length > 0) {
    content.target_mistakes = input.targetMistakes;
  }

  const createdAt = now().toISOString();

  db.transaction((tx) => {
    tx.insert(items)
      .values({
        id,
        learnspaceId: input.learnspaceId,
        title: variant.title,
        content,
        skillIds: variant.skill_ids.length > 0 ? variant.skill_ids : [input.skillId],
        tags: variant.tags,
        difficulty: input.difficulty,
        source: "generated",
        status: "active",
        parentItemId: input.parentItem.id,
        createdAt,
      })
      .run();

    tx.insert(artifactLineage)
      .values({
        artifactId: id,
        parentArtifactId: input.parentItem.id,
        source: "generated",
        generationMode: input.targetMistakes && input.targetMistakes.length > 0
          ? "targeted_variant"
          : "variant",
        generatedForSkillId: input.skillId,
        generatedForTrackId: input.generatedForTrackId ?? null,
        generatorVersion: "variant-generator:v1",
        promptVersion: "variant_prompt:v1",
        metadata: {
          validatedSkillIds: variant.skill_ids,
          targetMistakes: input.targetMistakes ?? [],
        },
        // Snapshot the parent so lineage survives parent deletion.
        parentItemSnapshot: {
          id: input.parentItem.id,
          title: input.parentItem.title,
          difficulty: input.parentItem.difficulty,
          source: input.parentItem.source,
          content: (input.parentItem.content as Record<string, unknown> | null) ?? null,
          skillIds: input.parentItem.skillIds ?? [],
          snapshottedAt: createdAt,
        },
        createdAt,
      })
      .run();
  });

  const row = db.select().from(items).all().find((i) => i.id === id);
  if (!row) {
    throw new Error("Failed to persist generated variant");
  }
  return row;
}

export async function generateVariant(
  deps: VariantGeneratorDependencies,
  input: VariantGeneratorInput,
): Promise<VariantGeneratorResult | null> {
  const { completionLLM, executionAdapter, db, now } = deps;
  const { systemPrompt, userPrompt } = assembleVariantPrompt(input);

  const hasExecutor = input.learnspaceConfig.executor !== null;

  // Attempt generation with retries:
  // - Up to 1 JSON parse retry
  // - Up to 2 execution retries (spec §7)
  // Total max LLM calls: 3 (initial + 2 retries) if execution fails
  //                    or 2 (initial + 1 retry) if JSON parse fails
  const MAX_EXECUTION_RETRIES = 2;
  const MAX_JSON_RETRIES = 1;

  let jsonRetries = 0;
  let executionRetries = 0;

  while (true) {
    let variant: ParsedVariant | null;
    try {
      variant = await callLLMAndParse(completionLLM, systemPrompt, userPrompt);
    } catch {
      // LLM adapter threw — do not retry
      return null;
    }

    if (!variant) {
      // JSON parse/validation failed
      if (jsonRetries < MAX_JSON_RETRIES) {
        jsonRetries++;
        continue;
      }
      return null;
    }

    // JSON is valid — now validate via execution if applicable
    if (!hasExecutor) {
      const item = persistVariant(db, now, input, variant);
      return { item, validated: false };
    }

    try {
      const passed = await validateViaExecution(executionAdapter, input.learnspaceConfig, variant);
      if (passed) {
        const item = persistVariant(db, now, input, variant);
        return { item, validated: true };
      }
    } catch {
      // Execution threw — treat as failure
    }

    // Execution failed
    if (executionRetries < MAX_EXECUTION_RETRIES) {
      executionRetries++;
      continue;
    }

    return null;
  }
}
