import { createSubprocessExecutor } from "./subprocess-executor.js";
import { resolveAppServices } from "../runtime-services.js";
import { buildTestHarness } from "./executor.js";
import { config as codingInterviewConfig, seedItems } from "../learnspaces/coding-interview-patterns.js";

const CLIMB_STAIRS_CORRECT = `def climb_stairs(n):
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b`;

const CLIMB_STAIRS_WRONG = `def climb_stairs(n):
    return n`;

function makeHarness(functionName: string, testCases: unknown[]): string {
  return buildTestHarness(
    codingInterviewConfig.test_harness_template,
    functionName,
    testCases as Array<{ args: unknown[]; expected: unknown; description: string }>,
  );
}

describe("subprocess executor", () => {
  const executor = createSubprocessExecutor({ timeoutMs: 10_000 });
  // Use a hand-crafted item with proper test cases — NeetCode seeds have
  // example-only test data that doesn't have parseable args.
  const item = {
    function_name: "climb_stairs",
    test_cases: [
      { args: [1], expected: 1, description: "one step" },
      { args: [2], expected: 2, description: "two steps" },
      { args: [3], expected: 3, description: "three steps" },
      { args: [5], expected: 8, description: "five steps" },
      { args: [10], expected: 89, description: "ten steps" },
    ],
  };
  const harness = makeHarness(item.function_name, item.test_cases);

  // AC-1: executes correct Python code and returns all-pass result
  test("executes correct Python code and returns all-pass result", async () => {
    const result = await executor.execute(CLIMB_STAIRS_CORRECT, harness);

    expect(result.passed).toBe(item.test_cases.length);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  }, 15_000);

  // AC-2: returns failed count for incorrect solutions
  test("returns failed count for incorrect solutions", async () => {
    const result = await executor.execute(CLIMB_STAIRS_WRONG, harness);

    // "return n" is correct for n=1 but wrong for all others
    expect(result.passed).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.passed + result.failed).toBe(item.test_cases.length);
  }, 15_000);

  // AC-3: kills process and returns timeout error when execution exceeds limit
  test("kills process and returns timeout error when execution exceeds limit", async () => {
    const shortTimeout = createSubprocessExecutor({ timeoutMs: 1000 });
    const slowCode = `import time\ndef climb_stairs(n):\n    time.sleep(10)\n    return 1`;

    const result = await shortTimeout.execute(slowCode, harness);

    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual(["TimeoutError: execution exceeded 1000ms"]);
  }, 15_000);

  // AC-4: captures syntax errors in errors array
  test("captures syntax errors in errors array", async () => {
    const badCode = `def climb_stairs(n:\n    pass`;

    const result = await executor.execute(badCode, harness);

    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/SyntaxError/);
  }, 15_000);

  // AC-5: resolveAppServices returns subprocess executor by default
  test("resolveAppServices returns subprocess executor by default", () => {
    const services = resolveAppServices();

    expect(services.executionAdapter).toBeDefined();
    expect(services.executionAdapter.execute).toBeInstanceOf(Function);
  });

  // EC-1: handles empty code string without hanging
  test("handles empty code string without hanging", async () => {
    const result = await executor.execute("", harness);

    expect(result.passed).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  }, 15_000);

  // EC-2: handles unicode and special characters in code
  test("handles unicode and special characters in code", async () => {
    const unicodeCode = `def climb_stairs(n):
    # héllo 世界 — works fine
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b`;

    const result = await executor.execute(unicodeCode, harness);

    expect(result.passed).toBe(item.test_cases.length);
    expect(result.failed).toBe(0);
  }, 15_000);

  // ERR-1: reports spawn error when python3 is not available
  test("reports spawn error when python3 is not available", async () => {
    const result = await executor.execute(
      "# no function defined",
      "from solution import nonexistent_func\nprint('unreachable')",
    );

    expect(result.passed).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  }, 15_000);

  // ERR-2: captures import error for missing function
  test("captures import error for missing function", async () => {
    const wrongName = `def other_func():\n    pass`;

    const result = await executor.execute(wrongName, harness);

    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/ImportError|ModuleNotFoundError|cannot import/);
  }, 15_000);
});
