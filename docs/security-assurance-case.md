# Security requirements and assurance case

This document states what users can expect from frontend-inspo-mcp in terms of security, the threat model, the trust boundaries, and the argument (with evidence) that the requirements are met. The architecture it refers to is described in [ARCHITECTURE.md](../ARCHITECTURE.md).

## 1. Security requirements

| ID | Requirement |
|---|---|
| R1 | The server must not modify any data, locally or remotely. All tools are read-only. |
| R2 | The server must not execute code, shell commands or markup it downloads or receives. |
| R3 | The server must not be reachable over the network. It communicates only over stdio with the process that started it. |
| R4 | Every client-supplied argument must be validated against an allowlist before use. |
| R5 | Outbound requests must go only to the fixed set of source hosts, over HTTPS with certificate verification. |
| R6 | Credentials (`GITHUB_TOKEN`) must be read from the environment, sent only to `api.github.com`, and never logged, stored or returned. |
| R7 | Resource use must be bounded: request timeouts, response size caps, and bounded retries. |
| R8 | The server must be a polite client: per-host throttling and caching, and no use of endpoints that a site's `robots.txt` disallows. |
| R9 | Dependencies and the build must be monitored for known vulnerabilities. |

**Not in scope.** The server does not vouch for the content of third-party sites. Code it returns is untrusted reference material that users and agents must review before running.

## 2. Threat model

**Assets:** the user's machine and files; the user's `GITHUB_TOKEN`, if set; the integrity of answers given to the agent; and the availability of the third-party sites.

**Actors and threats:**

| Threat | Actor | Example |
|---|---|---|
| T1. Malicious tool arguments | A prompt-injected agent, or a malicious MCP client | `id: "../../etc/passwd"`, `id: "x?redirect=..."`, or a 10 MB query string |
| T2. Malicious or compromised upstream content | A compromised source site or CDN | HTML or JSON crafted to exploit the parser, a huge response, or a redirect to HTTP |
| T3. Network attacker | Someone on the user's network | Read or alter traffic to source sites |
| T4. Token theft | Any of the above | Get `GITHUB_TOKEN` sent to a host the attacker controls |
| T5. Resource exhaustion | A malicious client or upstream | Endless retries, huge payloads, or slow responses that hang the agent |
| T6. Supply-chain compromise | Attacker in a dependency or the build | A malicious package version, or a tampered build |
| T7. Abuse of third-party sites | The server itself, if misused | Hammering a site with requests |

## 3. Trust boundaries

```
 [ MCP client / LLM ]  --(B1: stdio JSON-RPC)-->  [ frontend-inspo-mcp ]  --(B2: HTTPS)-->  [ third-party sites ]
                                                          |
                                                  (B3: environment)  GITHUB_TOKEN, cache settings
```

- **B1, client to server:** everything arriving here is untrusted, because the LLM generating the tool calls may be acting on injected text. Controlled by R4 and R7.
- **B2, server to sites:** everything coming back is untrusted. Controlled by R2, R5 and R7.
- **B3, environment:** set by the user who launched the server, so trusted. Controlled by R6.

## 4. Secure design principles applied

- **Least privilege.** Tools are read-only (R1). The CI token is limited to `contents: read`. The GitHub token is optional and only reaches the one host that needs it (R6).
- **Economy of mechanism.** About 2,600 lines of TypeScript. One module (`src/lib/fetch.ts`) holds all network code, so its rules cannot be bypassed by an individual adapter.
- **Minimal attack surface.** No network listener (R3), no shell or `eval` (R2), and three runtime dependencies (`@modelcontextprotocol/sdk`, `cheerio`, `zod`).
- **Fail-safe defaults.** Unknown sources are rejected by an enum. Validation failures and upstream errors become tool errors rather than crashes. Unrecognized page formats make adapters throw instead of guessing.
- **Complete mediation.** Every argument passes schema validation, and every request passes through `fetch.ts`.
- **Defense in depth.** Even after validation, ids are only ever placed on a fixed host's path, and bundled documents are served from a fixed allow-list of files.
- **Open design.** All code, tests, CI and this document are public.

