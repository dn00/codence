import { describe, expect, test } from "vitest";
import { summarizeSimulatedUserCasesV4 } from "./simulated-user-fixtures.js";

describe("track v4 simulated-user corpus", () => {
  test("covers multiple domains and handling classes", () => {
    const summary = summarizeSimulatedUserCasesV4();
    expect(summary.total).toBeGreaterThanOrEqual(36);
    expect(summary.byDomain["coding-interview-patterns"]).toBeGreaterThan(0);
    expect(summary.byDomain["writing-workshop"]).toBeGreaterThan(0);
    expect(summary.byDomain["language-lab"]).toBeGreaterThan(0);
    expect(summary.byClass.supported).toBeGreaterThan(0);
    expect(summary.byClass.ambiguous).toBeGreaterThan(0);
    expect(summary.byClass.repairable).toBeGreaterThan(0);
    expect(summary.byClass.unsupported).toBeGreaterThan(0);
  });
});
