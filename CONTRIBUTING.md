# Contributing to frontend-inspo-mcp

Thanks for helping! This project is a small MCP server; most contributions are either a **new source** or a **fix for a source whose website changed**.

## How to contribute

- **Bugs and feature requests:** open a [GitHub issue](https://github.com/notsointresting/frontend-inspo-mcp/issues). For a broken source, include the `source`, the tool call you made, and the error.
- **Code changes:** fork the repo, branch from `main`, and open a pull request. Keep each PR to one change. Maintainers review PRs and merge once CI is green. How decisions are made is described in [GOVERNANCE.md](GOVERNANCE.md), and how the code fits together in [ARCHITECTURE.md](ARCHITECTURE.md).
- **Conduct:** everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Security problems:** do not open a public issue. Follow [SECURITY.md](SECURITY.md).

## Set up

Requires Node 22 or newer. CI tests Node 22, 24 and 26 on Linux, and Node 24 on Windows.

```bash
git clone https://github.com/<your-fork>/frontend-inspo-mcp.git
cd frontend-inspo-mcp
npm ci
npm run build
```

## Before you open a PR

All of these must pass. CI runs lint, build and the tests with coverage on every push and pull request; the live smoke test runs nightly instead (see [Smoke test](#smoke-test)).

```bash
npm run lint    # Biome: lint + format check (fix with `npm run lint:fix`)
npm run build   # tsc in strict mode, must have no errors
npm test        # offline unit tests (builds first); no network needed
npm run smoke   # live check of every source (needs network); `npm run smoke -- <id>` checks one
```

## Tests

The unit tests live in `tests/*.test.mjs` and use Node's built-in test runner (`node:test`), so there is nothing extra to install. They run offline: adapters are tested against small saved HTML/JSON samples by replacing `fetch` with a fake (see `tests/helpers.mjs`), so they are fast and do not depend on live websites.

**Testing policy (mandatory):** new functionality and bug fixes MUST come with automated tests in `tests/`, and coverage must stay at or above the thresholds in `.c8rc.json` (85% of statements, lines and functions, 70% of branches; enforced by `npm run coverage` in CI). For a bug fix, add a test that fails without the fix. For a new source, add a test file with a representative sample of the site's HTML/JSON and assert on `search`, `getResource` and the error cases. A PR that adds behavior without tests will be asked to add them before merging.

## Smoke test

`npm run smoke` hits real websites. It prints a per-source PASS/FAIL table and classifies failures:

- **HARD** (0 results, missing code, HTTP 4xx, changed page format): a parser or contract is broken. Fix the adapter; do not loosen the assertion.
- **TRANSIENT** (rate limit, network error): retried automatically. Set `GITHUB_TOKEN` to avoid GitHub's 60 requests/hour limit for the GitHub-backed sources.

CI does not run it, so a site being down cannot fail a pull request. The [nightly smoke workflow](.github/workflows/smoke.yml) runs it every day, and on demand from the Actions tab: a failing run opens, or comments on, one issue labelled `smoke-failure` with the summary table, and the next passing run closes it. Before a PR, run `npm run smoke -- <id> <id>` for the sources it touches.

## Adding a source

1. **Write the adapter.** Many sources are one config block for an existing factory: `makeRegistryAdapter` in `src/sources/registry.ts` for shadcn-schema registries, and `makeGithubSrcAdapter`, `makeJsdelivrSrcAdapter` or `makePackageAdapter` in `src/sources/packages.ts` for source trees on GitHub or npm. Anything else gets its own `src/sources/<name>.ts` exporting a `SourceAdapter` (the contract is in `src/lib/types.ts`). Fetch only through `src/lib/fetch.ts`, filter with `rankByQuery` from `src/lib/search.ts`, and cache parsed upstream data with `memoAsync` from `src/lib/memo.ts`.
2. **Register it** in `src/sources/index.ts`: add it to `ADAPTER_LIST`, or to the group array it belongs to (`communityRegistries`, `collectionSources`, `librarySources`, `designApiSources` or `openDataSources`). That one entry puts it in every tool's `source` enum, `list_sources`, `search_all` and the smoke test; no tool or schema needs editing.
3. **Describe it.** Give it a lowercase `id`, a `label`, a `description`, an https `homepage` and `hasInlineCode`, and set:
   - `stack`: the tags from `STACKS` in `src/lib/types.ts` that fit, so agents and `search_all` can filter on them;
   - `idFormat`: how to write an id for `get_resource` and `get_code`, unless it is simply a search result's id;
   - `heavy: true` if a search downloads megabytes, makes several rate-limited calls or has a tight quota (`search_all` then skips it unless it is named).

   Record the content's license in each result's `license` (the factories take a `license` option), and return only ids that pass `idSchema` in `src/lib/validate.ts`.
4. **Add offline tests** in `tests/<name>.test.mjs`: small samples captured from the live site, served with `mockFetch` from `tests/helpers.mjs`, covering `search`, `getResource` and the error cases. `tests/sources.test.mjs` checks the metadata contract of every registered source.
5. **Check it live.** The smoke test covers every registered source automatically: run `npm run build`, then `npm run smoke -- <id>`. Add an entry to `HINTS` in `src/smoke.ts` only if the default check (search, then get the first result, then non-empty code) does not fit the source.
6. **Add a row** to the Sources table in the README.

## Code standards

Style guide: TypeScript and JavaScript follow the [Biome recommended rules](https://biomejs.dev/linter/rules/) and the Biome formatter with the settings in `biome.json` (2-space indent, double quotes, semicolons, 100-column lines). Contributions must comply. The coding style is enforced automatically, not by review: **[Biome](https://biomejs.dev/)** (configured in `biome.json`) checks lint rules and formatting, and CI fails if `npm run lint` reports anything. Run `npm run lint:fix` to format your changes. The compiler is also stricter than `strict` (`noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride`).

- **TypeScript strict mode** must stay clean. No `any` in new code without a reason.
- **ESM only**, using `.js` extensions in relative imports (NodeNext resolution).
- **Add tests** for every behavior change (see [Tests](#tests)).
- **Make HTTP requests through `src/lib/fetch.ts`** (`fetchText` / `fetchJson`), not the global `fetch`. It provides caching, per-host throttling and retry with backoff.
- **Be a polite client.** Use a site's public, server-rendered pages or documented API. Do not use endpoints disallowed by its `robots.txt`, and do not try to get around bot protection.
- **Record licensing.** Set `license` and `author` on results when the source provides them, and make sure the content may be redistributed as a reference.
- **No new runtime dependencies** unless there is no reasonable alternative; explain the need in the PR.
- **Do not rename MCP tools or change their schemas** without discussing it in an issue first. Clients depend on them.
- Mark intentional shortcuts with a `ponytail:` comment that names the limit and the upgrade path.

## Sign your work (DCO)

Every commit must certify the [Developer Certificate of Origin](https://developercertificate.org/): that you wrote the change, or otherwise have the right to submit it under the project's MIT license. Certify it by adding a `Signed-off-by` line, which `git commit -s` does for you:

```
Signed-off-by: Your Name <you@example.com>
```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/), for example:

```
feat(sources): add <name> source
fix(freefrontend): update card selectors after site redesign
docs: clarify install instructions
```

## License

By contributing you agree that your contribution is licensed under the project's [MIT License](LICENSE).
