import type { LearnspaceConfig } from "../learnspaces/config-types.js";
import type { SessionStepDrafts } from "../core/sessions.js";
import type { CoachMemorySnapshot } from "./coach-memory.js";
import type { SystemBlock } from "./llm-adapter.js";
import type { CoachDecision } from "./coach-policy.js";

export interface CoachingContext {
  learnspaceConfig: LearnspaceConfig;
  currentStepId: string;
  itemTitle: string;
  itemPrompt: string;
  stepDrafts: SessionStepDrafts;
  coachMemory: CoachMemorySnapshot;
  coachDecision?: CoachDecision | null;
  userMessage: string;
}

export interface AssembledCoachingPrompt {
  systemPrompt: string;
  systemBlocks: SystemBlock[];
  userMessage: string;
}

export interface CoachSessionSummary {
  turnCount: number;
  currentStepId: string | null;
  conversationSummary: string;
  revealedInformation: string[];
  openWeakpoints: string[];
}

const METADATA_INSTRUCTION = [
  "IMPORTANT: After your coaching response, on a new line output exactly:",
  "---METADATA---",
  "followed by a JSON object with these fields:",
  '{"help_level": <0.0-1.0>, "information_revealed": [<strings>], "user_appears_stuck": <bool>, "user_understanding": "<confused|partial|solid|strong>", "notable_mistake": <string|null>, "gave_full_solution": <bool>}',
  "Do not mention the metadata block to the user.",
].join("\n");

function formatStepDrafts(config: LearnspaceConfig, drafts: SessionStepDrafts): string {
  return config.protocol_steps
    .map((step) => {
      const draft = drafts[step.id];
      const content = draft?.content?.trim() || "(empty)";
      return `${step.label}: ${content}`;
    })
    .join("\n");
}

function formatProtocolOverview(config: LearnspaceConfig): string {
  const steps = config.protocol_steps
    .map((step, i) => `${i + 1}. ${step.label} — ${step.instruction}`)
    .join("\n");
  return `Protocol steps:\n${steps}`;
}

function formatTopMistakes(mistakes: string[]): string {
  if (mistakes.length === 0) return "None recorded yet";
  return mistakes.join(", ");
}

function formatRecurringWeakpoints(mistakes: string[]): string {
  if (mistakes.length === 0) return "None recorded yet";
  return mistakes.join(", ");
}

function formatRecentInsights(insights: string[]): string {
  if (insights.length === 0) return "None recorded yet";
  return insights.slice(0, 3).join(" | ");
}

function formatTrend(trend: CoachMemorySnapshot["trend"]): string {
  return trend ?? "None yet";
}

export function buildCoachSessionSummary(
  messages: Array<{ role: string; content: string; createdAt: string; metadata?: Record<string, unknown> | null }>,
  currentStepId: string,
): CoachSessionSummary {
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const userMessages = messages.filter((m) => m.role === "user");
  const turnCount = assistantMessages.length;

  const revealedSet = new Set<string>();
  for (const msg of assistantMessages) {
    const revealed = msg.metadata?.information_revealed;
    if (Array.isArray(revealed)) {
      for (const item of revealed) {
        if (typeof item === "string") revealedSet.add(item);
      }
    }
  }

  const weakpointSet = new Set<string>();
  for (const msg of assistantMessages) {
    const mistake = msg.metadata?.notable_mistake;
    if (typeof mistake === "string") weakpointSet.add(mistake);
  }

  const recentPairs: string[] = [];
  for (let i = 0; i < userMessages.length; i++) {
    const uMsg = userMessages[i];
    const aMsg = assistantMessages[i];
    if (uMsg && aMsg) {
      const uSnippet = uMsg.content.length > 80 ? uMsg.content.slice(0, 77) + "..." : uMsg.content;
      const aSnippet = aMsg.content.length > 80 ? aMsg.content.slice(0, 77) + "..." : aMsg.content;
      recentPairs.push(`Turn ${i + 1}: User asked "${uSnippet}" → Coach responded "${aSnippet}"`);
    }
  }
  const summaryPairs = recentPairs.slice(-3);
  const conversationSummary = summaryPairs.join(". ");

  return {
    turnCount,
    currentStepId,
    conversationSummary,
    revealedInformation: [...revealedSet],
    openWeakpoints: [...weakpointSet],
  };
}

function buildTier1Stable(config: LearnspaceConfig): string {
  const parts: string[] = [config.coaching_persona];
  if (config.coaching_instruction) {
    parts.push("", config.coaching_instruction);
  }
  parts.push("", formatProtocolOverview(config));
  parts.push("", METADATA_INSTRUCTION);
  return parts.join("\n");
}

