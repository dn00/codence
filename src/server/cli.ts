#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { checkApiKey, ensureDataDir, formatListenMessage } from "./cli-lib.js";
import { createApp, getDefaultClientDistDir } from "./index.js";
import { createDatabase } from "./persistence/db.js";
import { getDefaultDatabasePath } from "./core/bootstrap.js";
import { exportDatabase } from "./core/export.js";
import { importDatabase, ImportError } from "./core/import.js";
import type { ExportEnvelope } from "./core/export.js";

// Pinned to package.json version at compile time so `--version` always
// reports the running binary, not a drifting constant.
const CODENCE_VERSION = "0.1.0";

const HELP = `
Codence — local-first DSA practice runtime

Usage:
  codence [options]
  codence --export <file>
  codence --import <file>

Options:
  --export <file>      Dump the database to <file> as JSON and exit.
  --import <file>      Replace the database contents with <file> (destructive).
  --version, -v        Print version and exit.
  --help, -h           Print this help and exit.

Environment:
  ANTHROPIC_API_KEY              Enables Claude coaching + evaluation.
  CODENCE_OPENAI_COMPAT_URL      Use an OpenAI-compatible endpoint instead.
  CODENCE_OLLAMA_URL             Use a local Ollama server instead.
  CODENCE_DB_PATH                Override the SQLite file path.
                                 Default: ~/.codence/data.db
  PORT                           Server port. Default: 3000.
  HOST                           Server host. Default: 127.0.0.1.

Data:
  SQLite database lives at ~/.codence/data.db. Back up with a plain cp.
  Schema migrations apply automatically on every start.
`;

interface ParsedArgs {
  mode: "serve" | "export" | "import" | "help" | "version";
  file?: string;
  error?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0) return { mode: "serve" };

  const first = args[0];
  if (first === "--help" || first === "-h") return { mode: "help" };
  if (first === "--version" || first === "-v") return { mode: "version" };
  if (first === "--export") {
    if (!args[1]) return { mode: "export", error: "--export requires a file path" };
    return { mode: "export", file: args[1] };
  }
  if (first === "--import") {
    if (!args[1]) return { mode: "import", error: "--import requires a file path" };
    return { mode: "import", file: args[1] };
  }
  return { mode: "serve", error: `Unknown argument: ${first}` };
}

function resolveDbPath(): string {
  return process.env.CODENCE_DB_PATH ?? getDefaultDatabasePath();
}

function runExport(file: string): void {
  ensureDataDir(join(homedir(), ".codence"));
  const db = createDatabase(resolveDbPath());
  const envelope = exportDatabase(db, CODENCE_VERSION);
  writeFileSync(file, JSON.stringify(envelope, null, 2));
  process.stderr.write(`Exported to ${file}\n`);
}

function runImport(file: string): void {
  ensureDataDir(join(homedir(), ".codence"));
  let envelope: ExportEnvelope;
  try {
    envelope = JSON.parse(readFileSync(file, "utf8")) as ExportEnvelope;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Failed to read ${file}: ${msg}\n`);
    process.exitCode = 1;
    return;
  }

  const db = createDatabase(resolveDbPath());
  try {
    importDatabase(db, envelope);
    process.stderr.write(`Imported ${file} into ${resolveDbPath()}\n`);
  } catch (err) {
    if (err instanceof ImportError) {
      process.stderr.write(`Import refused: ${err.message}\n`);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Import failed: ${msg}\n`);
    }
    process.exitCode = 1;
  }
}

async function runServer(): Promise<void> {
  // Check API key — warn-only. Server runs LLM-less too (deterministic
  // evaluation fallback, no coaching).
  checkApiKey(process.env.ANTHROPIC_API_KEY, (msg) => {
    process.stderr.write(msg + "\n");
  });

  ensureDataDir(join(homedir(), ".codence"));

  const port = Number(process.env.PORT ?? "3000");
  const host = process.env.HOST ?? "127.0.0.1";

  const app = await createApp({
    clientDistDir: getDefaultClientDistDir(),
  });

  await app.listen({ port, host });

  process.stdout.write(formatListenMessage(host, port));

  const url = `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
  openBrowser(url);
}

function openBrowser(url: string): void {
  import("node:child_process").then(({ exec }) => {
    const cmd =
      process.platform === "darwin" ? `open "${url}"` :
      process.platform === "win32" ? `start "${url}"` :
      `xdg-open "${url}"`;

    // Browser open is best-effort — ignore errors (headless CI, SSH, etc).
    exec(cmd, () => {});
  }).catch(() => {});
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);

  if (parsed.error) {
    process.stderr.write(`codence: ${parsed.error}\n\n${HELP}`);
    process.exitCode = 1;
    return;
  }

  switch (parsed.mode) {
    case "help":
      process.stdout.write(HELP);
      return;
    case "version":
      process.stdout.write(`codence ${CODENCE_VERSION}\n`);
      return;
    case "export":
      runExport(parsed.file!);
      return;
    case "import":
      runImport(parsed.file!);
      return;
    case "serve":
      await runServer();
      return;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
