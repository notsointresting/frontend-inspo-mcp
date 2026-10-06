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

- **Releases do not depend on any one person's keys.** Since v0.3.0, npm releases are published by CI through npm trusted publishing (see [RELEASING.md](RELEASING.md)). Anyone with write access to this repository can release by creating a version tag; no npm password or token is needed.
- **Repository access:** a trusted backup person holds write or admin access to the repository as a collaborator, so they can triage issues, merge pull requests and cut releases straight away if the lead maintainer is unavailable for any reason.
- **Ownership:** the backup is also named as the lead maintainer's GitHub account successor, so they can take over or transfer the repository if the lead maintainer dies.
- **npm package administration** (owners, settings): the backup is added with `npm owner add`, so the package itself is not stranded.
- **Everything else** (source, CI, tests, documentation and this plan) is public in the repository.

> **Status:** a backup person has not been named yet. Until one is, the project's bus factor is 1.

## Releases, versioning and upgrades

- Versions follow [Semantic Versioning](https://semver.org/). Breaking changes to tool names, arguments or response shapes only happen in a major release and are called out in the release notes with upgrade steps.
- Only the latest release is supported (see [SECURITY.md](SECURITY.md)). Upgrading is `npx -y frontend-inspo-mcp` (always the latest) or `npm install frontend-inspo-mcp@latest`.
- Each release has human-written release notes on [GitHub Releases](https://github.com/notsointresting/frontend-inspo-mcp/releases).

## Changing this document

Changes to governance are made by pull request and must be approved by the lead maintainer.
