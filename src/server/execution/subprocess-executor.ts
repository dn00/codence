import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { ExecutionAdapter, ExecutionResult, TestCaseResult } from "./executor.js";

export interface SubprocessExecutorOptions {
  timeoutMs: number;
}

const RESULT_PRINTER = `\nimport json as _json\nprint(_json.dumps({"passed": passed, "failed": failed, "details": _test_details}))`;

function parseResult(stdout: string, stderr: string): ExecutionResult {
  const lines = stdout.trim().split("\n");
  const lastLine = lines[lines.length - 1] ?? "";

  try {
    const parsed = JSON.parse(lastLine) as { passed: number; failed: number; details?: TestCaseResult[] };
    const errors: string[] = [];
    if (stderr.trim().length > 0) {
      errors.push(stderr.trim());
    }
    return {
      passed: typeof parsed.passed === "number" ? parsed.passed : 0,
      failed: typeof parsed.failed === "number" ? parsed.failed : 0,
      errors,
      testDetails: Array.isArray(parsed.details) ? parsed.details : undefined,
    };
  } catch {
    const errors: string[] = [];
    if (stderr.trim().length > 0) {
      errors.push(stderr.trim());
    } else if (stdout.trim().length > 0) {
      errors.push(stdout.trim());
    }
    return { passed: 0, failed: 0, errors };
  }
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const child = spawn(command, args, { cwd, timeout: timeoutMs });

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        resolve({ stdout, stderr: err.message, timedOut: false });
      }
    });

    child.on("close", (_code, signal) => {
      if (!settled) {
        settled = true;
        if (signal === "SIGTERM") {
          timedOut = true;
        }
        resolve({ stdout, stderr, timedOut });
      }
    });
  });
}

export function createSubprocessExecutor(
  options: SubprocessExecutorOptions,
): ExecutionAdapter {
  return {
    async execute(code: string, testHarness: string): Promise<ExecutionResult> {
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), "codence-exec-"));

      try {
        await writeFile(path.join(tmpDir, "solution.py"), code, "utf8");
        await writeFile(
          path.join(tmpDir, "test_harness.py"),
          testHarness + RESULT_PRINTER,
          "utf8",
        );

        const { stdout, stderr, timedOut } = await runProcess(
          "python3",
          ["test_harness.py"],
          tmpDir,
          options.timeoutMs,
        );

        if (timedOut) {
          return {
            passed: 0,
            failed: 0,
            errors: [`TimeoutError: execution exceeded ${options.timeoutMs}ms`],
          };
        }

        return parseResult(stdout, stderr);
      } finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    },
  };
}
