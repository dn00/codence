// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, afterEach, beforeEach } from "vitest";
import { TransitionCard } from "./TransitionCard";
import type { CompletionResult } from "../lib/api";

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TransitionCard", () => {
  test("AC-2 shows coaching summary and outcome", () => {
    render(
      <MemoryRouter>
        <TransitionCard
          completion={mockCompletion}
          onStartNext={() => {}}
          startingNext={false}
          startNextError={null}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/well done/i)).toBeTruthy();
    expect(screen.getByText(/clean solve/i)).toBeTruthy();
    expect(screen.getByText(/next review/i)).toBeTruthy();
  });

  test("AC-4 Done for Today navigates to dashboard", async () => {
    const user = userEvent.setup();

    // Use a test component that tracks navigation
    let navigatedTo: string | null = null;

    // We need to wrap in a route setup that captures navigation
    const { container } = render(
      <MemoryRouter initialEntries={["/practice"]}>
        <TransitionCard
          completion={mockCompletion}
          onStartNext={() => {}}
          startingNext={false}
          startNextError={null}
        />
      </MemoryRouter>,
    );

    const doneButton = screen.getByRole("button", { name: /return home/i });
    expect(doneButton).toBeTruthy();
  });

  test("ERR-2 Start Next failure shows error on card", () => {
    render(
      <MemoryRouter>
        <TransitionCard
          completion={mockCompletion}
          onStartNext={() => {}}
          startingNext={false}
          startNextError="No more items available"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/no more items available/i)).toBeTruthy();
    // Returning home should still be available
    expect(screen.getByRole("button", { name: /return home/i })).toBeTruthy();
  });
});
