// Client-side API fetch helpers with typed responses.
// Types mirror the server route response shapes.

export interface OnboardingResponse {
  userId: string;
  learnspaceId: string;
  activeTag: string | null;
  llmConfigured: boolean;
}

export interface QueueSelection {
  queueId: string;
  skillId: string;
  skillName: string;
  tier: string;
  dueDate: string | null;
  confidenceScore: number;
  trackId?: string | null;
  selectionReason?: {
    schedulerIds: string[];
    candidateTier: string;
    trackId: string | null;
    trackSnapshot: LearnspaceTrackSummary | null;
    sessionPlanSummary?: {
      nodeId: string;
      sessionType: string;
      objective: string;
    } | null;
    rerankedByLLM: boolean;
    generated: boolean;
    generatedFromArtifactId?: string | null;
    generationAllowed: boolean;
    selectionSource: "item_queue" | "skill_queue" | "direct_item";
    reasons: string[];
  };
  item: {
    id: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    skillIds: string[];
    tags: string[];
    source?: string;
    status?: string;
    content: Record<string, unknown>;
  };
}

export interface SessionItemDetail {
  id: string;
  title: string;
  difficulty: string;
  skillIds: string[];
  content: Record<string, unknown>;
}

export interface SessionDetail {
  sessionId: string;
  attemptId: string;
  learnspaceId: string;
  itemId: string;
  item: SessionItemDetail | null;
  status: "created" | "in_progress" | "completed" | "abandoned";
  currentStep: string | null;
  stepDrafts: Record<string, { content: string; updatedAt: string }>;
  startedAt: string;
  completedAt: string | null;
}

export interface QueueNextResponse {
  session: SessionDetail;
  selection: QueueSelection;
}

export interface ProgressSummary {
  learnspace: {
    id: string;
    name: string;
    activeTag: string | null;
    activeTrackId?: string | null;
    activeTrack?: LearnspaceTrackSummary | null;
    interviewDate: string | null;
    dueTodayCount: number;
    overdueCount: number;
  };
  tracks?: LearnspaceTrackSummary[];
  trackAnalytics?: Array<{
    trackId: string | null;
    trackName: string | null;
    completedAttempts: number;
    generatedAttempts: number;
    lastAttemptAt: string | null;
  }>;
  skills: Array<{
    skillId: string;
    name: string;
    score: number;
    totalAttempts: number;
    trend: string | null;
    dueDate: string | null;
    lastOutcome: string | null;
    totalProblems: number;
    completedProblems: number;
  }>;
  queueItems: Array<{
    itemId: string;
    itemTitle: string;
    skillId: string;
    skillName: string;
    difficulty: string;
    source: string;
    dueDate: string | null;
    lastOutcome: string | null;
    round: number;
  }>;
  recentAttempts: Array<{
    attemptId: string;
    itemTitle: string;
    outcome: string | null;
    startedAt: string;
    completedAt: string | null;
    primarySkillId: string;
    trackId?: string | null;
    trackName?: string | null;
    schedulerIds?: string[];
    selectionSource?: string | null;
    generated?: boolean;
    generatedFromArtifactId?: string | null;
    itemSource?: string;
    itemStatus?: string;
    generatedForSkillId?: string | null;
    generatedForTrackId?: string | null;
  }>;
  estimatedMinutes: number | null;
  insightsSummary: {
    strongestSkillId: string | null;
    weakestSkillId: string | null;
    mostGuidanceNeededSkillId: string | null;
    improvingSkillCount: number;
    decliningSkillCount: number;
  };
}

export interface SkillDrilldown {
  skillId: string;
  name: string;
  score: number;
  totalAttempts: number;
  cleanSolves: number;
  assistedSolves: number;
  failedAttempts: number;
  trend: string | null;
  dueDate: string | null;
  items?: Array<{
    itemId: string;
    title: string;
    difficulty: string;
    source: string;
    solveCount: number;
    lastOutcome: string | null;
  }>;
  itemsPracticed: Array<{
    itemId: string;
    title: string;
    source: string;
    solveCount: number;
    lastOutcome: string | null;
  }>;
  commonMistakes: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  coachingInsights: string[];
  helpDependence: {
    avgHelpLevel: number;
    fullSolutionRate: number;
    stuckRate: number;
    label: "independent" | "guided" | "help-heavy";
  };
  behaviorSummary: string;
}

