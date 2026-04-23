import { mkdtemp, rm, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { ensureDataDir, checkApiKey, formatListenMessage } from "./cli-lib.js";

describe("CLI", () => {
  test("AC-1 package.json has bin field", async () => {
    const pkg = await import("../../package.json", { with: { type: "json" } });
    expect(pkg.default.bin).toBeDefined();
    expect(pkg.default.bin.codence).toBe("dist/server/cli.js");
  });
  test("AC-2 prints setup instructions when API key missing", () => {
    const warnings: string[] = [];
    const result = checkApiKey(undefined, (msg) => warnings.push(msg));
    expect(result).toBe(false);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/ANTHROPIC_API_KEY/);
  });

  test("AC-2 no warning when API key is set", () => {
    const warnings: string[] = [];
    const result = checkApiKey("sk-test-key", (msg) => warnings.push(msg));
    expect(result).toBe(true);
    expect(warnings.length).toBe(0);
  });
  test("AC-3 creates data directory", async () => {
    const tmpBase = await mkdtemp(path.join(os.tmpdir(), "codence-cli-test-"));
    const dataDir = path.join(tmpBase, "new-codence-dir");

    try {
      await ensureDataDir(dataDir);
      const entries = await readdir(dataDir);
      expect(entries).toBeDefined();
    } finally {
      await rm(tmpBase, { recursive: true, force: true });
    }
  });
  test("AC-4 formats listen message with URL", () => {
    const msg = formatListenMessage("127.0.0.1", 3000);
    expect(msg).toContain("http://127.0.0.1:3000");
  });
  test("EC-1 data directory already exists", async () => {
    const tmpBase = await mkdtemp(path.join(os.tmpdir(), "codence-cli-test-"));

    try {
      // Call twice — should not throw
      await ensureDataDir(tmpBase);
      await ensureDataDir(tmpBase);
    } finally {
      await rm(tmpBase, { recursive: true, force: true });
    }
  });
  test("ERR-1 handles edge port and host values", () => {
    const msg = formatListenMessage("0.0.0.0", 0);
    // 0.0.0.0 is mapped to localhost for display
    expect(msg).toContain("http://localhost:0");
  });
  test("AC-4 server starts and responds to health check", async () => {
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const { createApp } = await import("./index.js");

    const clientDistDir = await mkdtemp(path.join(os.tmpdir(), "codence-cli-int-"));
    await writeFile(path.join(clientDistDir, "index.html"), "<!doctype html><html><body></body></html>", "utf8");
    const dbDir = await mkdtemp(path.join(os.tmpdir(), "codence-db-cli-"));
    const dbPath = path.join(dbDir, "test.sqlite");

    const app = await createApp({ clientDistDir, dbPath });
    try {
      const health = await app.inject({ method: "GET", url: "/api/health" });
      expect(health.statusCode).toBe(200);
      expect(health.json()).toHaveProperty("status", "ok");
    } finally {
      await app.close();
      await rm(clientDistDir, { recursive: true, force: true });
      await rm(dbDir, { recursive: true, force: true });
    }
  }, 15_000);
});
