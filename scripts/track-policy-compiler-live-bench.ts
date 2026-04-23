import { resolveBackends } from "../src/server/ai/providers/registry.js";
import { runLivePolicyCompilerBench } from "../src/server/tracks/policy/bench.js";

async function main(): Promise<void> {
  const sampleSize = Number(process.env.LIVE_BENCH_SAMPLE ?? "5");
  if (!Number.isFinite(sampleSize) || sampleSize <= 0) {
    throw new Error(`Invalid LIVE_BENCH_SAMPLE: ${process.env.LIVE_BENCH_SAMPLE}`);
  }

  const backends = resolveBackends(process.env);
  if (!backends.completion) {
    throw new Error(
      "No llm-adapter provider configured. Set one of: CODENCE_OPENAI_COMPAT_URL, CODENCE_OLLAMA_URL+CODENCE_OLLAMA_MODEL, ANTHROPIC_API_KEY, CODENCE_LLM_POOL_SCRIPT.",
    );
  }

  const excludeIds = new Set(
    (process.env.LIVE_BENCH_EXCLUDE_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

  console.error(
    `[live-bench] provider=${backends.completion.id} sampleSize=${sampleSize}${excludeIds.size > 0 ? ` excluding=${[...excludeIds].join(",")}` : ""}`,
  );
  const summary = await runLivePolicyCompilerBench(backends.completion.adapter, { sampleSize, excludeIds });

  console.log(JSON.stringify({
    provider: backends.completion.id,
    sampleSize,
    summary: {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      handledCorrectlyRate: summary.handledCorrectlyRate,
      totalDurationMs: summary.totalDurationMs,
      avgDurationMs: Math.round(summary.totalDurationMs / Math.max(summary.total, 1)),
    },
    results: summary.results,
  }, null, 2));

  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
