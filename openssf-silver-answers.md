# OpenSSF Best Practices: SILVER answers for frontend-inspo-mcp

Project entry: https://www.bestpractices.dev/en/projects/15252 (choose the **Silver** level).
Prepared 2026-10-06 against commit `563494b` on `main` and npm release v0.3.0. Every claim was checked against the repository, GitHub settings or npm.

For each criterion, set the status shown and paste the text in the box below it. Sections follow the order of the form.

## Status at a glance

| Criterion | Status | Blocks silver? |
|---|---|---|
| `access_continuity` | **Unmet** until you add a backup person (see the end of this file) | **Yes (MUST)** |
| `bus_factor` | Unmet | No (SHOULD) |
| `version_tags_signed` | Unmet | No (SUGGESTED) |
| `signed_releases` | Met (v0.3.0 published with provenance) | Done |
| Everything else | Met or N/A | Done |

---

## 1. Basics

### Project oversight

**dco → Met**
```
Contributors certify the Developer Certificate of Origin by signing off each commit (`git commit -s`), as required in CONTRIBUTING.md, which links to https://developercertificate.org/. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/CONTRIBUTING.md#sign-your-work-dco
```

**governance → Met**
```
GOVERNANCE.md documents the maintainer-led governance model: how changes are proposed, how decisions are made and recorded, how disagreements are resolved, and how changes to public interfaces are handled. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/GOVERNANCE.md
```

**code_of_conduct → Met**
```
The project adopts the Contributor Covenant 2.1, posted in the standard location, with a private reporting channel. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/CODE_OF_CONDUCT.md
```

**roles_responsibilities → Met**
```
GOVERNANCE.md defines the key roles (lead maintainer, maintainer, contributor, automation), their responsibilities and the tasks each must perform, and names who holds each role. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/GOVERNANCE.md#roles-and-responsibilities
```

**access_continuity → Unmet (for now)**
```
GOVERNANCE.md documents the continuity plan. Releases no longer depend on one person's keys: since v0.3.0 they are published by CI through npm trusted publishing. A backup person with repository access has not been named yet. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/GOVERNANCE.md#continuity
```
After you add a backup person, switch to **Met** and fill in the name and handle:
```
GOVERNANCE.md documents the continuity plan. <NAME> (@<handle>) has write access to the repository and is the lead maintainer's designated GitHub account successor, and releases are published by CI through npm trusted publishing (no personal npm credentials needed), so issues, changes and releases can continue within a week if any one person is unavailable. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/GOVERNANCE.md#continuity
```

**bus_factor → Unmet** (SHOULD; does not block the badge)
```
The project currently has one active maintainer. GOVERNANCE.md and ROADMAP.md commit to adding a second maintainer. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/GOVERNANCE.md#continuity
```

### Documentation

**documentation_roadmap → Met**
```
ROADMAP.md describes what the project intends to do, and not do, from October 2026 to October 2027. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/ROADMAP.md
```

**documentation_architecture → Met**
```
ARCHITECTURE.md documents the high-level design: components, the adapter contract, the request flow, key design decisions, and the build and test setup. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/ARCHITECTURE.md
```

**documentation_security → Met**
```
SECURITY.md ("What you can expect in terms of security") and docs/security-assurance-case.md (security requirements R1-R9 and what is out of scope) document what users can and cannot expect. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/docs/security-assurance-case.md
```

**documentation_quick_start → Met**
```
The README's "Install from npm" section is a quick start: one JSON block for Claude Desktop, Claude Code or Cursor that runs the server with npx, followed by example tool calls. https://github.com/notsointresting/frontend-inspo-mcp#readme
```

**documentation_current → Met**
```
Documentation is kept in step with the code: known defects (the project layout, the Refero description, the source count and the Node version) were corrected in commit 11c3deb, and changes that affect behavior update the README, ARCHITECTURE.md or CONTRIBUTING.md in the same pull request.
```

**documentation_achievements → Met**
```
The README links the OpenSSF Best Practices badge in its badge row. https://github.com/notsointresting/frontend-inspo-mcp#readme
```

### Accessibility and internationalization

**accessibility_best_practices → N/A**
```
The software is a stdio MCP server with no user interface; it returns JSON to an AI client. The project sites are GitHub and npm, whose accessibility is maintained by those platforms, and the documentation is plain Markdown with text alternatives for badges.
```

**internationalization → N/A**
```
The software produces JSON for AI agents, not text for end users, and does not sort human-readable text, so internationalization does not apply.
```

### Other

**sites_password_security → N/A**
```
The project sites are GitHub and npm; the project itself stores no passwords.
```

---

## 2. Change Control

**maintenance_or_update → Met**
```
Only the latest release is supported, and the upgrade path is documented: `npx -y frontend-inspo-mcp` always runs the latest version, or `npm install frontend-inspo-mcp@latest`. Versions follow SemVer, and breaking changes come with upgrade steps in the release notes (for example, v0.3.0 documents the Node 20.18.1 requirement). https://github.com/notsointresting/frontend-inspo-mcp/blob/main/GOVERNANCE.md#releases-versioning-and-upgrades
```

