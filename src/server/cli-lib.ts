import { existsSync, mkdirSync } from "node:fs";

export function checkApiKey(
  apiKey: string | undefined,
  warn: (msg: string) => void,
): boolean {
  if (apiKey) return true;

  warn(
    "ANTHROPIC_API_KEY is not set.\n" +
    "\n" +
    "  LLM features (coaching, evaluation, variant generation) will be unavailable.\n" +
    "  To enable them, set the environment variable before starting Codence:\n" +
    "\n" +
    "    ANTHROPIC_API_KEY=sk-ant-... npx codence\n" +
    "\n" +
    "  Get an API key at https://console.anthropic.com/\n",
  );
  return false;
}

export function ensureDataDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function formatListenMessage(host: string, port: number): string {
  const displayHost = host === "0.0.0.0" ? "localhost" : host;
  const url = `http://${displayHost}:${port}`;
  return (
    "\n" +
    `  Codence is running at ${url}\n` +
    "\n" +
    "  Press Ctrl+C to stop.\n"
  );
}