export interface CompletionResult {
  sessionId: string;
  attemptId: string;
  outcome: string;
  modelOutcome: string;
  finalOutcome: string;
  appliedOverrides: Array<{
    rule: "tests_failed" | "solution_revealed" | "step_completion_rate" | "help_level_threshold" | "execution_required";
    reason: string;
  }>;
  evaluation: {
    outcome: string;
    diagnosis: string;
    severity: string;
    approach_correct: boolean;
    per_step_quality: Record<string, string>;
    mistakes: Array<{ type: string; description: string; step: string }>;
    strengths: string[];
    coaching_summary: string;
    evaluation_source: "llm" | "stub";
    retry_recovered: boolean;
    stub_reason?: string;
  };
  primarySkill: {
    skillId: string;
    score: number;
    trend: string | null;
    nextDueDate: string | null;
  };
}

export interface TestCaseResult {
  description: string;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
}

export interface ExecutionResult {
  passed: number;
  failed: number;
  errors: string[];
  testDetails?: TestCaseResult[];
}

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

export interface LearnspaceResponse {
  id: string;
  name: string;
  activeTag: string | null;
  activeTrackId?: string | null;
  activeTrack?: LearnspaceTrackSummary | null;
  tracks?: LearnspaceTrackSummary[];
  interviewDate: string | null;
  familyId: string;
  schedulerId: string;
  policyTracks?: {
    supported: boolean;
    domainId?: string;
    reason?: string;
  };
  // Family is a capability envelope advertised by the server for
  // descriptive purposes. The client only reads id/label/description at
  // runtime today; the server still ships the full envelope
  // (archetypes, moduleIds, artifactKinds, protocolStepIds,
  // validatorKinds, schedulerIds) in the wire payload but those fields
  // are not typed here because nothing in the client reads them.
  family: {
    id: string;
    label: string;
    description: string;
  };
  config: {
    protocol_steps: ProtocolStep[];
    executor: ExecutorConfig | null;
    preSession?: {
      showTimer?: boolean;
      timerOptions?: number[];
      showDifficulty?: boolean;
      showSkillName?: boolean;
    };
    labels?: {
      itemSingular?: string;
      itemPlural?: string;
      skillSingular?: string;
      skillPlural?: string;
      masterySingular?: string;
    };
    confidence_gated_protocol_threshold: number;
    [key: string]: unknown;
  };
}

export interface ProviderStatus {
  id: "claude-code" | "openai-compat" | "ollama" | "anthropic" | "session-pool";
  label: string;
  kind: "llm-adapter" | "coach-runtime";
  configured: boolean;
  supports: { coach: boolean; completion: boolean };
  envVars: Array<{ name: string; required: boolean; purpose?: string }>;
}

export interface HealthResponse {
  status: "ok";
  service: "codence";
  diagnostics: {
    coach: {
      configured: boolean;
      backend: string | null;
      activeSessions: number;
      expiredSessionsCleared: number;
      resumedTurns: number;
    };
    completion: {
      configured: boolean;
      backend: string | null;
    };
    database?: {
      path: string;
      sizeBytes: number | null;
      modifiedAt: string | null;
    };
  };
  providers: ProviderStatus[];
}

class ApiResponseError extends Error {
  readonly status: number;
  readonly unsupportedFields?: string[];

  constructor(message: string, status: number, unsupportedFields?: string[]) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.unsupportedFields = unsupportedFields;
  }
}

async function readErrorDetail(
  res: Response,
  fallbackMessage: string,
): Promise<{ message: string; unsupportedFields?: string[] }> {
  const detail = await res.json().catch(() => null) as
    | { error?: unknown; message?: unknown; unsupportedFields?: unknown }
    | null;
  const message =
    typeof detail?.message === "string" ? detail.message
    : typeof detail?.error === "string" ? detail.error
    : fallbackMessage;
  const unsupportedFields = Array.isArray(detail?.unsupportedFields)
    ? detail.unsupportedFields.filter((field): field is string => typeof field === "string")
    : undefined;
  return { message, unsupportedFields };
}

export async function postOnboarding(): Promise<OnboardingResponse> {
  const res = await fetch("/api/onboarding", { method: "POST" });
  if (!res.ok) throw new Error(`Onboarding failed: ${res.status}`);
  return res.json();
}

export async function getProgress(): Promise<ProgressSummary> {
  const res = await fetch("/api/progress");
  if (!res.ok) throw new Error(`Failed to load progress: ${res.status}`);
  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`Failed to load health: ${res.status}`);
  return res.json();
}

