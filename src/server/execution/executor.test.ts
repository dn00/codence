import type { EvaluationService } from "../runtime-services.js";
import { config as codingInterviewConfig, seedItems } from "../learnspaces/coding-interview-patterns.js";
import {
  buildTestHarness,
  createUnsupportedExecutionAdapter,
  prepareExecutionInput,
  type ExecutionAdapter,
  type ExecutionResult,
} from "./executor.js";
import type { AttemptContext, CoachingMetadata, SessionMessage, StructuredEvaluation } from "../core/types.js";

describe("runtime contracts", () => {
  test("AC-1 exports typed runtime contracts for execution evaluation and coaching metadata", () => {
    const executionResult: ExecutionResult = {
      passed: 2,
      failed: 0,
      errors: [],
    };
    const executionAdapter: ExecutionAdapter = createUnsupportedExecutionAdapter();
    const evaluationService: EvaluationService = {
      evaluateAttempt(_input: AttemptContext): StructuredEvaluation {
        return {
          outcome: "clean",
          diagnosis: "none",
          severity: "minor",
          approach_correct: true,
          per_step_quality: {},
          mistakes: [],
          strengths: ["Completed all steps"],
          coaching_summary: "Independent solve.",
          evaluation_source: "llm",
          retry_recovered: false,
        };
      },
    };
    const message: SessionMessage = {
      role: "assistant",
      content: "Try tracing one test case.",
      createdAt: "2026-04-08T12:00:00.000Z",
    };
    const metadata: CoachingMetadata = {
      help_level: 1,
      information_revealed: ["prompt"],
      user_appears_stuck: false,
      user_understanding: "partial",
      notable_mistake: null,
      gave_full_solution: false,
    };

    expect(executionResult).toEqual({
      passed: 2,
      failed: 0,
      errors: [],
    });
    expect(executionAdapter).toBeTruthy();
    expect(evaluationService.evaluateAttempt).toBeTruthy();
    expect(message.role).toBe("assistant");
    expect(metadata.user_understanding).toBe("partial");
  });
  test("AC-2 builds a test harness from template function_name and serialized test cases", () => {
    const item = seedItems[0];
    const harness = buildTestHarness(
      codingInterviewConfig.test_harness_template,
      item.function_name,
      item.test_cases,
    );

    expect(harness).toContain(`from solution import ${item.function_name}`);
    expect(harness).toContain(`result = ${item.function_name}(*tc['args'])`);
    expect(harness).toContain(`test_cases = _json.loads(${JSON.stringify(JSON.stringify(item.test_cases))})`);
    expect(harness.includes("{function_name}")).toBe(false);
    expect(harness.includes("{test_cases_json}")).toBe(false);
  });
  test("AC-3 default local execution adapter throws a clear unsupported error", () => {
    const adapter = createUnsupportedExecutionAdapter();

    expect(() => adapter.execute("def solve(): pass", "assert True")).toThrow(
      "Code execution is not implemented yet",
    );
  });
  test("AC-4 execution prep rejects learnspaces without executor config before adapter dispatch", () => {
    expect(() =>
      prepareExecutionInput(
        {
          ...codingInterviewConfig,
          executor: null,
        },
        {
          function_name: "two_sum",
          test_cases: seedItems[0].test_cases,
        },
      ),
    ).toThrow("Learnspace does not define an executor");
  });
  test("EC-1 test harness assembly preserves nested test case payloads", () => {
    const nestedCases = [
      {
        args: [[["a", "b"], ["c"]], { target: { count: 2 } }],
        expected: { pairs: [["a", "b"]] },
        description: "nested arrays and objects",
      },
    ];

    const harness = buildTestHarness(
      codingInterviewConfig.test_harness_template,
      "group_pairs",
      nestedCases,
    );

    // Payload round-trips through JSON.parse on the harness string: the Python
    // side calls `_json.loads`, so we simulate it here and compare structurally.
    const literalMatch = harness.match(/_json\.loads\((".*")\)/);
    expect(literalMatch).not.toBeNull();
    const inner = JSON.parse(literalMatch![1]);
    expect(JSON.parse(inner)).toEqual(nestedCases);
  });
  test("ERR-1 unsupported local execution reports a stable not-implemented message", () => {
    const adapter = createUnsupportedExecutionAdapter();

    expect(() => adapter.execute("print('hi')", "assert True")).toThrow(
      "Code execution is not implemented yet",
    );
  });
  test("ERR-2 missing executor config reports a stable configuration error", () => {
    expect(() =>
      prepareExecutionInput(
        {
          ...codingInterviewConfig,
          executor: null,
        },
        {
          function_name: seedItems[0].function_name,
          test_cases: seedItems[0].test_cases,
        },
      ),
    ).toThrow("Learnspace does not define an executor");
  });
});
