// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, afterEach, beforeEach } from "vitest";
import { App } from "./App";
import { mountApp } from "./main";
import { act } from "react";

const mockOnboarding = {
  userId: "u1",
  learnspaceId: "ls1",
  activeTag: null,
  llmConfigured: false,
};

const mockProgress = {
  learnspace: {
    id: "ls1",
    name: "Coding Interview Patterns",
    activeTag: null,
    interviewDate: null,
    dueTodayCount: 3,
    overdueCount: 1,
  },
  skills: [],
  recentAttempts: [],
  insightsSummary: { strongestSkillId: null, weakestSkillId: null, mostGuidanceNeededSkillId: null, improvingSkillCount: 0, decliningSkillCount: 0 },
};

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  globalThis.fetch = fetchSpy;

  fetchSpy.mockImplementation(async (url: string) => {
    if (url === "/api/onboarding") {
      return { ok: true, json: async () => mockOnboarding };
    }
    if (url === "/api/progress") {
      return { ok: true, json: async () => mockProgress };
    }
    return { ok: false, status: 404 };
  });
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("App routing", () => {
  test("AC-1 renders dashboard at root route", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Coding Interview Patterns")).toBeTruthy();
    });
  });

  test("renders practice route without crashing", async () => {
    fetchSpy.mockImplementation(async (url: string) => {
      if (url === "/api/sessions/test-session") {
        return { ok: true, json: async () => ({
          sessionId: "test-session",
          attemptId: "a1",
          learnspaceId: "ls1",
          itemId: "item1",
          item: null,
          status: "created",
          currentStep: null,
          stepDrafts: {},
          startedAt: "2026-04-08T00:00:00Z",
          completedAt: null,
        })};
      }
      if (url === "/api/learnspaces/ls1") {
        return { ok: true, json: async () => ({
          id: "ls1",
          name: "Test",
          activeTag: null,
          interviewDate: null,
          familyId: "dsa",
          schedulerId: "sm5",
          family: {
            id: "dsa",
            label: "DSA",
            description: "Coding interview problem solving with an editor, tests, and structured solve protocol.",
          },
          config: {
            protocol_steps: [],
            executor: null,
            confidence_gated_protocol_threshold: 7,
          },
        })};
      }
      return { ok: false, status: 404 };
    });

    render(
      <MemoryRouter initialEntries={["/practice/test-session"]}>
        <App />
      </MemoryRouter>,
    );

    // Practice page should render (may show loading or workspace)
    await waitFor(() => {
      expect(screen.getByText(/loading|no active session/i)).toBeTruthy();
    });
  });

  test("mountApp mounts the root app into the browser container", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await act(async () => {
      mountApp(document);
    });

    await waitFor(() => {
      expect(screen.getByText("Coding Interview Patterns")).toBeTruthy();
    });
  });

  test("mountApp throws a clear error when the root mount element is missing", () => {
    document.body.innerHTML = "";

    expect(() => mountApp(document)).toThrow("Missing root mount element");
  });
});