export async function resetSkillStats(skillId: string): Promise<void> {
  const res = await fetch(`/api/skills/${skillId}/reset`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to reset skill: ${res.status}`);
}

export async function getSkillDrilldown(skillId: string): Promise<SkillDrilldown> {
  const res = await fetch(`/api/skills/${skillId}/drilldown`);
  if (!res.ok) throw new Error(`Failed to load drill-down: ${res.status}`);
  return res.json();
}

export type SessionMode =
  | "recommended"
  | "explore"
  | "weakest_pattern"
  | "foundations";

export type TrackSource =
  | "system_template"
  | "user_authored"
  | "llm_drafted";

export type TrackStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export type TrackArchetype =
  | "maintenance"
  | "deadline_sprint"
  | "weakness_rehab"
  | "foundations_rebuild"
  | "curriculum_progression"
  | "mock_interview"
  | "topic_sprint"
  | "breadth_then_depth"
  | "assessment_first"
  | "recovery_mode";

export type TrackQueueStrategy =
  | "scheduler"
  | "new_only"
  | "weakest_first"
  | "hardest_first"
  | "foundations";

export type TrackEvaluationMode =
  | "learning"
  | "balanced"
  | "interview_honest"
  | "exam_honest"
  | "communication_focused";

export interface LearnspaceTrackSummary {
  id: string;
  learnspaceId: string;
  slug: string;
  name: string;
  goal: string;
  isSystem: boolean;
  source?: TrackSource;
  status?: TrackStatus;
  spec?: {
    version: "2";
    id: string;
    learnspaceId: string;
    userId: string;
    name: string;
    archetype: TrackArchetype;
    goal: string;
    explanation: string;
    scopePolicy: {
      mode: "learnspace" | "subset" | "weighted_subset" | "prerequisite_gated";
      refs: Array<{ dimension: string; value: string }>;
    };
    difficultyPolicy: {
      defaultTarget: {
        mode: "fixed" | "range" | "adaptive";
        targetBand?: string | null;
        minBand?: string | null;
        maxBand?: string | null;
      };
      regressionAllowed?: boolean;
    };
    blendPolicy: {
      entries: Array<{ kind: string; weight: number }>;
    };
    generationPolicy: {
      allowGeneration: boolean;
      allowedArtifactKinds?: string[];
      styleTarget?: {
        dimensions: Array<{ id: string; value: string; weight?: number | null }>;
      } | null;
    };
    evaluationPolicy: {
      mode: "learning" | "balanced" | "interview_honest" | "exam_honest" | "communication_focused";
    };
  } | null;
  program?: {
    version: "2";
    entryNodeId: string;
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      objective: string;
      plannerConfig?: {
        sessionType?: string;
        queueStrategy?: string;
        generationAllowed?: boolean;
        evaluationStrictness?: string;
      };
    }>;
  } | null;
}

export interface ActivateTrackResponse {
  learnspaceId: string;
  activeTrackId: string;
  activeTrack: LearnspaceTrackSummary;
  tracks: LearnspaceTrackSummary[];
}

export type TrackPolicy = Record<string, unknown>;

export interface PolicyRepairNote {
  field: string;
  change: string;
  reason: string;
}

export interface PolicyApproximation {
  field: string;
  representedAs: string;
}

export interface PolicyExplanation {
  repairs?: PolicyRepairNote[];
  approximations?: PolicyApproximation[];
  notes?: string[];
}

export interface InterpretTurn {
  role: "user" | "assistant";
  content: string;
}

export interface InterpretTrackInput {
  goal: string;
  name?: string;
  skillIds?: string[];
  priorTurns?: InterpretTurn[];
}

export type InterpretTrackResponse =
  | {
      outcome: "compiled" | "repaired";
      policy: TrackPolicy;
      preview: {
        spec: LearnspaceTrackSummary["spec"];
        program: LearnspaceTrackSummary["program"];
      };
      explanation: PolicyExplanation;
      displayName?: string;
      compilerVersion: string;
    }
  | {
      outcome: "clarify";
      question: string;
      compilerVersion: string;
    }
  | {
      outcome: "reject";
      reason: string;
      unsupportedFields?: string[];
      compilerVersion: string;
    };

export interface CreateTrackInput {
  goal: string;
  name?: string;
  displayName?: string;
  policy: TrackPolicy;
  policyOutcome: "compiled" | "repaired";
  policyExplanation?: PolicyExplanation;
  compilerVersion?: string;
}

export interface CreateTrackResponse {
  track: LearnspaceTrackSummary;
  activeTrackId: string;
  tracks: LearnspaceTrackSummary[];
}

export interface UpdateTrackResponse {
  track: LearnspaceTrackSummary;
  tracks: LearnspaceTrackSummary[];
}

export interface ArchiveTrackResponse {
  track: LearnspaceTrackSummary;
  activeTrackId: string | null;
  tracks: LearnspaceTrackSummary[];
}

export interface DeleteTrackResponse {
  activeTrackId: string | null;
  tracks: LearnspaceTrackSummary[];
}

export async function postQueueNext(
  trackId?: string,
  targetSkillId?: string,
  targetItemId?: string,
  forceGenerated?: boolean,
): Promise<QueueNextResponse> {
  const options: RequestInit = { method: "POST" };
  if (trackId || targetSkillId || targetItemId || forceGenerated) {
    const payload: Record<string, string | boolean> = {};
    if (trackId) payload.trackId = trackId;
    if (targetSkillId) payload.targetSkillId = targetSkillId;
    if (targetItemId) payload.targetItemId = targetItemId;
    if (forceGenerated) payload.forceGenerated = true;
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(payload);
  }
  const res = await fetch("/api/queue/next", options);
  if (!res.ok) throw new Error(`Failed to start session: ${res.status}`);
  return res.json();
}

export async function getSession(sessionId: string): Promise<SessionDetail> {
  const res = await fetch(`/api/sessions/${sessionId}`);
  if (!res.ok) throw new Error(`Failed to load session: ${res.status}`);
  return res.json();
}

export async function getLearnspace(id: string): Promise<LearnspaceResponse> {
  const res = await fetch(`/api/learnspaces/${id}`);
  if (!res.ok) throw new Error(`Failed to load learnspace: ${res.status}`);
  return res.json();
}

export interface LearnspaceListItem {
  id: string;
  name: string;
  description: string;
  familyId: string;
  schedulerId: string;
  activeTrackId?: string | null;
  activeTrack?: LearnspaceTrackSummary | null;
  policyTracks?: {
    supported: boolean;
    domainId?: string;
    reason?: string;
  };
}

export interface InvalidLearnspaceEntry {
  id: string;
  name: string;
  error: string;
}

export interface LearnspaceListResponse {
  activeId: string;
  learnspaces: LearnspaceListItem[];
  invalidLearnspaces?: InvalidLearnspaceEntry[];
}

export async function getLearnspaces(): Promise<LearnspaceListResponse> {
  const res = await fetch("/api/learnspaces");
  if (!res.ok) throw new Error(`Failed to load learnspaces: ${res.status}`);
  return res.json();
}

export async function switchLearnspace(id: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`/api/learnspaces/${id}/switch`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to switch learnspace: ${res.status}`);
  return res.json();
}

