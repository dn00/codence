// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi, beforeEach } from "vitest";
import { CoachPanel } from "./CoachPanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPanel(overrides: Partial<Parameters<typeof CoachPanel>[0]> = {}) {
  const defaults = {
    open: true,
    onToggle: vi.fn(),
    sessionId: "s1",
    currentStepId: "code",
    onSendMessage: vi.fn().mockResolvedValue(undefined),
    messages: [] as Array<{ role: "user" | "assistant"; content: string }>,
    streaming: false,
    streamingText: "",
    ...overrides,
  };
  return { ...render(<CoachPanel {...defaults} />), props: defaults };
}

describe("CoachPanel", () => {
  test("AC-1 panel is visible when open=true", () => {
    renderPanel({ open: true });
    expect(screen.getByTestId("coach-panel")).toBeTruthy();
  });

  test("AC-1 panel is hidden when open=false", () => {
    renderPanel({ open: false });
    expect(screen.queryByTestId("coach-panel")).toBeNull();
  });
  test("AC-2 sends message via onSendMessage callback", async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    renderPanel({ onSendMessage });

    const input = screen.getByPlaceholderText(/ask/i);
    await user.type(input, "How do I solve this?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSendMessage).toHaveBeenCalledWith("How do I solve this?");
  });

  test("AC-2 renders assistant response from messages", () => {
    renderPanel({
      messages: [
        { role: "user", content: "How do I solve this?" },
        { role: "assistant", content: "Try using a hash map approach." },
      ],
    });

    expect(screen.getByText("How do I solve this?")).toBeTruthy();
    expect(screen.getByText("Try using a hash map approach.")).toBeTruthy();
  });
  test("AC-3 displays multiple messages in order", () => {
    renderPanel({
      messages: [
        { role: "user", content: "First question" },
        { role: "assistant", content: "First answer" },
        { role: "user", content: "Second question" },
        { role: "assistant", content: "Second answer" },
      ],
    });

    const texts = screen.getAllByTestId("chat-message").map((el) => el.textContent);
    expect(texts).toEqual([
      "First question",
      "First answer",
      "Second question",
      "Second answer",
    ]);
  });
  test("AC-2 shows streaming text during loading", () => {
    renderPanel({
      streaming: true,
      streamingText: "Thinking about your approach...",
      messages: [{ role: "user", content: "Help me" }],
    });

    expect(screen.getByText("Thinking about your approach...")).toBeTruthy();
  });
  test("EC-1 send button disabled with empty input", () => {
    renderPanel();

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect((sendButton as HTMLButtonElement).disabled).toBe(true);
  });
  test("EC-2 input and send disabled during streaming", () => {
    renderPanel({ streaming: true });

    const input = screen.getByPlaceholderText(/ask/i) as HTMLInputElement;
    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(input.disabled).toBe(true);
    expect((sendButton as HTMLButtonElement).disabled).toBe(true);
  });

  test("disables sending when coach backend is unavailable", async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    renderPanel({
      onSendMessage,
      unavailableReason: "No coach backend is configured.",
    });

    expect(screen.getByText("Coach unavailable")).toBeTruthy();
    expect(screen.getByText("No coach backend is configured.")).toBeTruthy();
    const input = screen.getByPlaceholderText(/not configured/i) as HTMLInputElement;
    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(input.disabled).toBe(true);
    expect((sendButton as HTMLButtonElement).disabled).toBe(true);

    await user.click(sendButton);
    expect(onSendMessage).not.toHaveBeenCalled();
  });
  test("ERR-1 displays error message in chat", () => {
    renderPanel({
      messages: [
        { role: "user", content: "Help" },
        { role: "assistant", content: "Error: Coach unavailable" },
      ],
    });

    expect(screen.getByText(/Coach unavailable/)).toBeTruthy();
  });
});
