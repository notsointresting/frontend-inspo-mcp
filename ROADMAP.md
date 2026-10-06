# Roadmap

This is what frontend-inspo-mcp plans to do, and deliberately not do, between October 2026 and October 2027. It is reviewed when each minor version is released. Suggestions are welcome in [GitHub issues](https://github.com/notsointresting/frontend-inspo-mcp/issues).

## We intend to

**Keep every source working.** Third-party sites change their markup and APIs without notice; four sources broke that way in 2026. The live smoke test runs on every change, and a broken source is treated as a bug with a regression test.

**Add sources carefully.** New design-system and component sources are added as small adapters (see [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-source)), but only when the site offers a public API or public pages that its `robots.txt` allows, and its content may be reused as reference material.

**Strengthen release integrity.** Publish releases from CI with npm provenance (Sigstore-signed), so users can verify a package was built from this repository (see [RELEASING.md](RELEASING.md)).

**Improve test depth.** Raise branch coverage above 80%, and keep statement coverage above 85% (currently about 92%).

**Grow maintainership.** Name a second maintainer with repository and npm access, so the project no longer depends on one person.

**Track the MCP specification.** Keep up with Model Context Protocol and SDK releases, using current APIs rather than deprecated ones.

## We do not intend to

- **Write or change anything.** All tools stay read-only; no tool will create, modify or delete data anywhere.
- **Host a service.** The project stays a local stdio server. No hosted API, accounts or telemetry.
- **Get around access controls.** We will not scrape content behind logins, paywalls or bot protection, or use endpoints a site's `robots.txt` disallows.
- **Run downloaded code.** Returned code is reference material for the agent and the user; the server never executes it.
- **Store user data.** Apart from an optional local response cache that the user enables, nothing is written to disk.
