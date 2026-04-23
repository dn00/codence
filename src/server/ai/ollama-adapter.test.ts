import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { createOllamaAdapter } from "./ollama-adapter.js";
import { AdapterError } from "./llm-adapter.js";

const originalFetch = globalThis.fetch;

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number; text?: string } = {}): void {
  const response = {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    async json() {
      return body;
    },
    async text() {
      return init.text ?? JSON.stringify(body);
    },
  } as unknown as Response;
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(response);
}

describe("OllamaAdapter", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("coachingTurn posts to /api/chat and returns parsed text", async () => {
    mockFetchOnce({
      model: "llama3.2",
      message: { role: "assistant", content: "Hello from Ollama" },
      done: true,
    });

    const adapter = createOllamaAdapter({
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
    });

    const result = await adapter.coachingTurn({
      sessionKey: "s1",
      systemPrompt: "You are a coach.",
      userMessage: "Help me",
      isFirstTurn: true,
      priorHistory: [],
    });

    expect(result.text).toBe("Hello from Ollama");
    expect(result.metadata).toBeNull();

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/api/chat");
    expect(init.method).toBe("POST");
    const sentBody = JSON.parse(init.body as string) as {
      model: string;
      stream: boolean;
      messages: Array<{ role: string; content: string }>;
    };
    expect(sentBody.model).toBe("llama3.2");
    expect(sentBody.stream).toBe(false);
    expect(sentBody.messages).toEqual([
      { role: "system", content: "You are a coach." },
      { role: "user", content: "Help me" },
    ]);
  });

  test("priorHistory is threaded into messages[] on resumed turns", async () => {
    mockFetchOnce({
      model: "llama3.2",
      message: {
        role: "assistant",
        content: 'First response\n---METADATA---\n{"help_level":0.2}',
      },
      done: true,
    });
    mockFetchOnce({
      model: "llama3.2",
      message: { role: "assistant", content: "Second response" },
      done: true,
    });

    const adapter = createOllamaAdapter({
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
    });

    const turn1 = await adapter.coachingTurn({
      sessionKey: "s1",
      systemPrompt: "Coach",
      userMessage: "Turn 1",
      isFirstTurn: true,
      priorHistory: [],
    });
    expect(turn1.text).toBe("First response");
    expect(turn1.metadata).toEqual({ help_level: 0.2 });

    // Caller supplies the already-cleaned prior history on turn 2.
    // (The persistence layer stores metadata-stripped assistant text.)
    await adapter.coachingTurn({
      sessionKey: "s1",
      systemPrompt: "Coach",
      userMessage: "Turn 2",
      isFirstTurn: false,
      priorHistory: [
        { role: "user", content: "Turn 1" },
        { role: "assistant", content: "First response" },
      ],
    });

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, lastInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const lastBody = JSON.parse(lastInit.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(lastBody.messages).toEqual([
      { role: "system", content: "Coach" },
      { role: "user", content: "Turn 1" },
      { role: "assistant", content: "First response" },
      { role: "user", content: "Turn 2" },
    ]);
  });

  test("complete sends one-shot system + user without history", async () => {
    mockFetchOnce({
      model: "llama3.2",
      message: { role: "assistant", content: '{"outcome":"clean"}' },
      done: true,
    });

    const adapter = createOllamaAdapter({
      baseUrl: "http://localhost:11434/",
      model: "llama3.2",
    });

    const result = await adapter.complete("system", "user");
    expect(result).toBe('{"outcome":"clean"}');

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/api/chat");
  });

  test("bearer token is attached when apiKey provided", async () => {
    mockFetchOnce({
      model: "llama3.2",
      message: { role: "assistant", content: "ok" },
      done: true,
    });

    const adapter = createOllamaAdapter({
      baseUrl: "http://proxy.example.com",
      model: "llama3.2",
      apiKey: "secret-token",
    });

    await adapter.complete("sys", "usr");

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer secret-token");
  });

  test("jsonMode adds format:json to request body", async () => {
    mockFetchOnce({
      model: "llama3.2",
      message: { role: "assistant", content: '{"ok":true}' },
      done: true,
    });

    const adapter = createOllamaAdapter({
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
    });

    await adapter.complete("sys", "usr", { jsonMode: true });

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { format?: string };
    expect(body.format).toBe("json");
  });

  test("jsonMode omitted when not requested", async () => {
    mockFetchOnce({
      model: "llama3.2",
      message: { role: "assistant", content: "ok" },
      done: true,
    });

    const adapter = createOllamaAdapter({
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
    });

    await adapter.complete("sys", "usr");

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { format?: string };
    expect(body.format).toBeUndefined();
  });

  test("HTTP error propagates with status and body", async () => {
    mockFetchOnce(
      {},
      { ok: false, status: 500, text: "model not found" },
    );

    const adapter = createOllamaAdapter({
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
    });

    const err = await adapter.complete("sys", "usr").catch((e) => e);
    expect(err).toBeInstanceOf(AdapterError);
    expect(err.backend).toBe("ollama");
    expect(err.stage).toBe("http");
    expect(err.status).toBe(500);
    expect(err.message).toContain("model not found");
  });

  test("malformed response throws", async () => {
    mockFetchOnce({ model: "llama3.2", done: true });

    const adapter = createOllamaAdapter({
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
    });

    const err = await adapter.complete("sys", "usr").catch((e) => e);
    expect(err).toBeInstanceOf(AdapterError);
    expect(err.backend).toBe("ollama");
    expect(err.stage).toBe("shape");
    expect(err.message).toContain("message.content");
  });

  test("releaseSession is a no-op (adapter is stateless)", async () => {
    const adapter = createOllamaAdapter({
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
    });

    await expect(adapter.releaseSession("s1")).resolves.toBeUndefined();
  });
});
