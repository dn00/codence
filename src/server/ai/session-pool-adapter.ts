import { execFile } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  AdapterError,
  flattenSystemPrompt,
  parseMetadataFromResponse,
  type CoachingTurnResult,
  type LLMAdapter,
} from "./llm-adapter.js";

export interface SessionPoolAdapterOptions {
  poolScript: string;
  timeoutSeconds?: number;
  pythonBin?: string;
}

function exec(command: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Pool command failed: ${error.message}\n${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
}

export function createSessionPoolAdapter(
  options: SessionPoolAdapterOptions,
): LLMAdapter {
  const timeoutSec = options.timeoutSeconds ?? 120;
  const timeoutMs = (timeoutSec + 30) * 1000;
  const pythonBin = options.pythonBin ?? process.env.CODENCE_PYTHON_BIN ?? "python3";
  const leases = new Map<string, string>(); // sessionKey → leaseFilePath

  async function ensureTempDir(): Promise<string> {
    return mkdtemp(path.join(os.tmpdir(), "codence-coach-"));
  }

  return {
    async coachingTurn(input): Promise<CoachingTurnResult> {
      const tmpDir = await ensureTempDir();

      try {
        const promptFile = path.join(tmpDir, "prompt.txt");
        const responseFile = path.join(tmpDir, "response.txt");
        const systemFile = path.join(tmpDir, "system.txt");

        await writeFile(promptFile, input.userMessage, "utf8");

        const existingLease = leases.get(input.sessionKey);

        if (input.isFirstTurn || !existingLease) {
          // Start a new leased session
          const leaseFile = path.join(tmpDir, "lease.json");
          await writeFile(systemFile, flattenSystemPrompt(input.systemPrompt), "utf8");

          await exec(pythonBin, [
            options.poolScript,
            "start",
            "--lease-file", leaseFile,
            "--prompt-file", promptFile,
            "--response-file", responseFile,
            "--system-prompt-file", systemFile,
            "--timeout", String(timeoutSec),
          ], timeoutMs);

          // Persist lease file path for future resume calls
          leases.set(input.sessionKey, leaseFile);

          const raw = await readFile(responseFile, "utf8");
          return parseMetadataFromResponse(raw);
        }

        // Resume existing session — include system prompt so the worker
        // sees updated step/work context, not stale first-turn context
        const resumeSystemFile = path.join(tmpDir, "system.txt");
        await writeFile(resumeSystemFile, flattenSystemPrompt(input.systemPrompt), "utf8");

        await exec(pythonBin, [
          options.poolScript,
          "resume",
          "--lease-file", existingLease,
          "--prompt-file", promptFile,
          "--response-file", responseFile,
          "--system-prompt-file", resumeSystemFile,
          "--timeout", String(timeoutSec),
        ], timeoutMs);

        const raw = await readFile(responseFile, "utf8");
        return parseMetadataFromResponse(raw);
      } finally {
        // Clean up temp prompt/response files but keep lease file
        const leaseFile = leases.get(input.sessionKey);
        if (leaseFile && path.dirname(leaseFile) !== tmpDir) {
          await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        }
      }
    },

    async complete(systemPrompt, userPrompt, _completeOptions): Promise<string> {
      // Session-pool subprocess has no JSON-mode hook in its CLI; accept
      // the option for interface symmetry but rely on the prompt.
      const tmpDir = await ensureTempDir();
      try {
        const leaseFile = path.join(tmpDir, "lease.json");
        const promptFile = path.join(tmpDir, "prompt.txt");
        const responseFile = path.join(tmpDir, "response.txt");
        const systemFile = path.join(tmpDir, "system.txt");

        await writeFile(systemFile, systemPrompt, "utf8");
        await writeFile(promptFile, userPrompt, "utf8");

        try {
          await exec(pythonBin, [
            options.poolScript,
            "start",
            "--lease-file", leaseFile,
            "--prompt-file", promptFile,
            "--response-file", responseFile,
            "--system-prompt-file", systemFile,
            "--timeout", String(timeoutSec),
          ], timeoutMs);
        } catch (error) {
          throw new AdapterError(
            "session-pool",
            "transport",
            error instanceof Error ? error.message : "pool start failed",
          );
        }

        const raw = await readFile(responseFile, "utf8");

        // One-shot: release immediately
        await exec(pythonBin, [
          options.poolScript,
          "release",
          "--lease-file", leaseFile,
          "--timeout", "10",
        ], 20_000).catch(() => {});

        return raw;
      } finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    },

    async releaseSession(sessionKey: string): Promise<void> {
      const leaseFile = leases.get(sessionKey);
      if (!leaseFile) return;

      try {
        await exec(pythonBin, [
          options.poolScript,
          "release",
          "--lease-file", leaseFile,
          "--timeout", "10",
        ], 20_000);
      } catch {
        // Best-effort release
      } finally {
        leases.delete(sessionKey);
        await unlink(leaseFile).catch(() => {});
      }
    },
  };
}
