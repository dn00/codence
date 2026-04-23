import type { SchedulerId } from "../core/schedulers/types.js";
import type { LearnspaceFamilyId } from "../families/types.js";

export interface ProtocolStep {
  id: string;
  label: string;
  instruction: string;
  agent_prompt: string;
  editor: "text" | "code" | "readonly";
  layout: "inline" | "full";
  template?: string;
}

export interface ExecutorConfig {
  type: string;
  timeout_ms: number;
  memory_mb: number;
}

export interface PreSessionConfig {
  showTimer?: boolean;
  timerOptions?: number[];
  showDifficulty?: boolean;
  showSkillName?: boolean;
}

export interface LearnspaceLabels {
  itemSingular?: string;
  itemPlural?: string;
  skillSingular?: string;
  skillPlural?: string;
  masterySingular?: string;
}

export interface TestCase {
  args: unknown[];
  expected: unknown;
  description: string;
}

export interface SeedItem {
  slug: string;
  title: string;
  prompt: string;
  function_name: string;
  difficulty: "easy" | "medium" | "hard";
  test_cases: TestCase[];
  reference_solution: string;
  skill_ids: string[];
  tags: string[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  category: string;        // display label / legacy; prefer categoryId for canonical grouping
  categoryId?: string;     // FK → CategoryDefinition.id; when set, drives queue scope + prompt
}

export interface CategoryDefinition {
  id: string;
  label: string;
  description?: string;
}

export type TagWeights = Record<string, Record<string, number>>;

export interface LearnspaceConfig {
  id: string;
  name: string;
  description: string;
  familyId?: LearnspaceFamilyId;
  schedulerId?: SchedulerId;
  builtInVersion?: number;
  protocol_steps: ProtocolStep[];
  coaching_persona: string;
  coaching_instruction?: string;
  evaluation_prompt: string;
  variant_prompt: string;
  executor: ExecutorConfig | null;
  preSession?: PreSessionConfig;
  labels?: LearnspaceLabels;
  item_schema: Record<string, unknown>;
  test_harness_template: string;
  skills: SkillDefinition[];
  categories?: CategoryDefinition[];
  tags: string[];
  tag_weights: TagWeights;
  skill_progression?: string[];
  confidence_gated_protocol_threshold: number;
  interleaving_confidence_threshold: number;
  /**
   * Cold-start daily review target for overdue-queue smoothing. Used only
   * while the user has < 7 completed attempts; after that, smoothing derives
   * cap from the rolling 7-day attempt rate. Picks for current learnspaces:
   * DSA coding (~25 min/item) → 5; short-form domains (math/trivia) → 20;
   * long-form (system-design ~45 min) → 3. Defaults to 5 when omitted.
   */
  defaultDailyCap?: number;
}
