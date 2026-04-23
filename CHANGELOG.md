# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `--export <file>` / `--import <file>` CLI flags for portable JSON backups (destructive on import; round-trips all tables).
- Overdue-queue smoothing: when the pile exceeds the daily review cap, dueDates rebase forward across upcoming days so returning users don't face a wall of "ready".
- Adaptive daily review cap based on rolling 7-day attempt rate; cold-start uses a learnspace-level `defaultDailyCap` (DSA=5, beginner=3).
- Immutable `scheduled_date` column on `queue` and `item_queue`. Scheduler sets both `due_date` and `scheduled_date` on write; smoothing rewrites only `due_date`. Preserves the `completedAt − scheduledDate` signal for future lateness-aware schedulers (FSRS, deadline-anchored).
- Category scope + `scopePolicy.weights` now honored in selection. Policy weights multiply into candidate sort so 70/30 weighted subsets actually surface 70/30.
- Difficulty policy enforced in selection. Fixed/range bands filter the pool; adaptive keeps the legacy confidence curve.
- `GenerationPolicy.onlyWhenSeedPoolExhausted` enforced per-skill. Generated items only surface once the seed pool for that skill is exhausted.
- Pacing policy drives session `timeBudget`. Weekday/weekend branch with `defaultTimeBudgetMinutes` fallback.

### Changed
- `package.json` metadata tightened for npm publish (keywords, engines, repository, bugs, `drizzle/` packaged).
- README rewritten around `npx codence`; old DSA-only framing replaced with V4 policy flow overview.

## [0.1.0] — 2026-04

First public release.

- Local-first DSA practice runtime on SQLite.
- SM-5 spaced-repetition scheduler with weak/due/overdue tiers.
- Track system: policy compiler (V4) → lowered spec (V2) → runtime planner.
- LLM adapter registry: Anthropic direct, OpenAI-compatible endpoints, Ollama, Claude Code CLI.
- Policy-authored custom tracks via a natural-language goal → compiled four-outcome UI (compiled / repaired / clarify / reject).
- Variant generation for problem items when the track permits.
- Code execution for DSA problems with test harness and deterministic quality gates.
- Coach runtime with three-tier prompt caching.
- Snapshot-on-use CRUD for tracks, items, and skills — delete drops computed state, history survives via snapshots.
- NeetCode 150 seed corpus with real category taxonomy.

[Unreleased]: https://github.com/OWNER/codence/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/OWNER/codence/releases/tag/v0.1.0
