import { describe, test, expect, vi, beforeEach } from "vitest";
import type { CoachRuntimeTurnInput } from "./coach-runtime.js";

// We'll mock child_process.execFile and fs.accessSync to control CLI behavior
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:fs", () => ({
  accessSync: vi.fn(),
}));

import { execFile } from "node:child_process";
import { accessSync } from "node:fs";
import {
  createClaudeCodeRuntime,
  ClaudeCodeRuntimeError,
} from "./claude-code-runtime.js";

const mockedExecFile = vi.mocked(execFile);
const mockedAccessSync = vi.mocked(accessSync);

function makeFirstTurnInput(overrides: Partial<CoachRuntimeTurnInput> = {}): CoachRuntimeTurnInput {
  return {
    appSessionId: "session-1",
    systemPrompt: "You are a helpful coding coach.",
    userMessage: "How do I solve two sum?",
    isFirstTurn: true,
    existingRuntimeSessionId: null,
    priorHistory: [],
    ...overrides,
  };
}

function makeResumeTurnInput(overrides: Partial<CoachRuntimeTurnInput> = {}): CoachRuntimeTurnInput {
  return {
    appSessionId: "session-1",
    systemPrompt: "You are a helpful coding coach.",
    userMessage: "What about using a hash map?",
    isFirstTurn: false,
    existingRuntimeSessionId: "claude-session-abc",
    priorHistory: [],
    ...overrides,
  };
}

function simulateExecFile(stdout: string, exitCode = 0, stderr = "") {
  mockedExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
    if (exitCode !== 0) {
      const err = new Error(`Command failed with exit code ${exitCode}`) as Error & { code: number };
      err.code = exitCode;
      (callback as Function)(err, "", stderr);
    } else {
      (callback as Function)(null, stdout, stderr);
    }
    return {} as ReturnType<typeof execFile>;
  });
}

describe("Claude Code runtime transport", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default: CLI command exists
    mockedAccessSync.mockReturnValue(undefined);
  });

  test("AC-1 first turn starts a claude runtime session and captures provider session id", async () => {
    const headlessOutput = JSON.stringify({
      result: "Try using a hash map to store values you've seen.\n\n---METADATA---\n" +
        JSON.stringify({
          help_level: 0.3,
          information_revealed: ["pattern_name"],
          user_appears_stuck: false,
          user_understanding: "partial",
          notable_mistake: null,
          gave_full_solution: false,
        }),
      session_id: "claude-session-xyz",
    });

    simulateExecFile(headlessOutput);
    const runtime = createClaudeCodeRuntime();

    const result = await runtime.sendTurn(makeFirstTurnInput());

    expect(result.runtimeSessionId).toBe("claude-session-xyz");
    expect(result.backend).toBe("claude-code");
    expect(result.text).toBe("Try using a hash map to store values you've seen.");
    expect(result.metadata).toEqual(expect.objectContaining({
      help_level: 0.3,
      user_understanding: "partial",
    }));

    // Verify first turn does NOT pass --resume
    const callArgs = mockedExecFile.mock.calls[0];
    const args = callArgs[1] as string[];
    expect(args).not.toContain("--resume");
  });

  test("AC-2 later turns resume an existing claude runtime session", async () => {
    const headlessOutput = JSON.stringify({
      result: "Good thinking! A hash map gives O(1) lookups.\n\n---METADATA---\n" +
        JSON.stringify({
          help_level: 0.2,
          information_revealed: [],
          user_appears_stuck: false,
          user_understanding: "solid",
          notable_mistake: null,
          gave_full_solution: false,
        }),
      session_id: "claude-session-abc",
    });

    simulateExecFile(headlessOutput);
    const runtime = createClaudeCodeRuntime();

    const result = await runtime.sendTurn(makeResumeTurnInput());

    expect(result.runtimeSessionId).toBe("claude-session-abc");
    expect(result.backend).toBe("claude-code");

    // Verify resume passes --resume with session ID
    const callArgs = mockedExecFile.mock.calls[0];
    const args = callArgs[1] as string[];
    expect(args).toContain("--resume");
    expect(args).toContain("claude-session-abc");
  });

  test("AC-3 runtime parses cleaned text and metadata from headless claude output", async () => {
    const metadataJson = JSON.stringify({
      help_level: 0.5,
      information_revealed: ["approach_hint"],
      user_appears_stuck: true,
      user_understanding: "confused",
      notable_mistake: "wrong data structure",
      gave_full_solution: false,
    });
    const headlessOutput = JSON.stringify({
      result: `Let me help you think about this differently.\n\n---METADATA---\n${metadataJson}`,
      session_id: "claude-session-parse",
    });

    simulateExecFile(headlessOutput);
    const runtime = createClaudeCodeRuntime();

    const result = await runtime.sendTurn(makeFirstTurnInput());

    expect(result.text).toBe("Let me help you think about this differently.");
    expect(result.metadata).toEqual({
      help_level: 0.5,
      information_revealed: ["approach_hint"],
      user_appears_stuck: true,
      user_understanding: "confused",
      notable_mistake: "wrong data structure",
      gave_full_solution: false,
    });
    // Raw metadata trailer must not appear in text
    expect(result.text).not.toContain("---METADATA---");
    expect(result.text).not.toContain("help_level");
  });

  test("EC-1 runtime tolerates assistant responses without metadata trailer", async () => {
    const headlessOutput = JSON.stringify({
      result: "Just a plain coaching response without metadata.",
      session_id: "claude-session-nometadata",
    });

    simulateExecFile(headlessOutput);
    const runtime = createClaudeCodeRuntime();

    const result = await runtime.sendTurn(makeFirstTurnInput());

    expect(result.text).toBe("Just a plain coaching response without metadata.");
    expect(result.metadata).toBeNull();
    expect(result.runtimeSessionId).toBe("claude-session-nometadata");
    expect(result.backend).toBe("claude-code");
  });

  test("ERR-1 non-zero claude exits surface typed runtime errors", async () => {
    simulateExecFile("", 1, "Error: Claude CLI crashed");
    const runtime = createClaudeCodeRuntime();

    await expect(runtime.sendTurn(makeFirstTurnInput())).rejects.toThrow(ClaudeCodeRuntimeError);
    await expect(runtime.sendTurn(makeFirstTurnInput())).rejects.toThrow(
      /^Claude coach runtime failed:/,
    );
  });
});