## 5. Argument that the requirements are met

| Req. | How it is met | Evidence |
|---|---|---|
| R1 | No tool performs a write. All six are registered with `readOnlyHint: true`. The only local write is the optional disk cache, which the user enables with `FRONTEND_INSPO_CACHE_DIR`. | `src/server.ts`; `tests/server.test.mjs` ("all read-only") |
| R2 | No `eval`, `Function`, `child_process` or shell use in `src/`. HTML is parsed with cheerio into data; JSON with `JSON.parse`. Code is returned as strings. | `src/` (searchable); CodeQL on every push |
| R3 | The only transport is `StdioServerTransport`. No `listen()` call exists. | `src/index.ts`; `tests/stdio.test.mjs` |
| R4 | zod schemas: `source` is an enum; `id`, `category` and `tech` match allowlist regexes with length caps; ids may not contain `.`/`..` segments or `//`; `query` is length-capped; numeric limits are bounded. The rules were checked against every id and category from all 27 live sources. | `src/lib/validate.ts`; `tests/validate.test.mjs`; `tests/server.test.mjs` ("rejects malformed input") |
| R5 | Adapters build URLs on hard-coded hosts. `fetch.ts` refuses non-HTTPS URLs and redirects that downgrade to HTTP. TLS uses Node.js defaults: certificates verified, minimum TLS 1.2. Nothing disables verification. | `src/lib/fetch.ts`; `tests/fetch-hardening.test.mjs` |
| R6 | The token is read from `process.env` per request and attached only when the host is exactly `api.github.com`. It is never logged or included in any response. | `src/lib/fetch.ts` (`requestHeaders`); `tests/github-token.test.mjs` |
| R7 | 15-second request timeout; 100 MB response cap enforced while streaming; 1,000,000-character tool response cap; at most 3 attempts, with waits capped at 30 seconds. | `src/lib/fetch.ts`, `src/server.ts`; `tests/fetch.test.mjs`, `tests/fetch-hardening.test.mjs`, `tests/server.test.mjs` |
| R8 | At least 400 ms between requests to the same host; 10-minute cache; Refero is read from its public pages because its `/api/` path is disallowed by `robots.txt`. | `src/lib/fetch.ts`; `src/sources/refero.ts` |
| R9 | Lockfile with `npm ci`; Dependabot weekly for npm and GitHub Actions; `npm audit`; CodeQL on every push and weekly; GitGuardian on pull requests; reproducible-build check in CI. | `.github/`; `scripts/check-reproducible.mjs` |

## 6. Common weaknesses and how they are countered

| Weakness (CWE) | Countermeasure |
|---|---|
| Path traversal (CWE-22) | Ids may not contain `.`, `..` or `//` segments; the R3F documents are looked up by id in a fixed list, never by path. |
| URL / host confusion, SSRF (CWE-918) | Fixed base hosts; link hosts are compared by exact parsed hostname (this fixed a CodeQL finding and has a regression test). |
| Injection (CWE-74, CWE-94) | No code execution; output is JSON-serialized data. |
| Improper input validation (CWE-20) | Allowlist schemas at the trust boundary (R4). |
| Uncontrolled resource consumption (CWE-400) | Timeouts and size caps (R7); bounded retries. |
| Cleartext transmission (CWE-319) | HTTPS only, with no downgrade (R5). |
| Credential exposure (CWE-522, CWE-200) | Token scoped to one host and never logged (R6); secret scanning. |
| Vulnerable components (CWE-1104) | Dependency monitoring (R9). |

## 7. Known limitations

- Upstream content is not sanitized for meaning: a compromised source could return misleading or malicious code. It is labelled as third-party reference material, and the source and license are included with each result.
- The optional disk cache stores responses unencrypted in a directory the user chooses.
- Some upstream behavior cannot be controlled. For example, LS.GRAPHICS asset pages currently answer HTTP 500 with a valid page, which is accepted explicitly for that one host.
