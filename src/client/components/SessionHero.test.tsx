// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { SessionHero } from "./SessionHero";
import type { LearnspaceResponse, QueueSelection } from "../lib/api";

const learnspace = {
  id: "ls1",
  name: "Custom",
  activeTag: null,
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
    preSession: {
      showTimer: true,
      timerOptions: [5, -1],
      showDifficulty: true,
      showSkillName: true,
    },
    labels: {
      itemSingular: "Challenge",
      itemPlural: "Challenges",
      skillSingular: "Topic",
      skillPlural: "Topics",
      masterySingular: "Understanding",
    },
  },
} satisfies LearnspaceResponse;

const selection = {
  queueId: "q1",
  skillId: "sk1",
  skillName: "Hash Map",
  tier: "due_today",
  dueDate: null,
  confidenceScore: 4,
  item: {
    id: "item1",
    title: "Two Sum",
    difficulty: "easy",
    skillIds: ["sk1"],
    tags: [],
    source: "seed",
    status: "active",
    content: {},
  },
  selectionReason: {
    schedulerIds: ["sm5"],
    candidateTier: "due_today",
    trackId: "track1",
    trackSnapshot: null,
    rerankedByLLM: false,
    generated: false,
    generationAllowed: true,
    selectionSource: "skill_queue",
    reasons: ["Ready for review."],
  },
} satisfies QueueSelection;

describe("SessionHero", () => {
  test("renders skill chip, title, and start action", () => {
    render(
      <SessionHero
        learnspace={learnspace}
        selection={selection}
        onStart={vi.fn()}
        onSkip={vi.fn()}
        onExplore={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Hash Map").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Two Sum" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /start session/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /skip item/i })).toBeTruthy();
    expect(screen.getByText(/why this problem now/i)).toBeTruthy();
    expect(screen.getByText("Ready for review.")).toBeTruthy();
  });
});