export async function activateTrack(trackId: string): Promise<ActivateTrackResponse> {
  const res = await fetch(`/api/tracks/${trackId}/activate`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to activate track: ${res.status}`);
  return res.json();
}

export async function interpretTrack(input: InterpretTrackInput): Promise<InterpretTrackResponse> {
  const res = await fetch("/api/tracks/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res, `Failed to interpret track: ${res.status}`);
    throw new ApiResponseError(detail.message, res.status, detail.unsupportedFields);
  }
  return res.json();
}

export async function createTrack(input: CreateTrackInput): Promise<CreateTrackResponse> {
  const res = await fetch("/api/tracks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res, `Failed to create track: ${res.status}`);
    throw new ApiResponseError(detail.message, res.status, detail.unsupportedFields);
  }
  return res.json();
}

export async function updateTrack(trackId: string, input: CreateTrackInput): Promise<UpdateTrackResponse> {
  const res = await fetch(`/api/tracks/${trackId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res, `Failed to update track: ${res.status}`);
    throw new ApiResponseError(detail.message, res.status, detail.unsupportedFields);
  }
  return res.json();
}

export async function archiveTrack(trackId: string): Promise<ArchiveTrackResponse> {
  const res = await fetch(`/api/tracks/${trackId}/archive`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to archive track: ${res.status}`);
  return res.json();
}

export async function deleteTrack(trackId: string): Promise<DeleteTrackResponse> {
  const res = await fetch(`/api/tracks/${trackId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete track: ${res.status}`);
  return res.json();
}

export async function patchSessionStep(
  sessionId: string,
  stepId: string,
  content: string,
): Promise<SessionDetail> {
  const res = await fetch(`/api/sessions/${sessionId}/step`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stepId, content }),
  });
  if (!res.ok) throw new Error(`Failed to save step: ${res.status}`);
  return res.json();
}

export async function postSessionComplete(
  sessionId: string,
): Promise<CompletionResult> {
  const res = await fetch(`/api/sessions/${sessionId}/complete`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to complete session: ${res.status}`);
  return res.json();
}

export async function postSessionExecute(
  sessionId: string,
  code: string,
): Promise<ExecutionResult> {
  const res = await fetch(`/api/sessions/${sessionId}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Execution failed: ${res.status}`);
  return res.json();
}

export interface CoachSSECallbacks {
  onDelta: (text: string) => void;
  onMetadata: (metadata: Record<string, unknown>) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export function postSessionCoach(
  sessionId: string,
  message: string,
  currentStepId: string,
  callbacks: CoachSSECallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, currentStepId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        callbacks.onError(new Error(`Coach request failed: ${res.status}`));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError(new Error("No response body"));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (currentEvent === "delta" && typeof parsed.text === "string") {
                callbacks.onDelta(parsed.text);
              } else if (currentEvent === "metadata") {
                callbacks.onMetadata(parsed);
              } else if (currentEvent === "done") {
                callbacks.onDone();
              }
            } catch {
              // Skip malformed data lines
            }
            currentEvent = "";
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  })();

  return controller;
}

