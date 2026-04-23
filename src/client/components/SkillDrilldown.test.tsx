// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { SkillDrilldown } from "./SkillDrilldown";
import type { SkillDrilldown as SkillDrilldownData } from "../lib/api";

const mockDrilldown: SkillDrilldownData = {
  skillId: "sk1",
  name: "Sliding Window",
  score: 7.1,
  totalAttempts: 12,
  cleanSolves: 8,
  assistedSolves: 3,
  failedAttempts: 1,
  trend: "up",
  dueDate: "2026-04-14",
  items: [
    { itemId: "i1", title: "Longest Substring", difficulty: "medium", source: "seed", solveCount: 3, lastOutcome: "clean" },
    { itemId: "i2", title: "Minimum Window", difficulty: "hard", source: "seed", solveCount: 2, lastOutcome: "assisted" },
    { itemId: "i3", title: "Subarray Sum", difficulty: "easy", source: "seed", solveCount: 0, lastOutcome: null },
  ],
  itemsPracticed: [
    { itemId: "i1", title: "Longest Substring", source: "seed", solveCount: 3, lastOutcome: "clean" },
    { itemId: "i2", title: "Minimum Window", source: "seed", solveCount: 2, lastOutcome: "assisted" },
  ],
  commonMistakes: [
    { type: "Shrink condition off-by-one", count: 2, severity: "moderate" },
    { type: "Forgot to update best inside loop", count: 1, severity: "minor" },
  ],
  coachingInsights: [
    "Your invariant precision improved — you now state the window validity condition explicitly.",
    "The off-by-one in shrink likely comes from imprecise invariant articulation.",
  ],
  helpDependence: { avgHelpLevel: 0.35, fullSolutionRate: 0.05, stuckRate: 0.2, label: "guided" as const },
  behaviorSummary: "Trending upward. using moderate coach support. 2 recurring mistake patterns detected.",
};

describe("SkillDrilldown", () => {
  test("AC-2 drill-down shows items practiced", () => {
    render(<SkillDrilldown data={mockDrilldown} />);

    expect(screen.getByText("Longest Substring")).toBeTruthy();
    expect(screen.getByText("Minimum Window")).toBeTruthy();
    // Solve counts displayed
    expect(screen.getByText(/3x/)).toBeTruthy();
    expect(screen.getAllByText(/2x/).length).toBeGreaterThan(0);
  });

  test("AC-3 drill-down shows common mistakes", () => {
    render(<SkillDrilldown data={mockDrilldown} />);

    expect(screen.getByText(/Shrink condition off-by-one/)).toBeTruthy();
    expect(screen.getAllByText(/2x/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Forgot to update best inside loop/)).toBeTruthy();
    expect(screen.getByText(/1x/)).toBeTruthy();
  });

  test("AC-4 drill-down shows coaching insights", () => {
    render(<SkillDrilldown data={mockDrilldown} />);

    expect(screen.getByText(/invariant precision improved/)).toBeTruthy();
    expect(screen.getByText(/off-by-one in shrink/)).toBeTruthy();
  });

  test("AC-1 drilldown renders help dependence in plain language", () => {
    render(<SkillDrilldown data={mockDrilldown} />);

    // Should show a readable label, not just raw numbers
    expect(screen.getAllByText(/guided|coach/i).length).toBeGreaterThan(0);
  });

  test("AC-2 drilldown clearly separates recurring weakpoints and coaching insights", () => {
    render(<SkillDrilldown data={mockDrilldown} />);

    // Both sections should have distinct headings
    expect(screen.getAllByText(/common mistakes|problems/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/coach notes|coaching insights/i)).toBeTruthy();
    // Behavior summary should be shown
    expect(screen.getByText(/Trending upward/)).toBeTruthy();
  });

  test("AC-3 drilldown preserves existing practiced-item and common-mistake sections", () => {
    render(<SkillDrilldown data={mockDrilldown} />);

    // Items practiced
    expect(screen.getByText("Longest Substring")).toBeTruthy();
    expect(screen.getByText("Minimum Window")).toBeTruthy();
    // Common mistakes
    expect(screen.getByText(/Shrink condition off-by-one/)).toBeTruthy();
    // Help dependence section (new)
    expect(screen.getAllByText(/guided|coach/i).length).toBeGreaterThan(0);
  });

  test("EC-1 drilldown uses neutral or positive copy when mistake signals are sparse", () => {
    const cleanData: SkillDrilldownData = {
      ...mockDrilldown,
      commonMistakes: [],
      coachingInsights: [],
      helpDependence: { avgHelpLevel: 0.1, fullSolutionRate: 0, stuckRate: 0, label: "independent" },
      behaviorSummary: "Trending upward. solving mostly independently.",
    };
    render(<SkillDrilldown data={cleanData} />);

    // Should not render empty mistake/insight sections
    expect(screen.queryByText(/common mistakes/i)).toBeNull();
    expect(screen.queryByText(/coach notes/i)).toBeNull();
    // Positive copy should still appear
    expect(screen.getAllByText(/independent/i).length).toBeGreaterThan(0);
  });

  test("ERR-1 drilldown renders safely with partial interpreted payloads", () => {
    const partialData: SkillDrilldownData = {
      ...mockDrilldown,
      helpDependence: { avgHelpLevel: 0, fullSolutionRate: 0, stuckRate: 0, label: "independent" },
      behaviorSummary: "",
      coachingInsights: [],
      commonMistakes: [],
    };
    const { container } = render(<SkillDrilldown data={partialData} />);

    // Should render without crashing
    expect(container.firstChild).toBeTruthy();
    // Stats should still render
    expect(screen.getByText(/last 12/i)).toBeTruthy();
  });
});
