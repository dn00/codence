// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, beforeEach, afterEach } from "vitest";
import { Practice } from "./Practice";
import type { SessionDetail, QueueSelection, LearnspaceResponse, CompletionResult } from "../lib/api";

// Mock Monaco editor
vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange, language }: {
    value?: string;
    onChange?: (value: string | undefined) => void;
    language?: string;
  }) => (
    <textarea
      data-testid="monaco-editor-mock"
      data-language={language}
      value={value ?? ""}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value)}
    />
  ),
}));

const mockSession: SessionDetail = {
  sessionId: "s1",
  attemptId: "a1",
  learnspaceId: "ls1",
  itemId: "item1",
  item: { id: "item1", title: "Two Sum", difficulty: "easy", skillIds: ["sk1"], content: { prompt: "Given an array of integers nums and a target..." } },
  status: "created",
  currentStep: null,
  stepDrafts: {},
  startedAt: "2026-04-08T00:00:00Z",
  completedAt: null,
};

const mockSelection: QueueSelection = {
  queueId: "q1",
  skillId: "sk1",
  skillName: "Two Pointers",
  tier: "due_today",
  dueDate: "2026-04-08",
  confidenceScore: 5,
  selectionReason: {
    schedulerIds: ["sm5"],
    candidateTier: "due_today",
    trackId: "track1",
    trackSnapshot: {
      id: "track1",
      learnspaceId: "ls1",
      slug: "recommended",
      name: "Recommended",
      goal: "Stay in the main review loop",
      isSystem: true,
    },
    rerankedByLLM: false,
    generated: false,
    generationAllowed: true,
    selectionSource: "skill_queue",
    reasons: ["Due for review on the active track."],
  },
  item: {
    id: "item1",
    title: "Two Sum",
    difficulty: "easy",
    skillIds: ["sk1"],
    tags: ["arrays"],
    content: { prompt: "Given an array of integers nums and a target..." },
  },
};

const mockLearnspace: LearnspaceResponse = {
  id: "ls1",
  name: "Coding Interview Patterns",
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
    protocol_steps: [
      { id: "understanding", label: "Understanding", instruction: "Explain the problem", agent_prompt: "", editor: "text", layout: "inline" },
      { id: "approach", label: "Approach", instruction: "Describe your approach", agent_prompt: "", editor: "text", layout: "inline" },
      { id: "code", label: "Code", instruction: "Write the solution", agent_prompt: "", editor: "code", layout: "inline" },
      { id: "reflect", label: "Reflect", instruction: "Reflect on your solution", agent_prompt: "", editor: "text", layout: "inline" },
    ],
    executor: { type: "python-subprocess", timeout_ms: 5000, memory_mb: 256 },
    confidence_gated_protocol_threshold: 7.0,
  },
};

let fetchSpy: ReturnType<typeof vi.fn>;

