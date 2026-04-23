import { runPolicyCompilerBench, runPolicyCompilerParity } from "../src/server/tracks/policy/bench.js";

async function main(): Promise<void> {
  const parity = await runPolicyCompilerParity();
  const summary = await runPolicyCompilerBench();
  const failedCases = summary.results.filter((r) => !r.passed);

  console.log(JSON.stringify({
    parity: {
      llmCompilerRate: parity.llmCompilerRate,
      heuristicRate: parity.heuristicRate,
      parityMet: parity.parityMet,
      regressionCount: parity.regressed.length,
      regressed: parity.regressed,
      llmFailedCount: parity.llmFailed.length,
      heuristicFailedCount: parity.heuristicFailed.length,
    },
    failedCases,
  }, null, 2));

  if (!parity.parityMet || parity.regressed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
