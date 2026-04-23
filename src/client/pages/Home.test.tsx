// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, vi } from "vitest";
import { Home } from "./Home";

function track(id: string, slug: "recommended" | "explore" | "weakest_pattern" | "foundations", name: string) {
  return {
    id,
    learnspaceId: "ls1",
    slug,
    name,
    goal: `${name} goal`,
    isSystem: true,
  };
}

const recommended = track("track-ls1-recommended", "recommended", "Recommended");

const progress = {
  learnspace: {
    id: "ls1",
    name: "Coding Interview Patterns",
    activeTag: null,
    activeTrackId: recommended.id,
    activeTrack: recommended,
    interviewDate: null,
    dueTodayCount: 1,
    overdueCount: 0,
  },
  tracks: [recommended],
  trackAnalytics: [{ trackId: recommended.id, trackName: "Recommended", completedAttempts: 2, generatedAttempts: 1, lastAttemptAt: null }],
  skills: [],
  queueItems: [
    {
      itemId: "item1",
      itemTitle: "Two Sum",
      skillId: "sk1",
      skillName: "Hash Map",
      difficulty: "easy",
      source: "seed",
      dueDate: null,
      lastOutcome: null,
      round: 0,
    },
  ],
  recentAttempts: [],
  estimatedMinutes: null,
  insightsSummary: { strongestSkillId: null, weakestSkillId: null, mostGuidanceNeededSkillId: null, improvingSkillCount: 0, decliningSkillCount: 0 },
};

const learnspace = {
  id: "ls1",
  name: "Coding Interview Patterns",
  activeTag: null,
  activeTrackId: recommended.id,
  activeTrack: recommended,
  tracks: [recommended],
  interviewDate: null,
  familyId: "dsa",
  schedulerId: "sm5",
  family: {
    id: "dsa",
    label: "DSA",
    description: "",
  },
  config: {
    protocol_steps: [],
    executor: null,
    confidence_gated_protocol_threshold: 7,
    preSession: { showTimer: true, timerOptions: [5, 10, 15, -1], showDifficulty: true, showSkillName: true },
    labels: { itemSingular: "Problem", itemPlural: "Problems", skillSingular: "Pattern", skillPlural: "Patterns", masterySingular: "Mastery" },
  },
};

const queueNext = {
  session: {
    sessionId: "s1",
    attemptId: "a1",
    learnspaceId: "ls1",
    itemId: "item1",
    item: null,
    status: "created",
    currentStep: null,
    stepDrafts: {},
    startedAt: "2026-04-08T00:00:00Z",
    completedAt: null,
  },
  selection: {
    queueId: "q1",
    skillId: "sk1",
    skillName: "Hash Map",
    tier: "new",
    dueDate: null,
    confidenceScore: 0,
    trackId: recommended.id,
    item: { id: "item1", title: "Two Sum", difficulty: "easy", skillIds: ["sk1"], tags: [], source: "seed", status: "active", content: {} },
    selectionReason: {
      schedulerIds: ["sm5"],
      candidateTier: "new",
      trackId: recommended.id,
      trackSnapshot: recommended,
      rerankedByLLM: false,
      generated: false,
      generationAllowed: true,
      selectionSource: "skill_queue",
      reasons: ["New item selected."],
    },
  },
};

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/learnspaces") return { ok: true, json: async () => ({ activeId: "ls1", learnspaces: [learnspace] }) };
    if (url === "/api/onboarding") return { ok: true, json: async () => ({ userId: "u1", learnspaceId: "ls1", activeTag: null, llmConfigured: false }) };
    if (url === "/api/progress") return { ok: true, json: async () => progress };
    if (url === "/api/learnspaces/ls1") return { ok: true, json: async () => learnspace };
    if (url === "/api/queue/next") return { ok: true, json: async () => queueNext };
    return { ok: false, status: 404, json: async () => ({}) };
  });
  globalThis.fetch = fetchSpy;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Home", () => {
  test("renders cockpit and resolves next selection without targetItemId", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/practice/:sessionId" element={<div>Practice</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Two Sum" })).toBeTruthy();
    });
    expect(screen.getByText("Recommended goal")).toBeTruthy();
    expect(screen.getByText("UP NEXT")).toBeTruthy();
    expect(screen.getByText(/why this problem now/i)).toBeTruthy();
    expect(screen.getByText("New item selected.")).toBeTruthy();

    const queueCalls = fetchSpy.mock.calls.filter((call) => call[0] === "/api/queue/next");
    expect(queueCalls.length).toBe(1);
    const body = (queueCalls[0][1] as RequestInit | undefined)?.body;
    expect(typeof body).toBe("string");
    expect(body).toContain("trackId");
    expect(body).not.toContain("targetItemId");
  });

  test("new track card routes to library tracks creation flow", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<div>Library Screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Two Sum" })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: /\+ New Track/i }));
    await waitFor(() => {
      expect(screen.getByText("Library Screen")).toBeTruthy();
    });
  });
});
