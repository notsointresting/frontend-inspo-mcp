# Contributing to frontend-inspo-mcp

Thanks for helping! This project is a small MCP server; most contributions are either a **new source** or a **fix for a source whose website changed**.

## How to contribute

- **Bugs and feature requests:** open a [GitHub issue](https://github.com/notsointresting/frontend-inspo-mcp/issues). For a broken source, include the `source`, the tool call you made, and the error.
- **Code changes:** fork the repo, branch from `main`, and open a pull request. Keep each PR to one change. Maintainers review PRs and merge once CI is green.
- **Security problems:** do not open a public issue. Follow [SECURITY.md](SECURITY.md).

## Set up

Requires Node 18 or newer.

```bash
git clone https://github.com/<your-fork>/frontend-inspo-mcp.git
cd frontend-inspo-mcp
npm ci
npm run build
```

## Before you open a PR

All of these must pass; CI runs the same steps.

```bash
npm run lint    # Biome: lint + format check (fix with `npm run lint:fix`)
npm run build   # tsc in strict mode, must have no errors
npm test        # offline unit tests (builds first); no network needed
npm run smoke   # live check of every source (needs network)
```

## Tests

The unit tests live in `tests/*.test.mjs` and use Node's built-in test runner (`node:test`), so there is nothing extra to install. They run offline: adapters are tested against small saved HTML/JSON samples by replacing `fetch` with a fake (see `tests/helpers.mjs`), so they are fast and do not depend on live websites.

**Testing policy:** new functionality and bug fixes must come with tests in `tests/`. For a bug fix, add a test that fails without the fix. For a new source, add a test file with a representative sample of the site's HTML/JSON and assert on `search`, `getResource` and the error cases. A PR that adds behavior without tests will be asked to add them before merging.

## Smoke test

`npm run smoke` hits real websites. It prints a per-source PASS/FAIL table and classifies failures:

- **HARD** (0 results, missing code, HTTP 4xx, changed page format): a parser or contract is broken. Fix the adapter; do not loosen the assertion.
- **TRANSIENT** (rate limit, network error): retried automatically. Set `GITHUB_TOKEN` to avoid GitHub's 60 requests/hour limit for the GitHub-backed sources.

## Adding a source

1. Add the id to the `SourceId` union in `src/lib/types.ts`.
2. Create `src/sources/<name>.ts` exporting a `SourceAdapter` (see the contract in `src/lib/types.ts`): `id`, `label`, `description`, `homepage`, `hasInlineCode`, `listCategories()`, `search()` and `getResource()`. Shadcn-style registries can reuse the factory in `src/sources/registry.ts`.
3. Register it in the `ADAPTERS` map in `src/index.ts`. The `source` argument of every tool is generated from that map, so no tool name or schema needs editing.
4. Add a check in `src/smoke.ts` that covers `search` and, for code-bearing sources, `getResource` returning non-empty code.
5. Add `tests/<name>.test.mjs` with an offline sample of the site's markup or JSON (see the existing files for the pattern).
6. Add a row to the Sources table in the README.

## Code standards

The coding style is enforced automatically, not by review: **[Biome](https://biomejs.dev/)** (configured in `biome.json`) checks lint rules and formatting, and CI fails if `npm run lint` reports anything. Run `npm run lint:fix` to format your changes. The compiler is also stricter than `strict` (`noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride`).

- **TypeScript strict mode** must stay clean. No `any` in new code without a reason.
- **ESM only**, using `.js` extensions in relative imports (NodeNext resolution).
- **Add tests** for every behavior change (see [Tests](#tests)).
- **Make HTTP requests through `src/lib/fetch.ts`** (`fetchText` / `fetchJson`), not the global `fetch`. It provides caching, per-host throttling and retry with backoff.
- **Be a polite client.** Use a site's public, server-rendered pages or documented API. Do not use endpoints disallowed by its `robots.txt`, and do not try to get around bot protection.
- **Record licensing.** Set `license` and `author` on results when the source provides them, and make sure the content may be redistributed as a reference.
- **No new runtime dependencies** unless there is no reasonable alternative; explain the need in the PR.
- **Do not rename MCP tools or change their schemas** without discussing it in an issue first. Clients depend on them.
- Mark intentional shortcuts with a `ponytail:` comment that names the limit and the upgrade path.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/), for example:

```
feat(sources): add <name> source
fix(freefrontend): update card selectors after site redesign
docs: clarify install instructions
```

## License

By contributing you agree that your contribution is licensed under the project's [MIT License](LICENSE).
