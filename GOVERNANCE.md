# Governance

## Model

frontend-inspo-mcp uses a **maintainer-led** governance model. The maintainers decide what is merged and released, guided by the [roadmap](ROADMAP.md), the [contribution requirements](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md). The project is small, so decisions are informal, but they are always made in public:

- **Changes** are proposed and discussed in GitHub issues and pull requests.
- **Decisions** are recorded in those threads. A pull request is merged when a maintainer approves it and CI is green.
- **Disagreements** are settled by discussion. If the maintainers cannot agree, the lead maintainer decides and explains why in the thread.
- **Changes to public interfaces** (MCP tool names, tool arguments, or response shapes) need an issue first, because MCP clients depend on them.

## Roles and responsibilities

| Role | Who | Responsibilities |
|---|---|---|
| Lead maintainer | Sahil ([@notsointresting](https://github.com/notsointresting)) | Sets direction and the roadmap; reviews and merges pull requests; cuts releases and publishes to npm; triages issues; handles security reports under [SECURITY.md](SECURITY.md); enforces the code of conduct; owns the npm package and the repository settings. |
| Maintainer | *(open; see [Continuity](#continuity))* | Same as the lead maintainer, except changes to governance itself. |
| Contributor | Anyone | Opens issues and pull requests that follow [CONTRIBUTING.md](CONTRIBUTING.md). |
| Automation | Dependabot, CodeQL, GitHub Actions | Propose dependency updates, scan code, and run CI on every change. Their changes are reviewed and merged by a maintainer. |

**Becoming a maintainer:** contributors with a record of good pull requests and reviews may be invited by the lead maintainer. The invitation and its acceptance happen in a public issue, and this file is updated.

## Continuity

The project must be able to keep going if any one person stops working on it. In particular, someone else must be able to create and close issues, accept changes, and publish a release within a week. The plan:

- **Repository:** at least one other trusted person has admin access to the GitHub repository.
- **npm:** the same person is an owner of the `frontend-inspo-mcp` npm package.
- **Releases** are built and published by CI (see [RELEASING.md](RELEASING.md)), so publishing does not depend on one person's machine or keys.
- **Everything else** (source, CI, tests, documentation and this plan) is public in the repository.

> **Status:** a backup maintainer has not been named yet. Until one is, the project's bus factor is 1.

## Releases, versioning and upgrades

- Versions follow [Semantic Versioning](https://semver.org/). Breaking changes to tool names, arguments or response shapes only happen in a major release and are called out in the release notes with upgrade steps.
- Only the latest release is supported (see [SECURITY.md](SECURITY.md)). Upgrading is `npx -y frontend-inspo-mcp` (always the latest) or `npm install frontend-inspo-mcp@latest`.
- Each release has human-written release notes on [GitHub Releases](https://github.com/notsointresting/frontend-inspo-mcp/releases).

## Changing this document

Changes to governance are made by pull request and must be approved by the lead maintainer.
