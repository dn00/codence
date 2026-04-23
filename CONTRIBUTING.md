# Contributing

Thanks for considering a contribution. Codence is small and opinionated; the bar for changes is "does it make the practice loop better, simpler, or more correct."

## Ground rules

- **One concern per PR.** A bug fix and a refactor in the same diff make review hard.
- **Tests come with code.** New behavior needs a test. Bug fixes need a regression test that fails without the fix.
- **No new dependencies without a reason in the PR description.** Smaller surface area = fewer supply-chain risks.
- **Local-first stays local-first.** Anything that phones home, ships telemetry, or requires an account by default will not be merged.

## Dev setup

```bash
pnpm install
pnpm dev          # client + server with HMR on http://localhost:3000
pnpm test         # full Vitest suite
pnpm typecheck    # client + server
pnpm build        # production build
```

Node 20 or 22, pnpm 10. The CI matrix runs both Node versions.

## Before opening a PR

```bash
pnpm typecheck && pnpm test && pnpm build
```

All three must be green. CI also runs `pnpm track:policy:compiler-bench`, only relevant if you touched `src/server/tracks/policy/`.

## Project layout

See the [Architecture section in README.md](./README.md#architecture) for the directory map and the four files newcomers should read first.

## Filing bugs

Open a GitHub issue with:

- Codence version (`codence --version`)
- Node version
- Steps to reproduce. Minimal repro beats a vague description every time
- Expected vs. actual behavior
- Relevant log output (redact API keys)

For data corruption or scheduler bugs, attach a JSON export (`codence --export`) of the smallest DB that reproduces the issue if you can.

## Security

See [SECURITY.md](./SECURITY.md). Do not file public issues for vulnerabilities.

## License

By contributing you agree your contributions are licensed under the [MIT License](./LICENSE).
