# Architecture

frontend-inspo-mcp is a local [Model Context Protocol](https://modelcontextprotocol.io) server. An MCP client (Claude Desktop, Claude Code, Cursor, Kiro, ...) starts it as a child process and talks to it over stdin/stdout. It answers tool calls by reading public frontend and design resources from 27 sources and returning them as JSON.

```
 MCP client (agent)                          frontend-inspo-mcp (local process)
┌──────────────────┐   JSON-RPC over stdio   ┌───────────────────────────────────────────┐
│ Claude / Cursor  │ ──────────────────────▶ │ index.ts   stdio launcher                 │
│ Kiro / ...       │ ◀────────────────────── │ server.ts  6 tools, input validation,     │
└──────────────────┘                         │            response size cap              │
                                             │    │                                      │
                                             │    ▼  SourceAdapter (lib/types.ts)        │
                                             │ sources/*.ts   27 adapters                │
                                             │    │                                      │
                                             │    ▼                                      │
                                             │ lib/fetch.ts   the only network code:     │
                                             │   HTTPS only · per-host throttle · cache  │
                                             │   retry/backoff · timeout · size cap      │
                                             └────┬──────────────────────────────────────┘
                                                  │ HTTPS
                                                  ▼
             shadcn, Magic UI, jsDelivr, GitHub, FreeFrontend, Refero, ... (public sites)
```

## Components

| File | Responsibility |
|---|---|
| `src/index.ts` | Entry point and npm `bin`. Starts the server on a stdio transport. Logs only to stderr, because stdout carries the protocol. |
| `src/server.ts` | `createServer()`: registers the six tools (`list_sources`, `list_categories`, `search_resources`, `search_all`, `get_resource`, `get_code`) with their input schemas, routes each call to the right adapter, turns adapter errors into tool errors, and refuses responses over 1,000,000 characters. All tools are marked read-only. |
| `src/lib/validate.ts` | Allowlist schemas for every client-supplied argument (`id`, `category`, `tech`, `query`). |
| `src/lib/fetch.ts` | All outbound HTTP. HTTPS only, no redirect downgrade, 15-second timeout, 100 MB body cap, per-host request spacing, in-memory cache (10 minutes) plus an optional disk cache, and up to 3 attempts with backoff on 403/429/502/503/504 and network errors. Attaches `GITHUB_TOKEN` to `api.github.com` requests only. |
| `src/lib/types.ts` | The `SourceAdapter` contract and shared result types. |
| `src/sources/*.ts` | One adapter per source, or a factory per family: `registry.ts` (shadcn-style registries, 7 sources), `packages.ts` (jsDelivr and GitHub source trees, 14 sources), plus single adapters for FreeFrontend, Watermelon, LS.GRAPHICS, Refero, ThreeUI and the bundled R3F guide. |
| `src/sources/r3f-content/` | Bundled markdown served by the `r3f` source. Copied into `dist/` by `scripts/copy-assets.mjs`. |
| `src/smoke.ts` | Live check of every source against the real sites (`npm run smoke`). |

## The adapter contract

Every source implements `SourceAdapter`: `listCategories()`, `search(args)` and `getResource(id)`, plus metadata (`id`, `label`, `description`, `homepage`, `hasInlineCode`). The server never touches a source directly; adding a source means writing one adapter and registering it in `server.ts`. The tools' `source` argument is generated from that registry.

Adapters fetch through `lib/fetch.ts` and parse with `cheerio` (HTML) or `JSON.parse`. They return **data only**: downloaded code is placed in a string field and never evaluated.

## Request flow

1. The client sends `tools/call`, for example `get_code {source: "shadcn", id: "button"}`.
2. The SDK validates the arguments against the tool's zod schema. Invalid input is rejected before any adapter runs.
3. `server.ts` calls the adapter, which builds a URL on its fixed host and calls `fetchText` / `fetchJson`.
4. `fetch.ts` serves it from cache, or throttles, fetches over HTTPS and retries if needed.
5. The adapter parses the response into a `ResourceDetail`.
6. `server.ts` serializes it to JSON, checks the size cap, and replies. Any thrown error becomes a tool error with `isError: true`.

## Key design decisions

- **stdio only.** No network listener means no remote attack surface and no authentication to get wrong.
- **One network module.** Security and politeness rules live in one place instead of 27.
- **Read-only, data-only.** The server returns third-party content but never runs it.
- **Public, permitted sources only.** Adapters use documented APIs or public pages that the site's `robots.txt` allows (for example, Refero is read from its public pages because its API is disallowed).
- **Fail loudly on format changes.** A parser that finds nothing it recognizes throws or returns zero results, which the smoke test reports as a HARD failure, instead of silently returning wrong data.

## Build and test

`npm run build` compiles TypeScript (`tsc`, strict) into `dist/` and copies the bundled markdown. `npm test` runs the offline unit tests (`node:test`, with the network faked), `npm run coverage` enforces coverage, `npm run lint` runs Biome, and `npm run check:reproducible` proves two clean builds are byte-identical. CI runs all of them plus the live smoke test on every push.
