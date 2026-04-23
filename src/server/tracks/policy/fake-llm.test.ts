import { describe, expect, test } from "vitest";
import { createFakeLLM } from "./fake-llm.js";

describe("createFakeLLM", () => {
  test("returns responses in order and records calls", async () => {
    const llm = createFakeLLM({ responses: ["first", "second"] });
    expect(await llm.complete("sys1", "user1")).toBe("first");
    expect(await llm.complete("sys2", "user2")).toBe("second");
    expect(llm.calls).toEqual([
      { systemPrompt: "sys1", userPrompt: "user1" },
      { systemPrompt: "sys2", userPrompt: "user2" },
    ]);
  });

  test("throws when exhausted by default", async () => {
    const llm = createFakeLLM({ responses: ["only"] });
    await llm.complete("s", "u");
    await expect(llm.complete("s", "u")).rejects.toThrow(/exhausted/);
  });

  test("repeatLast returns last response after exhaustion", async () => {
    const llm = createFakeLLM({ responses: ["only"], onExhausted: "repeatLast" });
    await llm.complete("s", "u");
    expect(await llm.complete("s", "u")).toBe("only");
  });

  test("reset clears index and call history", async () => {
    const llm = createFakeLLM({ responses: ["a", "b"] });
    await llm.complete("s", "u");
    llm.reset();
    expect(await llm.complete("s", "u")).toBe("a");
    expect(llm.calls).toHaveLength(1);
  });
});
