# Roadmap

This is what frontend-inspo-mcp plans to do, and deliberately not do, between October 2026 and October 2027. It is reviewed when each minor version is released. Suggestions are welcome in [GitHub issues](https://github.com/notsointresting/frontend-inspo-mcp/issues).

## We intend to

**Keep every source working.** Third-party sites change their markup and APIs without notice; four sources broke that way in 2026. The live smoke test runs every night, outside CI, and keeps one issue labelled `smoke-failure` open while any source fails (the next passing run closes it). A broken source is treated as a bug with a regression test.

**Add sources carefully.** New design-system and component sources are added as small adapters (see [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-source)), but only when the site offers a public API or public pages that its `robots.txt` allows, and its content may be reused as reference material.

**Keep release integrity.** Every release is published from CI with npm provenance (Sigstore-signed), starting with v0.3.0, so users can verify a package was built from this repository (see [RELEASING.md](RELEASING.md)). Next step: sign release tags as well.

**Improve test depth.** Branch coverage is enforced at 70%. Raise that threshold as tests are added, and never lower it, until it reaches 80%; keep statement coverage above 85% (currently about 92%).

**Grow maintainership.** Name a second maintainer with repository and npm access, so the project no longer depends on one person.

**Move to MCP SDK v2 by the end of Q1 2027.** The current specification is [2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog), which makes MCP stateless: there is no initialize handshake, and every request carries its own protocol version and client capabilities. SDK v2 implements it; it shipped as `@modelcontextprotocol/server` 2.0.0 on 2026-07-27 (2.3.1 is current). This project still uses v1 (`@modelcontextprotocol/sdk` 1.x), which gets bug and security fixes for at least six months after the v2 release, so until late January 2027 at the earliest. The plan: run the official codemod (`npx @modelcontextprotocol/codemod@latest v1-to-v2 .`), which moves the imports to the v2 packages and wraps the raw Zod shapes of the tool and prompt schemas in `z.object()`; fix whatever it marks with `@mcp-codemod-error`; and keep tool names, arguments and responses unchanged, so clients need no changes.

## We do not intend to

- **Write or change anything.** All tools stay read-only; no tool will create, modify or delete data anywhere.
- **Host a service.** The project stays a local stdio server. No hosted API, accounts or telemetry.
- **Get around access controls.** We will not scrape content behind logins, paywalls or bot protection, or use endpoints a site's `robots.txt` disallows.
- **Run downloaded code.** Returned code is reference material for the agent and the user; the server never executes it.
- **Store user data.** Apart from an optional local response cache that the user enables, nothing is written to disk.