function buildTier2SessionStable(
  itemTitle: string,
  itemPrompt: string,
  coachMemory: CoachMemorySnapshot,
  skillName: string,
): string {
  // Pattern history counts are SKILL-scoped, not item-scoped. The user may
  // have attempted many DIFFERENT items tagged with the same pattern.
  // Naming the pattern explicitly and spelling out the scope prevents the
  // coach from misreading "7 attempts" as "7 attempts on THIS problem."
  const parts: string[] = [
    `Item: ${itemTitle}`,
    itemPrompt,
    "",
    `Pattern history — "${skillName}"`,
    "(counts below are across ALL problems tagged with this pattern, NOT just the current item):",
    `- Confidence: ${coachMemory.score}/10`,
    `- Attempts: ${coachMemory.totalAttempts}, Clean: ${coachMemory.cleanSolves}, Assisted: ${coachMemory.assistedSolves}`,
    `- Trend: ${formatTrend(coachMemory.trend)}`,
    `- Common mistakes: ${formatTopMistakes(coachMemory.topMistakes)}`,
    `- Average help level: ${coachMemory.coachingPatterns.avgHelpLevel}`,
    `- Full-solution rate: ${coachMemory.coachingPatterns.fullSolutionRate}`,
    `- Stuck-turn rate: ${coachMemory.coachingPatterns.stuckRate}`,
    `- Latest understanding: ${coachMemory.coachingPatterns.latestUnderstanding ?? "None yet"}`,
    `- Repeated coach-observed weakpoints: ${formatRecurringWeakpoints(coachMemory.coachingPatterns.recurringNotableMistakes)}`,
    `- Recent insights: ${formatRecentInsights(coachMemory.recentInsights)}`,
  ];
  return parts.join("\n");
}

function buildTier3TurnVolatile(
  config: LearnspaceConfig,
  currentStepLabel: string,
  agentPrompt: string,
  stepDrafts: SessionStepDrafts,
  coachDecision: CoachDecision | null,
): string {
  const actionInstruction = coachDecision
    ? [
        `App-decided coaching action: ${coachDecision.action}`,
        `Action rationale: ${coachDecision.rationale}`,
        `You must execute that intervention type on this turn.`,
      ].join("\n")
    : "App-decided coaching action: none";
  return [
    `Current step: ${currentStepLabel}`,
    agentPrompt,
    "",
    actionInstruction,
    "",
    "User's work so far:",
    formatStepDrafts(config, stepDrafts),
    "",
    `HARD CONSTRAINT: You are helping with the "${currentStepLabel}" step. Your entire response must be about that step. Do not mention any other step by name. Do not ask the user to fill in a different step. Do not include checklists or scaffolds that belong to a different step. If "${currentStepLabel}" is the user's current step and other steps are empty, assume the user has those in their head and engage with "${currentStepLabel}" as the active task.`,
  ].join("\n");
}

export function assembleCoachingPrompt(ctx: CoachingContext): AssembledCoachingPrompt {
  const step = ctx.learnspaceConfig.protocol_steps.find(
    (current) => current.id === ctx.currentStepId,
  );
  if (!step) {
    throw new Error(`Invalid step ID: ${ctx.currentStepId}`);
  }

  // Tier 1: stable across every session on this learnspace.
  // Persona, protocol, and metadata rules don't change between turns or
  // sessions, so this is the largest reusable cache chunk.
  const tier1 = buildTier1Stable(ctx.learnspaceConfig);

  // Tier 2: stable for the lifetime of one session.
  // Item content and coach memory are snapshotted at session start and
  // don't change mid-session.
  const skillName =
    ctx.learnspaceConfig.skills.find((s) => s.id === ctx.coachMemory.skillId)?.name ??
    ctx.coachMemory.skillId;
  const tier2 = buildTier2SessionStable(
    ctx.itemTitle,
    ctx.itemPrompt,
    ctx.coachMemory,
    skillName,
  );

  // Tier 3: turn-volatile. Current step and drafts change on every turn.
  // Conversation history is NOT baked in here — the caller threads it
  // through the adapter's structured `messages[]` path via priorHistory.
  const tier3 = buildTier3TurnVolatile(
    ctx.learnspaceConfig,
    step.label,
    step.agent_prompt,
    ctx.stepDrafts,
    ctx.coachDecision ?? null,
  );

  const systemBlocks: SystemBlock[] = [
    { text: tier1, cacheable: true },
    { text: tier2, cacheable: true },
    { text: tier3 },
  ];

  return {
    systemPrompt: systemBlocks.map((block) => block.text).join("\n\n"),
    systemBlocks,
    userMessage: ctx.userMessage,
  };
}
