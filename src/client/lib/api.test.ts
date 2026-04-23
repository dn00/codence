// @vitest-environment jsdom

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  postOnboarding,
  getProgress,
  postQueueNext,
  getSession,
  getLearnspace,
  activateTrack,
  archiveTrack,
  createTrack,
  patchSessionStep,
  postSessionComplete,
  postSessionExecute,
  postSessionSkip,
  getSkillDrilldown,
  updateTrack,
} from "./api";
import type {
  OnboardingResponse,
  ProgressSummary,
  QueueNextResponse,
  SessionDetail,
  LearnspaceResponse,
  CompletionResult,
  SkillDrilldown,
  ActivateTrackResponse,
  CreateTrackResponse,
} from "./api";

const mockOnboarding: OnboardingResponse = {
  userId: "u1",
  learnspaceId: "ls1",
  activeTag: null,
  llmConfigured: false,
};

const mockProgress: ProgressSummary = {
  learnspace: {
    id: "ls1",
    name: "Coding Interview Patterns",
    activeTag: null,
    activeTrackId: "track-ls1-recommended",
      activeTrack: {
        id: "track-ls1-recommended",
        learnspaceId: "ls1",
        slug: "recommended",
        name: "Recommended",
        goal: "Stay current",
        isSystem: true,
      },
    interviewDate: null,
    dueTodayCount: 3,
    overdueCount: 1,
  },
  tracks: [],
  skills: [],
  queueItems: [],
  recentAttempts: [],
  estimatedMinutes: null,
  insightsSummary: {
    strongestSkillId: null,
    weakestSkillId: null,
    mostGuidanceNeededSkillId: null,
    improvingSkillCount: 0,
    decliningSkillCount: 0,
  },
};

const mockSession: SessionDetail = {
  sessionId: "s1",
  attemptId: "a1",
  learnspaceId: "ls1",
  itemId: "item1",
  item: { id: "item1", title: "Two Sum", difficulty: "easy", skillIds: ["sk1"], content: { prompt: "Given an array..." } },
  status: "created",
  currentStep: null,
  stepDrafts: {},
  startedAt: "2026-04-08T00:00:00Z",
  completedAt: null,
};

const mockQueueNext: QueueNextResponse = {
  session: mockSession,
  selection: {
    queueId: "q1",
    skillId: "sk1",
    skillName: "Two Pointers",
    tier: "due_today",
    dueDate: "2026-04-08",
    confidenceScore: 5,
    trackId: "track-ls1-recommended",
    item: {
      id: "item1",
      title: "Two Sum",
      difficulty: "easy",
      skillIds: ["sk1"],
      tags: ["arrays"],
      content: {},
    },
  },
};

const mockLearnspace: LearnspaceResponse = {
  id: "ls1",
  name: "Coding Interview Patterns",
  activeTag: null,
  activeTrackId: "track-ls1-recommended",
  activeTrack: mockProgress.learnspace.activeTrack,
  tracks: [],
  interviewDate: null,
  familyId: "dsa",
  schedulerId: "sm5",
  family: {
    id: "dsa",
    label: "DSA",
    description: "Coding interview problem solving with an editor, tests, and structured solve protocol.",
  },
  config: {
    protocol_steps: [
      {
        id: "understanding",
        label: "Understanding",
        instruction: "Explain the problem",
        agent_prompt: "",
        editor: "text",
        layout: "inline",
      },
    ],
    executor: { type: "python-subprocess", timeout_ms: 5000, memory_mb: 256 },
    confidence_gated_protocol_threshold: 7.0,
  },
};

const mockActivateTrack: ActivateTrackResponse = {
  learnspaceId: "ls1",
  activeTrackId: "track-ls1-weakest_pattern",
  activeTrack: {
    id: "track-ls1-weakest_pattern",
    learnspaceId: "ls1",
    slug: "weakest_pattern",
    name: "Weakest Pattern",
    goal: "Repair weak skills",
    isSystem: true,
  },
  tracks: [],
};

const mockCreateTrack: CreateTrackResponse = {
  track: {
    id: "track-ls1-custom-1",
    learnspaceId: "ls1",
    slug: "graph-rehab-custom-1",
    name: "Graph Rehab",
    goal: "Rebuild graph traversal confidence.",
    isSystem: false,
    source: "llm_drafted",
    status: "active",
  },
  activeTrackId: "track-ls1-custom-1",
  tracks: [],
};

const samplePolicy = {
  scope: { includeSkillIds: ["graphs"], excludeSkillIds: [], includeCategories: [], excludeCategories: [] },
  allocation: {},
  pacing: {},
  sessionComposition: {},
  difficulty: { mode: "adaptive", targetBand: "medium" },
  progression: { mode: "linear" },
  review: { scheduler: "sm5" },
  adaptation: {},
  cadence: [],
  contentSource: { generatedAllowed: true },
};