function renderPractice(state?: { session: SessionDetail; selection: QueueSelection }) {
  return render(
    <MemoryRouter
      initialEntries={[{
        pathname: "/practice/s1",
        state: state ?? { session: mockSession, selection: mockSelection },
      }]}
    >
      <Routes>
        <Route path="/practice/:sessionId" element={<Practice />} />
        <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fetchSpy = vi.fn();
  globalThis.fetch = fetchSpy;

  fetchSpy.mockImplementation(async (url: string) => {
    if (url === "/api/learnspaces/ls1") {
      return { ok: true, json: async () => mockLearnspace };
    }
    if (typeof url === "string" && url.includes("/step")) {
      return { ok: true, json: async () => mockSession };
    }
    if (typeof url === "string" && url.includes("/api/sessions/")) {
      return { ok: true, json: async () => mockSession };
    }
    return { ok: false, status: 404 };
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Practice page", () => {
  test("AC-2 renders protocol steps with correct editor types", async () => {
    renderPractice();

    await waitFor(() => {
      expect(screen.getByText("Understanding")).toBeTruthy();
    });

    expect(screen.getByText("Approach")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Code\b/ })).toBeTruthy();
    expect(screen.getByText("Reflect")).toBeTruthy();
    // 3 text textareas + 1 Monaco mock textarea = 4 textboxes total
    // But the Monaco mock also renders as textarea with data-testid
    const monacoMock = screen.getByTestId("monaco-editor-mock");
    expect(monacoMock).toBeTruthy();
  });

  test("AC-7 item problem statement renders above steps", async () => {
    renderPractice();

    await waitFor(() => {
      expect(screen.getAllByText("Two Sum").length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Given an array of integers/)).toBeTruthy();
  });

  test("renders executor metadata in the workspace", async () => {
    renderPractice();

    await waitFor(() => {
      expect(screen.getAllByText(/python/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/python engine/i)).toBeTruthy();
  });

  test("AC-6 rehydrates session from URL when router state is missing", async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/practice/s1" }]}>
        <Routes>
          <Route path="/practice/:sessionId" element={<Practice />} />
          <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Should fetch the session from API
    await waitFor(() => {
      const sessionCalls = fetchSpy.mock.calls.filter(
        (call: unknown[]) => call[0] === "/api/sessions/s1",
      );
      expect(sessionCalls.length).toBe(1);
    });

    // Should render the workspace after rehydration
    await waitFor(() => {
      expect(screen.getByText("Understanding")).toBeTruthy();
    });

    // Item title from rehydrated session
    expect(screen.getAllByText("Two Sum").length).toBeGreaterThan(0);
  });

  test("EC-3 completed session redirects to dashboard", async () => {
    const completedSession: SessionDetail = {
      ...mockSession,
      status: "completed",
      completedAt: "2026-04-08T01:00:00Z",
    };

    fetchSpy.mockImplementation(async (url: string) => {
      if (url === "/api/sessions/s1") {
        return { ok: true, json: async () => completedSession };
      }
      return { ok: false, status: 404 };
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/practice/s1" }]}>
        <Routes>
          <Route path="/practice/:sessionId" element={<Practice />} />
          <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeTruthy();
    });
  });

  test("AC-4 debounced autosave calls PATCH", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPractice();

    await waitFor(() => {
      expect(screen.getByText("Understanding")).toBeTruthy();
    });

    const textareas = screen.getAllByRole("textbox");
    // Type in the first textarea (Understanding - text type)
    const understandingTextarea = textareas.find(
      (el) => !el.hasAttribute("data-testid") || el.getAttribute("data-testid") !== "monaco-editor-mock",
    );
    if (understandingTextarea) {
      await user.type(understandingTextarea, "my answer");
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        const patchCalls = fetchSpy.mock.calls.filter(
          (call: unknown[]) => typeof call[1] === "object" && (call[1] as { method?: string }).method === "PATCH",
        );
        expect(patchCalls.length).toBeGreaterThan(0);
      });
    }
  });

  test("inline steps grouped in scrollable container", async () => {
    renderPractice();

    await waitFor(() => {
      expect(screen.getByText("Understanding")).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: /Understanding/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Approach/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Reflect/ })).toBeTruthy();
  });
});

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
    coaching_summary: "Well done! Your approach was efficient and correct.",
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

