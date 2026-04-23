import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { flattenSystemPrompt, parseMetadataFromResponse } from "./llm-adapter.js";
import type {
  CoachRuntime,
  CoachRuntimeTurnInput,
  CoachRuntimeTurnResult,
} from "./coach-runtime.js";

export class ClaudeCodeRuntimeError extends Error {
  constructor(message: string) {
    super(`Claude coach runtime failed: ${message}`);
    this.name = "ClaudeCodeRuntimeError";
  }
}

interface ClaudeHeadlessOutput {
  result: string;
  session_id: string;
}

export interface ClaudeCodeRuntimeOptions {
  /** CLI command. Defaults to process.env.CODENCE_CLAUDE_CLI_CMD ?? "claude". */
  cliCommand?: string;
  /** Timeout in milliseconds for a single CLI invocation. */
  timeoutMs?: number;
}

function resolveCliCommand(override?: string): string {
  return override ?? process.env.CODENCE_CLAUDE_CLI_CMD ?? "claude";
}

function verifyCliExists(command: string): void {
  // Only verify absolute/relative paths — bare commands rely on PATH at exec time
  if (command.includes("/")) {
    try {
      accessSync(command, constants.X_OK);
    } catch {
      throw new ClaudeCodeRuntimeError(
        `CLI command not found or not executable: ${command}`,
      );
    }
  }
}

function execCli(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(
          new ClaudeCodeRuntimeError(
            `${error.message}${stderr ? `\n${stderr}` : ""}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

function parseHeadlessOutput(raw: string): ClaudeHeadlessOutput {
  try {
    const parsed = JSON.parse(raw) as ClaudeHeadlessOutput;
    if (typeof parsed.result !== "string" || typeof parsed.session_id !== "string") {
      throw new Error("Missing required fields: result, session_id");
    }
    return parsed;
  } catch (cause) {
    throw new ClaudeCodeRuntimeError(
      `Malformed headless output: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

export function createClaudeCodeRuntime(
  options: ClaudeCodeRuntimeOptions = {},
): CoachRuntime {
  const cliCommand = resolveCliCommand(options.cliCommand);
  const timeoutMs = options.timeoutMs ?? 120_000;
  let verified = false;

  return {
    async sendTurn(input: CoachRuntimeTurnInput): Promise<CoachRuntimeTurnResult> {
      if (!verified) {
        verifyCliExists(cliCommand);
        verified = true;
      }

      const args: string[] = [
        "--print",
        "--output-format", "json",
        "--model", "sonnet",
        "--system-prompt", flattenSystemPrompt(input.systemPrompt),
      ];

      if (!input.isFirstTurn && input.existingRuntimeSessionId) {
        args.push("--resume", input.existingRuntimeSessionId);
      }

      // The user message is the positional argument
      args.push(input.userMessage);

      const stdout = await execCli(cliCommand, args, timeoutMs);
      const headless = parseHeadlessOutput(stdout);
      const parsed = parseMetadataFromResponse(headless.result);

      return {
        text: parsed.text,
        metadata: parsed.metadata,
        runtimeSessionId: headless.session_id,
        backend: "claude-code",
      };
    },

    async releaseSession(): Promise<void> {
      // Claude Code sessions are stateless from the app's perspective —
      // releasing is a no-op in P0. The CLI manages its own session lifecycle.
    },
  };
}