---

## 3. Reporting

**report_tracker → Met** (if the form shows it)
```
The project uses GitHub Issues: https://github.com/notsointresting/frontend-inspo-mcp/issues
```

**vulnerability_report_credit → N/A**
```
No vulnerability reports have been resolved in the last 12 months. The policy is to credit every reporter unless they ask to stay anonymous. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/SECURITY.md#credit
```

**vulnerability_response_process → Met**
```
SECURITY.md documents the response process: acknowledge within 48 hours, triage within 7 days, fix privately with a regression test (target 30 days for medium or higher severity), release, publish an advisory with a CVE when exploitable, and credit the reporter. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/SECURITY.md#how-we-respond
```

---

## 4. Quality

### Coding standards

**coding_standards → Met**
```
CONTRIBUTING.md identifies the style guide: the Biome recommended lint rules and the Biome formatter with the settings in biome.json, and requires contributions to comply. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/CONTRIBUTING.md#code-standards
```

**coding_standards_enforced → Met**
```
Biome enforces lint and formatting automatically: `npm run lint` runs in CI on every push and pull request and fails the build on any finding.
```

### Working build system

**build_standard_variables → N/A**
```
The project produces no native binaries; it compiles TypeScript to JavaScript.
```

**build_preserve_debug → N/A**
```
The build compiles TypeScript to readable JavaScript; there is no install step that strips debugging information.
```

**build_non_recursive → Met**
```
The build is a single tsc invocation over the whole project plus one asset copy; it does not recursively build subdirectories.
```

**build_repeatable → Met**
```
Builds are bit-for-bit reproducible. scripts/check-reproducible.mjs builds twice from a clean dist/ and compares SHA-256 hashes of every file, and CI runs it on every push. Line endings are pinned with .gitattributes so builds match across operating systems.
```

### Installation system

**installation_common → Met**
```
Install with `npm install frontend-inspo-mcp` (or run it with `npx -y frontend-inspo-mcp`); uninstall with `npm uninstall frontend-inspo-mcp`.
```

**installation_standard_variables → Met**
```
Installation uses npm, which honors its standard location conventions (the npm prefix and global/local install locations); the project adds no custom install logic.
```

**installation_development_quick → Met**
```
Developers set up the full environment with `git clone`, `npm ci`, then `npm test`, as documented in CONTRIBUTING.md. The test tools (node:test, c8 and Biome) are installed by npm ci.
```

### Externally-maintained components

**external_dependencies → Met**
```
Dependencies are listed in machine-readable form in package.json, with exact resolved versions in package-lock.json. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/package.json
```

**dependency_monitoring → Met**
```
Dependabot checks npm and GitHub Actions dependencies weekly, GitHub reports dependency alerts (0 open), `npm audit` reports 0 vulnerabilities, and CodeQL runs on every push.
```

**updateable_reused_components → Met**
```
All reused components are standard npm packages declared in package.json; there are no vendored or copied components, so updates are a version bump (usually opened by Dependabot).
```

**interfaces_current → Met**
```
The project avoids deprecated APIs: tool registration was migrated from the deprecated McpServer.tool() to registerTool() for MCP SDK 1.32, and the build and tests run without deprecation warnings.
```

### Automated test suite

**automated_integration_testing → Met**
```
GitHub Actions runs lint, the unit tests with coverage, the reproducibility check and the live smoke test on every push and pull request to main, and reports pass/fail for each step. https://github.com/notsointresting/frontend-inspo-mcp/actions
```

**regression_tests_added50 → Met**
```
All bugs fixed in the last six months have regression tests: the Watermelon unsupported kind (tests/watermelon.test.mjs), the FreeFrontend parser after the redesign and the URL host check (tests/freefrontend.test.mjs), LS.GRAPHICS HTTP-500 pages (tests/lsgraphics.test.mjs), the Refero page format (tests/refero.test.mjs), and the wrong version in the MCP handshake (tests/server.test.mjs). Each was confirmed to fail when its bug is reintroduced.
```

**test_statement_coverage80 → Met**
```
Statement coverage is 92% (c8 over the built code), and CI fails if it drops below 85% (`npm run coverage`, thresholds in .c8rc.json).
```

### New functionality testing

**test_policy_mandated → Met**
```
CONTRIBUTING.md states a mandatory policy: new functionality and bug fixes MUST come with automated tests, and coverage must stay at or above the enforced thresholds. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/CONTRIBUTING.md#tests
```

**tests_documented_added → Met**
```
The test policy is in CONTRIBUTING.md, the instructions for change proposals, including the step to add a test file for every new source. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/CONTRIBUTING.md#tests
```

### Warning flags

**warnings_strict → Met**
```
TypeScript runs in strict mode plus noUncheckedIndexedAccess, noUnusedLocals, noUnusedParameters, noImplicitReturns, noFallthroughCasesInSwitch and noImplicitOverride, and Biome's recommended rules are enforced in CI. The build has no warnings.
```