export async function postSessionSkip(
  sessionId: string,
  trackId?: string,
): Promise<QueueNextResponse> {
  const options: RequestInit = { method: "POST" };
  if (trackId) {
    const payload: Record<string, string> = {};
    if (trackId) payload.trackId = trackId;
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(payload);
  }
  const res = await fetch(`/api/sessions/${sessionId}/skip`, options);
  if (!res.ok) throw new Error(`Failed to skip session: ${res.status}`);
  return res.json();
}

export async function postSessionAbandon(sessionId: string): Promise<SessionDetail> {
  const res = await fetch(`/api/sessions/${sessionId}/abandon`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to abandon session: ${res.status}`);
  return res.json();
}

export interface LibraryItem {
  id: string;
  learnspaceId: string;
  slug: string | null;
  title: string;
  content: Record<string, unknown>;
  skillIds: string[];
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  source: string;
  status: string;
  parentItemId: string | null;
  createdAt: string;
  retiredAt: string | null;
  lineage?: {
    artifactId: string;
    parentArtifactId: string | null;
    source: string;
    generationMode: string;
    generatedForSkillId: string | null;
    generatedForTrackId: string | null;
    generatorVersion: string;
    promptVersion: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  } | null;
}

export interface LibraryItemsResponse {
  items: LibraryItem[];
}

export interface LibraryItemInput {
  title: string;
  difficulty: "easy" | "medium" | "hard";
  skillIds: string[];
  prompt: string;
  tags?: string[];
  content?: Record<string, unknown>;
}

export async function getItems(query = ""): Promise<LibraryItemsResponse> {
  const res = await fetch(`/api/items${query}`);
  if (!res.ok) throw new Error(`Failed to load items: ${res.status}`);
  return res.json();
}

export async function createItem(input: LibraryItemInput): Promise<{ item: LibraryItem }> {
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create item: ${res.status}`);
  return res.json();
}

export async function updateItem(id: string, input: Partial<LibraryItemInput>): Promise<{ item: LibraryItem }> {
  const res = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);
  return res.json();
}

export async function retireItem(id: string): Promise<{ item: LibraryItem }> {
  const res = await fetch(`/api/items/${id}/retire`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to retire item: ${res.status}`);
  return res.json();
}

export async function deleteItem(id: string): Promise<{ deleted: true; id: string }> {
  const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete item: ${res.status}`);
  return res.json();
}

export async function deleteSkill(id: string): Promise<{ deleted: true; id: string }> {
  const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete skill: ${res.status}`);
  return res.json();
}

export interface LibrarySkill {
  id: string;
  learnspaceId: string;
  name: string;
  category: string;
  createdAt: string;
  totalAttempts: number;
  score: number;
  trend: string | null;
  itemCount: number;
  completedProblems: number;
  dueDate: string | null;
  lastOutcome: string | null;
}

export async function getSkills(): Promise<{ skills: LibrarySkill[] }> {
  const res = await fetch("/api/skills");
  if (!res.ok) throw new Error(`Failed to load skills: ${res.status}`);
  return res.json();
}

export interface LibraryTrack extends LearnspaceTrackSummary {
  learnspaceId: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  analytics?: {
    completedAttempts: number;
    generatedAttempts: number;
    lastAttemptAt: string | null;
  };
}

export async function getTracks(): Promise<{ tracks: LibraryTrack[] }> {
  const res = await fetch("/api/tracks");
  if (!res.ok) throw new Error(`Failed to load tracks: ${res.status}`);
  return res.json();
}