describe("Practice completion flow", () => {
  test("Complete button calls complete API and shows transition", async () => {
    fetchSpy.mockImplementation(async (url: string, opts?: { method?: string }) => {
      if (url === "/api/learnspaces/ls1") {
        return { ok: true, json: async () => mockLearnspace };
      }
      if (typeof url === "string" && url.includes("/complete") && opts?.method === "POST") {
        return { ok: true, json: async () => mockCompletion };
      }
      if (typeof url === "string" && url.includes("/step")) {
        return { ok: true, json: async () => mockSession };
      }
      return { ok: false, status: 404 };
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPractice();

    await waitFor(() => {
      expect(screen.getByText("Understanding")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: /submit/i }));
    await user.click(screen.getByRole("button", { name: /confirm submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/session complete/i)).toBeTruthy();
    });

    // Step editors should be gone
    expect(screen.queryByText("Understanding")).toBeNull();
  });
  test("AC-1 run action visible in code step when executor configured", async () => {
    renderPractice();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Code\b/ })).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: /run/i })).toBeTruthy();
  });
  test("EC-1 no run action without executor", async () => {
    const noExecutorLearnspace: LearnspaceResponse = {
      ...mockLearnspace,
      config: { ...mockLearnspace.config, executor: null },
    };

    fetchSpy.mockImplementation(async (url: string) => {
      if (url === "/api/learnspaces/ls1") {
        return { ok: true, json: async () => noExecutorLearnspace };
      }
      if (typeof url === "string" && url.includes("/step")) {
        return { ok: true, json: async () => mockSession };
      }
      return { ok: false, status: 404 };
    });

    renderPractice();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Code\b/ })).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: /run/i })).toBeNull();
  });
  test("AC-2 run sends code to execute endpoint and shows results", async () => {
    fetchSpy.mockImplementation(async (url: string, opts?: { method?: string }) => {
      if (url === "/api/learnspaces/ls1") {
        return { ok: true, json: async () => mockLearnspace };
      }
      if (typeof url === "string" && url.includes("/execute") && opts?.method === "POST") {
        return { ok: true, json: async () => ({ passed: 3, failed: 1, errors: ["TypeError: ..."] }) };
      }
      if (typeof url === "string" && url.includes("/step")) {
        return { ok: true, json: async () => mockSession };
      }
      return { ok: false, status: 404 };
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPractice();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Code\b/ })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: /run/i }));

    await waitFor(() => {
      expect(screen.getByText(/3 passed/)).toBeTruthy();
      expect(screen.getByText(/1 failed/)).toBeTruthy();
    });
  });
  test("AC-3 low confidence keeps the early text step expanded", async () => {
    renderPractice();

    await waitFor(() => {
      expect(screen.getByText("Understanding")).toBeTruthy();
    });

    // Low confidence keeps the first non-code step open by default.
    expect(screen.getByText("Explain the problem")).toBeTruthy();
    expect(screen.getByText("Approach")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Code\b/ })).toBeTruthy();
    expect(screen.getByText("Reflect")).toBeTruthy();
  });
  test("AC-1 early steps collapsed at high confidence", async () => {
    const highConfidenceSelection: QueueSelection = {
      ...mockSelection,
      confidenceScore: 8.5,
    };

    renderPractice({ session: mockSession, selection: highConfidenceSelection });

    await waitFor(() => {
      // Code step should be visible (it's the focus step)
      expect(screen.getByRole("button", { name: /^Code\b/ })).toBeTruthy();
    });

    // Earlier text steps stay collapsed until the user expands one.
    expect(screen.queryByText("Explain the problem")).toBeNull();
  });
  test("AC-2 collapsed step expands on click", async () => {
    const highConfidenceSelection: QueueSelection = {
      ...mockSelection,
      confidenceScore: 8.5,
    };

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPractice({ session: mockSession, selection: highConfidenceSelection });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Code\b/ })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: /Understanding/ }));

    // After clicking, the step should expand and show its editor
    await waitFor(() => {
      expect(screen.getByText("Explain the problem")).toBeTruthy();
    });
  });
  test("ERR-1 missing confidence falls back to the default first-step expansion", async () => {
    // Navigate without selection (no confidence score)
    render(
      <MemoryRouter initialEntries={[{ pathname: "/practice/s1" }]}>
        <Routes>
          <Route path="/practice/:sessionId" element={<Practice />} />
          <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Understanding")).toBeTruthy();
    });

    // No confidence falls back to the default first expanded text step.
    expect(screen.getByText("Explain the problem")).toBeTruthy();
    expect(screen.getByText("Approach")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Code\b/ })).toBeTruthy();
  });

  test("complete failure shows error message", async () => {
    fetchSpy.mockImplementation(async (url: string, opts?: { method?: string }) => {
      if (url === "/api/learnspaces/ls1") {
        return { ok: true, json: async () => mockLearnspace };
      }
      if (typeof url === "string" && url.includes("/complete") && opts?.method === "POST") {
        return { ok: false, status: 500 };
      }
      if (typeof url === "string" && url.includes("/step")) {
        return { ok: true, json: async () => mockSession };
      }
      return { ok: false, status: 404 };
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPractice();

    await waitFor(() => {
      expect(screen.getByText("Understanding")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: /submit/i }));
    await user.click(screen.getByRole("button", { name: /confirm submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to complete session: 500/i)).toBeTruthy();
    });
  });
});
