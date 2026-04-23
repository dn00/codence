// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { cleanup, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { StepEditor } from "./StepEditor";

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

afterEach(() => {
  cleanup();
});

const baseStep = {
  id: "understanding",
  label: "Understanding",
  instruction: "Explain the problem in your own words",
  agent_prompt: "",
  layout: "inline" as const,
};

describe("StepEditor", () => {
  test("AC-1 renders Monaco editor for code step type", () => {
    render(
      <StepEditor
        step={{ ...baseStep, id: "code", label: "Code", editor: "code" }}
        value="def solve(): pass"
        onChange={() => {}}
        onBlur={() => {}}
      />,
    );

    const monaco = screen.getByTestId("monaco-editor-mock") as HTMLTextAreaElement;
    expect(monaco).toBeTruthy();
    expect(monaco.dataset.language).toBe("python");
    expect(monaco.value).toBe("def solve(): pass");
  });
  test("AC-2 renders textarea for text step type", () => {
    render(
      <StepEditor
        step={{ ...baseStep, editor: "text" }}
        value=""
        onChange={() => {}}
        onBlur={() => {}}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Understanding" })).toBeTruthy();
    // Verify it's NOT the Monaco mock
    expect(screen.queryByTestId("monaco-editor-mock")).toBeNull();
  });
  test("AC-3 renders readonly step as non-editable display", () => {
    render(
      <StepEditor
        step={{ ...baseStep, editor: "readonly", instruction: "Read this carefully" }}
        value=""
        onChange={() => {}}
        onBlur={() => {}}
      />,
    );

    const readonlyEl = screen.getByTestId("readonly-step");
    expect(readonlyEl).toBeTruthy();
    expect(readonlyEl.textContent).toContain("Read this carefully");
    // No textbox or Monaco
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByTestId("monaco-editor-mock")).toBeNull();
  });
  test("AC-4 Monaco onChange fires callback with step id and value", () => {
    const onChange = vi.fn();
    render(
      <StepEditor
        step={{ ...baseStep, id: "code", label: "Code", editor: "code" }}
        value=""
        onChange={onChange}
        onBlur={() => {}}
      />,
    );

    const monaco = screen.getByTestId("monaco-editor-mock");
    fireEvent.change(monaco, { target: { value: "new code" } });
    expect(onChange).toHaveBeenCalledWith("code", "new code");
  });
  test("EC-1 Monaco handles empty initial value", () => {
    render(
      <StepEditor
        step={{ ...baseStep, id: "code", label: "Code", editor: "code" }}
        value=""
        onChange={() => {}}
        onBlur={() => {}}
      />,
    );

    const monaco = screen.getByTestId("monaco-editor-mock") as HTMLTextAreaElement;
    expect(monaco.value).toBe("");
  });
  test("EC-2 readonly step with empty instruction renders without crash", () => {
    render(
      <StepEditor
        step={{ ...baseStep, editor: "readonly", instruction: "" }}
        value=""
        onChange={() => {}}
        onBlur={() => {}}
      />,
    );

    const readonlyEl = screen.getByTestId("readonly-step");
    expect(readonlyEl).toBeTruthy();
    expect(readonlyEl.textContent).toBe("");
  });

  // Pre-fill draft (existing test, updated)
  test("pre-fills textarea from stepDrafts value", () => {
    render(
      <StepEditor
        step={{ ...baseStep, editor: "text" }}
        value="My saved draft content"
        onChange={() => {}}
        onBlur={() => {}}
      />,
    );

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("My saved draft content");
  });
});
