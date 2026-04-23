import type { ExecutorConfig, LearnspaceConfig, TestCase } from "../learnspaces/config-types.js";

export interface TestCaseResult {
  description: string;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
}

export interface ExecutionResult {
  passed: number;
  failed: number;
  errors: string[];
  testDetails?: TestCaseResult[];
}

export interface ExecutionAdapter {
  execute(code: string, testHarness: string): Promise<ExecutionResult> | ExecutionResult;
}

export interface PreparedExecutionInput {
  executor: ExecutorConfig;
  functionName: string;
  testCases: TestCase[];
  testHarness: string;
}

class UnsupportedExecutionAdapter implements ExecutionAdapter {
  execute(): ExecutionResult {
    throw new Error("Code execution is not implemented yet");
  }
}

export function createUnsupportedExecutionAdapter(): ExecutionAdapter {
  return new UnsupportedExecutionAdapter();
}

export function buildTestHarness(
  template: string,
  functionName: string,
  testCases: TestCase[],
): string {
  // Double-stringify so the payload becomes a valid Python string literal.
  // The template unwraps it with `_json.loads(...)`; this avoids inlining
  // JSON's bare `true` / `false` / `null` as Python source, which would NameError.
  const payloadLiteral = JSON.stringify(JSON.stringify(testCases));
  return template
    .replaceAll("{function_name}", functionName)
    .replaceAll("{test_cases_json}", payloadLiteral);
}

export function prepareExecutionInput(
  learnspaceConfig: LearnspaceConfig,
  itemContent: Record<string, unknown>,
): PreparedExecutionInput {
  if (!learnspaceConfig.executor) {
    throw new Error("Learnspace does not define an executor");
  }

  const functionName = itemContent.function_name;
  const testCases = itemContent.test_cases;

  if (typeof functionName !== "string" || !Array.isArray(testCases)) {
    throw new Error("Execution item is missing function_name or test_cases");
  }

  return {
    executor: learnspaceConfig.executor,
    functionName,
    testCases: testCases as TestCase[],
    testHarness: buildTestHarness(
      learnspaceConfig.test_harness_template,
      functionName,
      testCases as TestCase[],
    ),
  };
}
