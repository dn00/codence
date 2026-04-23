# Codence

> Local-first DSA practice runtime. SM-5 spaced review, policy-driven tracks, code execution, AI coaching. Your data stays on your machine.

Codence compiles practice goals (e.g. "focus on graphs and trees, 30 min weekdays, medium difficulty") into typed track policies via an LLM, then executes them with a deterministic scheduler over a SQLite database that lives in your home directory.

## Quick Start

```bash
npx codence
```

That's it. Codence:

- creates `~/.codence/data.db` and runs migrations
- starts a local server on `http://localhost:3000`
- opens your browser

Set an API key first if you want coaching, evaluation, and generated problems:

```bash
ANTHROPIC_API_KEY=sk-ant-... npx codence
```

Without a key the app still runs — spaced review, code execution, and deterministic grading all work locally. Coaching and variant generation are disabled until a backend is configured.

## Configuration

All config is environment variables. No config files.

| Variable | Purpose | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude coaching + evaluation | unset → LLM features disabled |
| `CODENCE_OPENAI_COMPAT_URL` | OpenAI-compatible endpoint (OpenRouter, Together, Groq, vLLM, llama.cpp) | unset |
| `CODENCE_OPENAI_API_KEY` | Bearer for above (optional) | unset |
| `CODENCE_OPENAI_MODEL` | Model name for above | varies |
| `CODENCE_OLLAMA_URL` | Local Ollama endpoint | unset |
| `CODENCE_OLLAMA_MODEL` | Ollama model | unset |
| `CODENCE_DB_PATH` | Override SQLite file path | `~/.codence/data.db` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `127.0.0.1` |

Backends are resolved in priority order: `claude-code → openai-compat → ollama → anthropic`. The Settings page (`/settings`) shows the live status of each one.

## Data

Your database is a single SQLite file. Back it up, move it, inspect it with any SQLite tool.

```bash
# Backup
cp ~/.codence/data.db ~/backup.db

# Export to JSON (portable between machines and versions)
npx codence --export ~/codence-backup.json

# Restore from JSON
npx codence --import ~/codence-backup.json
```

`--import` is destructive (truncates current DB). Back up first.

Schema migrations run automatically on every start. Upgrades are one-way — once you've run `0.2` on a database, `0.1` won't open it.

## CLI

```
codence                        # start the server
codence --export <file>        # dump database to JSON
codence --import <file>        # replace database from JSON (destructive)
codence --help
codence --version
```

## Practice Loop

1. Pick a track on the dashboard, or create one by describing your goal — the LLM compiles it into a track policy.
2. Start a session. The planner picks your next item based on the track's scope, difficulty policy, and SM-5 review tiers.
3. Read *why this problem now* — every selection is explainable.
4. Work through the protocol: understand, approach, code, verify. Code sessions must be executed before they count as clean solves.
5. The scheduler updates review intervals and progress projections. Sessions and attempts are immutable history.

## Architecture

```
src/
  server/
    ai/                  LLM adapter registry (Anthropic / OpenAI-compat / Ollama / Claude CLI)
    core/                Selection, completion, SM-5 scheduler, queue smoothing
    tracks/              Policy compiler (V4), lowering to V2, planner, runtime
    persistence/         Drizzle schema + SQLite bootstrap
    routes/              Fastify HTTP handlers
    learnspaces/         Built-in DSA learnspace (NeetCode 150 seeds)
  client/                React + Vite app (Library, Home, Practice, Settings)

drizzle/                 SQL migrations (applied in order at startup)
```

Key files for newcomers:

- `src/server/core/selection-pipeline.ts` — how the next item is chosen
- `src/server/tracks/policy/compiler.ts` — goal → policy (via LLM) → lowered spec
- `src/server/core/completion.ts` — SM-5 updates, deterministic quality gates
- `src/server/persistence/schema.ts` — the authoritative data model

## Development

```bash
pnpm install
pnpm dev          # client + server with HMR
pnpm test         # full Vitest suite (500+ tests)
pnpm typecheck    # client + server typecheck
pnpm build        # production build
```

The commands above cover the local dev workflow used in this repo.

## Status

v0.1 is the first public release. Features are stable; DSA is the only domain wired in (schema and benchmark cover three). Breaking changes will be called out in [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE)