---

## 5. Security

### Secure development knowledge

**implement_secure_design → Met**
```
Secure design principles are implemented and documented in section 4 of the assurance case: least privilege (read-only tools, read-only CI token, GitHub token sent only to api.github.com), economy of mechanism (all network code in one module), minimal attack surface (stdio only, no network listener, no shell or eval), fail-safe defaults, complete mediation (allowlist validation on every argument), defense in depth and open design. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/docs/security-assurance-case.md
```

### Use basic good cryptographic practices

**crypto_weaknesses → Met** (if the form shows it)
```
No security mechanism depends on a weak algorithm. TLS is provided by Node.js defaults, and the only hash in the code is SHA-256, used to name local cache files.
```

**crypto_algorithm_agility → N/A**
```
The project implements no cryptographic mechanisms of its own; TLS algorithm negotiation is handled by the Node.js runtime.
```

**crypto_credential_agility → Met**
```
The only credential, an optional GITHUB_TOKEN, is read from the environment at request time, kept separate from code and configuration, and can be changed or removed without recompiling. It is never written to files, logs or responses.
```

**crypto_used_network → Met**
```
All network communication uses HTTPS. src/lib/fetch.ts refuses plain-HTTP URLs and redirects that downgrade to HTTP (loopback is allowed only for tests); this is tested in tests/fetch-hardening.test.mjs.
```

**crypto_tls12 → Met**
```
Node.js's default minimum TLS version is 1.2, and the project does not lower it.
```

**crypto_certificate_verification → Met**
```
TLS certificate verification uses the Node.js default (enabled); the project never disables it (no rejectUnauthorized or NODE_TLS_REJECT_UNAUTHORIZED override anywhere in the code).
```

**crypto_verification_private → Met**
```
The certificate is verified during the TLS handshake, before any HTTP headers (including the optional Authorization header) are sent.
```

### Secure release

**signed_releases → Met**
```
Releases are cryptographically signed. Since v0.3.0 they are published from GitHub Actions with npm trusted publishing (OIDC), which attaches a Sigstore-signed SLSA provenance attestation recorded in the public transparency log (v0.3.0: https://search.sigstore.dev/?logIndex=3107177963). The signing keys are ephemeral and held by Sigstore and npm, not on any site the project uses to distribute software. RELEASING.md documents how users verify releases with `npm audit signatures` and where the public keys are. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/RELEASING.md
```

**version_tags_signed → Unmet** (SUGGESTED; does not block the badge)
```
Release tags are created on GitHub and are not individually GPG-signed; release integrity is provided by npm provenance attestations instead.
```

### Other security issues

**input_validation → Met**
```
All inputs from potentially untrusted sources are checked against allowlists and invalid input is rejected: the source is an enum; id, category and tech must match allowlist patterns with length caps (no '.', '..' or '//' segments, no URL metacharacters); query and numeric limits are bounded. Upstream responses are size-capped and parsed as data only. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/src/lib/validate.ts
```

**hardening → Met**
```
Hardening: HTTPS-only requests with no redirect downgrade, a 15-second request timeout, a 100 MB response cap enforced while streaming, a 1,000,000-character tool response cap, bounded retries, a GitHub token scoped to one host, read-only tools, a read-only CI token, and stricter-than-strict TypeScript.
```

**assurance_case → Met**
```
docs/security-assurance-case.md is the assurance case: the threat model (assets, actors, threats T1-T7), trust boundaries (B1-B3), the secure design principles applied, an argument with evidence that each requirement R1-R9 is met, and countermeasures for common weaknesses (CWE-22, 918, 74/94, 20, 400, 319, 522, 1104). https://github.com/notsointresting/frontend-inspo-mcp/blob/main/docs/security-assurance-case.md
```

---

## 6. Analysis

**static_analysis_common_vulnerabilities → Met** (if the form shows it)
```
GitHub CodeQL, which includes rules for common vulnerabilities, runs on every push and weekly, along with Biome's lint rules.
```

**dynamic_analysis_unsafe → N/A** (if the form shows it)
```
The project is written in TypeScript, a memory-safe language, and contains no C or C++.
```

---

## Finishing the last blocker: access_continuity

A co-maintainer is **not** required: you need one trusted person who could step in. Releases publish from CI, so they do not need your npm account.

1. **Collaborator (covers illness, being busy, or stepping away):** on GitHub, open the repository's **Settings → Collaborators → Add people** and give them the **Write** role (or Admin). They can then triage issues, merge pull requests and release by creating a version tag.
2. **Account successor (covers death):** in your GitHub account, open **Settings → Account → Successor settings** and invite the same person.
3. **Optional, npm admin:** `npm owner add <their-npm-username> frontend-inspo-mcp` (2FA prompt), so the package settings are not stranded.
4. Send their name and GitHub handle, and GOVERNANCE.md will be updated (the roles table and the continuity status).
5. Switch `access_continuity` to Met using the "after" text in section 1.
