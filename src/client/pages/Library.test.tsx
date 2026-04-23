// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Library } from "./Library";
import type { LearnspaceResponse } from "../lib/api";

function buildLearnspace(
  overrides: Partial<LearnspaceResponse> = {},
): LearnspaceResponse {
  return {
    id: "coding-interview-patterns",
    name: "Coding Interview Patterns",
    activeTag: null,
    activeTrackId: "track-coding-interview-patterns-recommended",
    activeTrack: {
      id: "track-coding-interview-patterns-recommended",
      learnspaceId: "coding-interview-patterns",
      slug: "recommended",
      name: "Recommended",
      goal: "Stay in the main review loop",
      isSystem: true,
    },
    tracks: [
      {
        id: "track-coding-interview-patterns-recommended",
        learnspaceId: "coding-interview-patterns",
        slug: "recommended",
        name: "Recommended",
        goal: "Stay in the main review loop",
        isSystem: true,
      },
      {
        id: "track-coding-interview-patterns-custom-1",
        learnspaceId: "coding-interview-patterns",
        slug: "custom-1",
        name: "Graph Rehab",
        goal: "Rebuild graph traversal confidence.",
        isSystem: false,
        status: "active",
      },
    ],
    interviewDate: null,
    familyId: "dsa",
    schedulerId: "sm5",
    policyTracks: {
      supported: true,
      domainId: "coding-interview-patterns",
    },
    family: {
      id: "dsa",
      label: "DSA",
      description: "",
    },
    config: {
      protocol_steps: [],
      executor: null,
      confidence_gated_protocol_threshold: 7,
      labels: {
        itemSingular: "Problem",
        itemPlural: "Problems",
        skillSingular: "Pattern",
        skillPlural: "Patterns",
        masterySingular: "Mastery",
      },
    },
    ...overrides,
  };
}

function buildProgress(learnspace: LearnspaceResponse) {
  return {
    learnspace: {
      id: learnspace.id,
      name: learnspace.name,
      activeTag: learnspace.activeTag,
      activeTrackId: learnspace.activeTrackId,
      activeTrack: learnspace.activeTrack,
      interviewDate: learnspace.interviewDate,
      dueTodayCount: 0,
      overdueCount: 0,
    },
    tracks: learnspace.tracks ?? [],
    trackAnalytics: [],
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
}

function mockFetch(
  learnspace: LearnspaceResponse,
  completionConfigured: boolean,
) {
  const fn = vi.fn(async (input: URL | RequestInfo) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "/api/progress") return { ok: true, json: async () => buildProgress(learnspace) };
    if (url === "/api/learnspaces") {
      return {
        ok: true,
        json: async () => ({
          activeId: learnspace.id,
          learnspaces: [{
            id: learnspace.id,
            name: learnspace.name,
            description: "",
            familyId: learnspace.familyId,
            schedulerId: learnspace.schedulerId,
            activeTrackId: learnspace.activeTrackId,
            activeTrack: learnspace.activeTrack,
            policyTracks: learnspace.policyTracks,
          }],
        }),
      };
    }
    if (url === `/api/learnspaces/${learnspace.id}`) return { ok: true, json: async () => learnspace };
    if (url === "/api/items") return { ok: true, json: async () => ({ items: [] }) };
    if (url === "/api/skills") return { ok: true, json: async () => ({ skills: [] }) };
    if (url === "/api/tracks") return { ok: true, json: async () => ({ tracks: learnspace.tracks ?? [] }) };
    if (url === "/api/health") {
      return {
        ok: true,
        json: async () => ({
          status: "ok",
          service: "codence",
          diagnostics: {
            coach: {
              configured: false,
              backend: null,
              activeSessions: 0,
              expiredSessionsCleared: 0,
              resumedTurns: 0,
            },
            completion: {
              configured: completionConfigured,
              backend: completionConfigured ? "stub" : null,
            },
          },
          providers: [],
        }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
  return fn as unknown as typeof globalThis.fetch;
}

describe("Library", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("disables policy track authoring when the active learnspace does not support it", async () => {
    const user = userEvent.setup();
    const learnspace = buildLearnspace({
      id: "beginner-patterns",
      name: "Beginner Patterns",
      activeTrackId: "track-beginner-patterns-recommended",
      activeTrack: {
        id: "track-beginner-patterns-recommended",
        learnspaceId: "beginner-patterns",
        slug: "recommended",
        name: "Recommended",
        goal: "Stay in the main review loop",
        isSystem: true,
      },
      tracks: [
        {
          id: "track-beginner-patterns-recommended",
          learnspaceId: "beginner-patterns",
          slug: "recommended",
          name: "Recommended",
          goal: "Stay in the main review loop",
          isSystem: true,
        },
        {
          id: "track-beginner-patterns-custom-1",
          learnspaceId: "beginner-patterns",
          slug: "custom-1",
          name: "Arrays Basics Focus",
          goal: "Stay on arrays basics",
          isSystem: false,
          status: "active",
        },
      ],
      policyTracks: {
        supported: false,
        reason: "Custom policy tracks are not available for learnspace \"beginner-patterns\" yet.",
      },
    });
    globalThis.fetch = mockFetch(learnspace, true);

    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Routes>
          <Route path="/library" element={<Library />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Library" })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Tracks" }));

    await waitFor(() => {
      expect(screen.getByText(/not available for learnspace "beginner-patterns" yet/i)).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: /\+ Create Track/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Edit" }).hasAttribute("disabled")).toBe(true);
  });

  test("disables policy track authoring when no completion backend is configured", async () => {
    const user = userEvent.setup();
    const learnspace = buildLearnspace();
    globalThis.fetch = mockFetch(learnspace, false);

    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Routes>
          <Route path="/library" element={<Library />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Library" })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Tracks" }));

    await waitFor(() => {
      expect(screen.getByText(/no completion backend is configured/i)).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: /\+ Create Track/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Edit" }).hasAttribute("disabled")).toBe(true);
  });
});
