import { TRACK_V4_SIMULATED_USER_CASES } from "../src/server/tracks/v4/simulated-user-fixtures.js";
import { runTaxonomyCoverageHarnessV4 } from "../src/server/tracks/v4/taxonomy-coverage.js";
import { compileBenchmarkCaseV4 } from "../src/server/tracks/v4/nl-to-policy.js";
import { runEndToEndTrackHandlingHarnessV4 } from "../src/server/tracks/v4/e2e-track-handling.js";

const taxonomy = runTaxonomyCoverageHarnessV4(TRACK_V4_SIMULATED_USER_CASES);
const compileResults = TRACK_V4_SIMULATED_USER_CASES.flatMap((benchmarkCase) => compileBenchmarkCaseV4(benchmarkCase));
const endToEnd = runEndToEndTrackHandlingHarnessV4(TRACK_V4_SIMULATED_USER_CASES);

console.log(JSON.stringify({
  suite: "simulated-user",
  cases: TRACK_V4_SIMULATED_USER_CASES.length,
  taxonomy: {
    total: taxonomy.total,
    exactFit: taxonomy.exactFit,
    normalizedFit: taxonomy.normalizedFit,
    notExpressible: taxonomy.notExpressible,
  },
  nlToPolicy: {
    totalRequests: compileResults.length,
    compiled: compileResults.filter((result) => result.outcome === "compiled").length,
    repaired: compileResults.filter((result) => result.outcome === "repaired").length,
    clarify: compileResults.filter((result) => result.outcome === "clarify").length,
    reject: compileResults.filter((result) => result.outcome === "reject").length,
  },
  endToEnd: {
    total: endToEnd.total,
    passed: endToEnd.passed,
    failed: endToEnd.failed,
    handledCorrectlyRate: endToEnd.handledCorrectlyRate,
    failedCases: endToEnd.results.filter((result) => !result.passed),
  },
}, null, 2));