const mockCompletion: CompletionResult = {
  sessionId: "s1",
  attemptId: "a1",
  outcome: "clean",
  modelOutcome: "clean",
  finalOutcome: "clean",
  appliedOverrides: [],
  evaluation: {
    outcome: "clean",
    diagnosis: "Good work",
    severity: "none",
    approach_correct: true,
    per_step_quality: {},
    mistakes: [],
    strengths: ["Clear explanation"],
    coaching_summary: "Well done!",
    evaluation_source: "llm",
    retry_recovered: false,
  },
  primarySkill: {
    skillId: "sk1",
    score: 7,
    trend: "up",
    nextDueDate: "2026-04-15T00:00:00Z",
  },
};

describe("AC-4 api helpers return typed responses", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("postOnboarding calls POST /api/onboarding and returns typed response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOnboarding,
    });

    const result = await postOnboarding();

    expect(fetchSpy).toHaveBeenCalledWith("/api/onboarding", { method: "POST" });
    expect(result.userId).toBe("u1");
    expect(result.learnspaceId).toBe("ls1");
  });

  test("getProgress calls GET /api/progress and returns typed response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProgress,
    });

    const result = await getProgress();

    expect(fetchSpy).toHaveBeenCalledWith("/api/progress");
    expect(result.learnspace.name).toBe("Coding Interview Patterns");
    expect(result.learnspace.dueTodayCount).toBe(3);
  });

  test("postQueueNext calls POST /api/queue/next and returns typed response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueueNext,
    });

    const result = await postQueueNext();

    expect(fetchSpy).toHaveBeenCalledWith("/api/queue/next", { method: "POST" });
    expect(result.session.sessionId).toBe("s1");
    expect(result.selection.item.title).toBe("Two Sum");
  });

  test("getSession calls GET /api/sessions/:id and returns typed response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSession,
    });

    const result = await getSession("s1");

    expect(fetchSpy).toHaveBeenCalledWith("/api/sessions/s1");
    expect(result.sessionId).toBe("s1");
    expect(result.status).toBe("created");
  });

  test("getLearnspace calls GET /api/learnspaces/:id and returns typed response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLearnspace,
    });

    const result = await getLearnspace("ls1");

    expect(fetchSpy).toHaveBeenCalledWith("/api/learnspaces/ls1");
    expect(result.name).toBe("Coding Interview Patterns");
    expect(result.familyId).toBe("dsa");
    expect(result.family.label).toBe("DSA");
    expect(result.config.protocol_steps).toHaveLength(1);
  });

  test("patchSessionStep calls PATCH with correct body", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSession,
    });

    await patchSessionStep("s1", "step1", "my answer");

    expect(fetchSpy).toHaveBeenCalledWith("/api/sessions/s1/step", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId: "step1", content: "my answer" }),
    });
  });

  test("postSessionComplete calls POST /api/sessions/:id/complete", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompletion,
    });

    const result = await postSessionComplete("s1");

    expect(fetchSpy).toHaveBeenCalledWith("/api/sessions/s1/complete", {
      method: "POST",
    });
    expect(result.outcome).toBe("clean");
    expect(result.evaluation.coaching_summary).toBe("Well done!");
  });

  test("postOnboarding throws on non-200 response", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(postOnboarding()).rejects.toThrow("Onboarding failed: 500");
  });

  test("getProgress throws on non-200 response", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(getProgress()).rejects.toThrow("Failed to load progress");
  });
  test("AC-5 postSessionExecute calls POST with code body", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passed: 3, failed: 0, errors: [] }),
    });

    const result = await postSessionExecute("s1", "def solve(): pass");

    expect(fetchSpy).toHaveBeenCalledWith("/api/sessions/s1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "def solve(): pass" }),
    });
    expect(result.passed).toBe(3);
  });

  test("getSkillDrilldown calls GET /api/skills/:skillId/drilldown", async () => {
    const mockDrilldown: SkillDrilldown = {
      skillId: "sk1",
      name: "Hash Map",
      score: 8.2,
      totalAttempts: 5,
      cleanSolves: 3,
      assistedSolves: 1,
      failedAttempts: 1,
      trend: "up",
      dueDate: "2026-04-21",
      itemsPracticed: [
        { itemId: "i1", title: "Two Sum", source: "seed", solveCount: 3, lastOutcome: "clean" },
      ],
      commonMistakes: [
        { type: "off-by-one", count: 2, severity: "minor" },
      ],
      coachingInsights: ["Your invariant precision improved."],
      helpDependence: { avgHelpLevel: 0.2, fullSolutionRate: 0, stuckRate: 0.1, label: "independent" },
      behaviorSummary: "Trending upward. solving mostly independently.",
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDrilldown,
    });

    const result = await getSkillDrilldown("sk1");

    expect(fetchSpy).toHaveBeenCalledWith("/api/skills/sk1/drilldown");
    expect(result.skillId).toBe("sk1");
    expect(result.itemsPracticed).toHaveLength(1);
    expect(result.commonMistakes).toHaveLength(1);
    expect(result.coachingInsights).toHaveLength(1);
  });

  test("AC-2 postQueueNext serializes trackId in the request body", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueueNext,
    });

    const result = await postQueueNext("track-ls1-weakest_pattern");

    expect(fetchSpy).toHaveBeenCalledWith("/api/queue/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: "track-ls1-weakest_pattern" }),
    });
    expect(result.session.sessionId).toBe("s1");
  });

  test("M2 AC-1 activateTrack calls POST /api/tracks/:id/activate and returns typed response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockActivateTrack,
    });

    const result = await activateTrack("track-ls1-weakest_pattern");

    expect(fetchSpy).toHaveBeenCalledWith("/api/tracks/track-ls1-weakest_pattern/activate", {
      method: "POST",
    });
    expect(result.activeTrack.slug).toBe("weakest_pattern");
  });

  test("createTrack posts a policy payload and returns the created track", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreateTrack,
    });

    const result = await createTrack({
      goal: "Rebuild graph traversal confidence.",
      name: "Graph Rehab",
      policy: samplePolicy,
      policyOutcome: "compiled",
      compilerVersion: "1.0.0",
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: "Rebuild graph traversal confidence.",
        name: "Graph Rehab",
        policy: samplePolicy,
        policyOutcome: "compiled",
        compilerVersion: "1.0.0",
      }),
    });
    expect(result.track.source).toBe("llm_drafted");
    expect(result.activeTrackId).toBe("track-ls1-custom-1");
  });

  test("updateTrack patches with a re-interpreted policy", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ track: mockCreateTrack.track, tracks: [mockCreateTrack.track] }),
    });

    await updateTrack("track-ls1-custom-1", {
      goal: "Updated graph goal.",
      name: "Graph Rehab Updated",
      policy: samplePolicy,
      policyOutcome: "repaired",
      policyExplanation: { repairs: [{ field: "scope", change: "added graphs", reason: "was empty" }] },
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/tracks/track-ls1-custom-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: "Updated graph goal.",
        name: "Graph Rehab Updated",
        policy: samplePolicy,
        policyOutcome: "repaired",
        policyExplanation: { repairs: [{ field: "scope", change: "added graphs", reason: "was empty" }] },
      }),
    });
  });

  test("createTrack preserves server error detail and unsupported fields", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: "Policy uses unsupported fields: progression.mode=spiral.",
        unsupportedFields: ["progression.mode=spiral"],
      }),
    });

    await expect(createTrack({
      goal: "Spiral me through graphs.",
      policy: samplePolicy,
      policyOutcome: "compiled",
    })).rejects.toMatchObject({
      message: "Policy uses unsupported fields: progression.mode=spiral.",
      unsupportedFields: ["progression.mode=spiral"],
    });
  });

  test("updateTrack preserves server error detail", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: "System tracks cannot be edited",
      }),
    });

    await expect(updateTrack("track-ls1-recommended", {
      goal: "Updated goal.",
      policy: samplePolicy,
      policyOutcome: "compiled",
    })).rejects.toMatchObject({
      message: "System tracks cannot be edited",
    });
  });

  test("archiveTrack calls the archive endpoint", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        track: { ...mockCreateTrack.track, status: "archived" },
        activeTrackId: "track-ls1-recommended",
        tracks: [],
      }),
    });

    const result = await archiveTrack("track-ls1-custom-1");

    expect(fetchSpy).toHaveBeenCalledWith("/api/tracks/track-ls1-custom-1/archive", {
      method: "POST",
    });
    expect(result.track.status).toBe("archived");
  });

  test("M2 AC-2 postQueueNext serializes explicit trackId alongside selection start requests", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueueNext,
    });

    await postQueueNext("track-ls1-recommended");

    expect(fetchSpy).toHaveBeenCalledWith("/api/queue/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: "track-ls1-recommended" }),
    });
  });

  test("M4 AC-3 postQueueNext serializes explicit generated-practice requests", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueueNext,
    });

    await postQueueNext("track-ls1-weakest_pattern", "hash_map", undefined, true);

    expect(fetchSpy).toHaveBeenCalledWith("/api/queue/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: "track-ls1-weakest_pattern",
        targetSkillId: "hash_map",
        forceGenerated: true,
      }),
    });
  });

  test("AC-5 postSessionSkip calls POST and returns next session", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueueNext,
    });

    const result = await postSessionSkip("s1");

    expect(fetchSpy).toHaveBeenCalledWith("/api/sessions/s1/skip", {
      method: "POST",
    });
    expect(result.session.sessionId).toBe("s1");
  });

  test("M2 regression postSessionSkip serializes explicit trackId", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueueNext,
    });

    await postSessionSkip("s1", "track-ls1-explore");

    expect(fetchSpy).toHaveBeenCalledWith("/api/sessions/s1/skip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: "track-ls1-explore" }),
    });
  });
});
