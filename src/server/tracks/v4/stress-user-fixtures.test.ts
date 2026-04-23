import { describe, expect, test } from "vitest";
import { summarizeStressUserCasesV4 } from "./stress-user-fixtures.js";

describe("track v4 stress-user corpus", () => {
  test("covers multiple domains and a large synthetic request surface", () => {
    const summary = summarizeStressUserCasesV4();
    expect(summary.total).toBeGreaterThanOrEqual(100);
    expect(summary.byDomain["coding-interview-patterns"]).toBeGreaterThan(0);
    expect(summary.byDomain["writing-workshop"]).toBeGreaterThan(0);
    expect(summary.byDomain["language-lab"]).toBeGreaterThan(0);
    expect(summary.byClass.supported).toBeGreaterThan(0);
    expect(summary.byClass.ambiguous).toBeGreaterThan(0);
    expect(summary.byClass.repairable).toBeGreaterThan(0);
    expect(summary.byClass.unsupported).toBeGreaterThan(0);
  });
});
