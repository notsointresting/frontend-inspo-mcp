# OpenSSF Best Practices Badge: answers for frontend-inspo-mcp

Project entry: https://www.bestpractices.dev/en/projects/15252
Prepared: 2026-10-06, for `frontend-inspo-mcp` (commit `ba8b01a` on `main`, after the unit-test suite was added; last npm release v0.2.1).

How to use this file: for each criterion, set the status shown and paste the justification. Everything below was checked against the repository, GitHub settings or npm on the date above. Three kinds of entry need your attention and are marked:

- **NEEDS YOUR ATTESTATION**: only you can truthfully answer it (developer knowledge).
- **UNMET**: honestly not met. Only SUGGESTED dynamic-analysis rows remain Unmet; none of them blocks the badge.
- **N/A**: does not apply to this project.

## Summary

| Section | Status | Notes |
|---|---|---|
| Basics (13) | All Met | Already entered. |
| Change Control (9) | All Met or N/A | `release_notes` needs a manual Met: the auto-check looks for a file, but the notes are on the GitHub release. |
| Reporting (8) | All Met | No issues have ever been filed, so the "respond" criteria apply vacuously. |
| Quality (13) | All Met | Offline unit-test suite (24 tests) added and run in CI. |
| Security (16) | Met or N/A, plus 2 attestations | `know_secure_design` and `know_common_errors` are yours to answer. |
| Analysis (8) | Mostly Met; dynamic analysis Unmet (SUGGESTED only) | CodeQL covers static analysis. |

The only things left for the "passing" badge are your two attestations (`know_secure_design`, `know_common_errors`) and setting `release_notes` to Met by hand.

---

## 1. Basics (13/13)

### General

| Field | Value |
|---|---|
| Project name | frontend-inspo-mcp |
| Brief description | Local MCP server that lets AI coding agents (Claude, Cursor, Kiro) discover and pull real frontend code & UI components from FreeFrontend, shadcn/ui, Magic UI, Aceternity UI, React Bits, Watermelon UI, and LS.GRAPHICS. |
| Language of entry | English (en) |
| Project URL | https://github.com/notsointresting/frontend-inspo-mcp |
| Repository URL | https://github.com/notsointresting/frontend-inspo-mcp |
| License | MIT |
| Programming languages | TypeScript, JavaScript |
| CPE name | (none; leave blank) |

Other general comments:

```markdown
frontend-inspo-mcp is a Model Context Protocol (MCP) server, MIT licensed, published on npm.
It gives AI coding agents search and real source code from 27 open frontend/design sources.
Install: `npx -y frontend-inspo-mcp`. Maintained by a single maintainer; CI, Dependabot and CodeQL run on every change.
```

Note: the auto-filled brief description lists only 7 of the 27 sources. Consider updating the GitHub repo description so the badge text matches.

### Basic project website content

**description_good**: Met
```
The README's opening paragraph states what it does and the problem it solves: it lets AI coding agents search and pull real frontend code, UI components and design mockups from 27 sources.

https://github.com/notsointresting/frontend-inspo-mcp#readme
```

**interact**: Met
```
The README has an "Install from npm" section (npx) and a Quick start for building from source. Bugs and enhancements go to GitHub Issues (https://github.com/notsointresting/frontend-inspo-mcp/issues), security reports follow SECURITY.md, and contributions are via pull requests (README "Contributing" section).
```

**contribution**: Met
```
The contribution process is documented in CONTRIBUTING.md: fork the repo, branch from main, open a pull request (one change per PR), and maintainers review and merge once CI is green. Bugs and feature requests go through GitHub Issues; security reports follow SECURITY.md. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/CONTRIBUTING.md
```

**contribution_requirements**: Met
```
CONTRIBUTING.md lists the requirements for acceptable contributions: TypeScript strict mode must stay clean; ESM with NodeNext imports; all HTTP requests go through src/lib/fetch.ts; respect each site's robots.txt and bot protection; record licenses on results; no new runtime dependencies without justification; MCP tool names and schemas must not change; Conventional Commit messages. Every PR must pass `npm run build`, `node scripts/check-fetch.mjs` and `npm run smoke` (the same steps CI runs). It also gives step-by-step instructions for adding a new source. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/CONTRIBUTING.md
```

### FLOSS license

**floss_license**: Met
```
The MIT license is approved by the Open Source Initiative (OSI).
```

**floss_license_osi**: Met
```
The MIT license is approved by the Open Source Initiative (OSI).
```

**license_location**: Met
```
Non-trivial license location file in repository: <https://github.com/notsointresting/frontend-inspo-mcp/blob/main/LICENSE>.
```

### Documentation

**documentation_basics**: Met (the auto-check says "no appropriate folder", so set it manually)
```
The README documents installation, client setup (Claude Desktop, Claude Code, Cursor), usage examples and project layout.
https://github.com/notsointresting/frontend-inspo-mcp#readme
```

**documentation_interface**: Met
```
The README "Tools" section lists all six MCP tools (list_sources, list_categories, search_resources, search_all, get_resource, get_code) with their arguments (source, query, category, tech, limit, id) and example inputs. Output is JSON.
https://github.com/notsointresting/frontend-inspo-mcp#readme
```

### Other

**sites_https**: Met
```
Given only https: URLs.
```

**discussion**: Met
```
GitHub supports discussions on issues and pull requests.
```

**english**: Met
```
All documentation, code comments and issue handling are in English.
```

**maintained**: Met
```
Active: v0.2.1 was released to npm and GitHub in October 2026, CI runs on every push, and Dependabot and CodeQL are enabled. Single maintainer.
```

---

## 2. Change Control

### Public version-controlled source repository

**repo_public**: Met
```
Repository on GitHub, which provides public git repositories with URLs.
```

**repo_track**: Met
```
Repository on GitHub, which uses git. git can track the changes, who made them, and when they were made.
```

**repo_interim**: Met
```
The full commit history is public, including work-in-progress commits between releases (for example the fix/chore/docs commits on main between v0.2.0 and v0.2.1): https://github.com/notsointresting/frontend-inspo-mcp/commits/main
```

**repo_distributed**: Met
```
Repository on GitHub, which uses git. git is distributed.
```

### Unique version numbering

**version_unique**: Met
```
Each release has a unique version in package.json (0.2.0, then 0.2.1), and npm does not allow a version to be published twice.
```

**version_semver**: Met
```
Releases use Semantic Versioning (MAJOR.MINOR.PATCH), e.g. 0.2.1.
```

**version_tags**: Met
```
Releases are identified by git tags: v0.2.1 (https://github.com/notsointresting/frontend-inspo-mcp/releases/tag/v0.2.1). The earlier 0.2.0 npm publish predates tagging; all later releases are tagged.
```

### Release notes

**release_notes**: Met (set manually; URL required)
```
Each release has human-written release notes summarising highlights, fixes and known limitations, not a git log: https://github.com/notsointresting/frontend-inspo-mcp/releases/tag/v0.2.1
```

**release_notes_vulns**: N/A
```
No release has fixed a publicly known run-time vulnerability that had a CVE or similar identifier. (The two static-analysis findings fixed before v0.2.1 had no CVE and are mentioned in the release notes.)
```

---

## 3. Reporting

### Bug-reporting process

**report_process**: Met
```
Bugs are reported through GitHub Issues: https://github.com/notsointresting/frontend-inspo-mcp/issues (described in CONTRIBUTING.md). Security reports follow https://github.com/notsointresting/frontend-inspo-mcp/blob/main/SECURITY.md
```

**report_tracker**: Met
```
The project uses the GitHub issue tracker.
```

**report_responses**: Met
```
No bug reports have been submitted so far (0 issues), so there is none left unacknowledged. The maintainer acknowledges reports made through GitHub Issues.
```

**enhancement_responses**: Met
```
No enhancement requests have been submitted so far (0 issues). The maintainer responds to requests made through GitHub Issues and pull requests.
```

**report_archive**: Met
```
GitHub Issues and pull requests are public, searchable archives of reports and responses: https://github.com/notsointresting/frontend-inspo-mcp/issues
```

### Vulnerability report process

**vulnerability_report_process**: Met
```
The process is published in SECURITY.md: https://github.com/notsointresting/frontend-inspo-mcp/blob/main/SECURITY.md
```

**vulnerability_report_private**: Met
```
SECURITY.md tells reporters to use GitHub Private Vulnerability Reporting (Security tab > Report a vulnerability), which is enabled on the repository and keeps reports private: https://github.com/notsointresting/frontend-inspo-mcp/blob/main/SECURITY.md
```

**vulnerability_report_response**: Met
```
SECURITY.md commits to responding within 48 hours, well inside the 14-day requirement. No vulnerability reports have been received in the last 6 months.
```

---

## 4. Quality

### Working build system

**build**: Met
```
`npm ci && npm run build` compiles the TypeScript source with tsc and copies bundled assets (scripts/copy-assets.mjs). CI runs it on every push, and CONTRIBUTING.md documents it.
```

**build_common_tools**: Met
```
Common tools: npm and the TypeScript compiler (tsc).
```

**build_floss_tools**: Met
```
Builds with FLOSS tools only: Node.js, npm and TypeScript.
```

### Automated test suite

**test**: Met
```
The project has an automated test suite released under the same MIT license: 24 unit tests in tests/*.test.mjs using Node's built-in test runner (node:test), covering the retry/backoff logic and the FreeFrontend, Refero, ls.graphics and Watermelon adapters against saved samples with a faked network. It runs with `npm test` and is documented in CONTRIBUTING.md and the README. CI runs it on every push. A separate live smoke test (`npm run smoke`) checks all 27 sources against the real sites.
https://github.com/notsointresting/frontend-inspo-mcp/tree/main/tests
```

**test_invocation**: Met
```
The suite is invoked in the standard npm way: `npm test` (which builds and then runs `node --test`).
```

**test_most**: Met  (SUGGESTED)
```
The unit tests cover the parsers and error paths most likely to break (card/page extraction, link-host validation, HTTP 500/404/429 handling, retry limits, supported API kinds), and the live smoke test exercises search and get-code for every one of the 27 sources. Full branch coverage is not claimed.
```
If you prefer to be conservative, mark this one Unmet; it is only SUGGESTED and does not affect the badge.

**test_continuous_integration**: Met  (SUGGESTED)
```
GitHub Actions runs the build, `npm test` and the smoke test on every push and pull request: https://github.com/notsointresting/frontend-inspo-mcp/blob/main/.github/workflows/ci.yml
```

### New functionality testing

**test_policy**: Met
```
CONTRIBUTING.md states the policy: new functionality and bug fixes must come with tests in tests/ (a bug fix needs a test that fails without the fix; a new source needs a test file with a representative sample), and a PR that adds behavior without tests is asked to add them before merging. https://github.com/notsointresting/frontend-inspo-mcp/blob/main/CONTRIBUTING.md
```

**tests_are_added**: Met
```
The most recent major changes have tests: the retry/backoff logic (tests/fetch.test.mjs), the FreeFrontend parser rewrite and link-host validation (tests/freefrontend.test.mjs), the Refero page-payload reader (tests/refero.test.mjs), the ls.graphics HTTP-500 handling (tests/lsgraphics.test.mjs) and the Watermelon kind fix (tests/watermelon.test.mjs). Each test was confirmed to fail when its bug is reintroduced. https://github.com/notsointresting/frontend-inspo-mcp/tree/main/tests
```

**tests_documented_added**: Met  (SUGGESTED)
```
The policy on adding tests is documented in the "Tests" section of CONTRIBUTING.md, and the "Adding a source" steps include adding a test file: https://github.com/notsointresting/frontend-inspo-mcp/blob/main/CONTRIBUTING.md
```
### Warning flags

**warnings**: Met
```
TypeScript strict mode is enabled (tsconfig.json, "strict": true) and the build fails on any type error. CodeQL also analyses the code on every push.
```

**warnings_fixed**: Met
```
The build has no errors or warnings, and CI fails otherwise. The two CodeQL findings raised so far were fixed (see commits b7f41d9 and 39454fd).
```

**warnings_strict**: Met  (SUGGESTED)
```
tsconfig.json enables TypeScript's "strict" option, the strictest standard mode.
```

---

## 5. Security

### Secure development knowledge

**know_secure_design**: Met. This is your attestation as the project's developer: submit it only if you understand and can stand behind each principle below (edit the wording into your own if you like). Every claim was checked against the code.
```
The primary developer knows how to design secure software and applies the standard secure-design principles in this project: least privilege (the CI token is limited to `contents: read`; a GitHub token is used only if the user sets one, and is sent only to api.github.com); economy of mechanism and minimal attack surface (stdio transport only, no network listener, no shell execution or eval, six read-only tools); input validation at trust boundaries (every tool argument is validated with zod schemas, and link hosts are validated by parsing the URL and comparing the exact hostname); fail-safe defaults (unknown sources are rejected by an enum, and errors are returned as tool errors instead of crashing); complete mediation of outbound traffic (all requests go through one module with timeouts, per-host throttling, caching and bounded retries); and open design (source, CI and security policy are public).
```

**know_common_errors**: Met. Same note: your attestation, every claim checked against the code.
```
The primary developer knows the common kinds of errors that lead to vulnerabilities in this kind of software (an MCP server that fetches and parses third-party content) and a mitigation for each: injection and unsafe handling of untrusted content (third-party HTML/JSON is parsed and returned as data, never executed or evaluated); URL and host spoofing (outbound requests use fixed base hosts, and link hosts are checked by exact parsed hostname, which fixed a CodeQL finding and has a regression test); path traversal (bundled documents are served only from a fixed allow-list of files, never from user-supplied paths); resource exhaustion and abuse of third-party sites (per-host throttling, caching, request timeouts, bounded retries with backoff); secret leakage (tokens come from the environment, are sent only to api.github.com, and are never stored; GitGuardian scans pull requests); supply-chain compromise (lockfile, `npm ci` in CI, weekly Dependabot, `npm audit`, CodeQL on every push); and over-privileged automation (read-only workflow token).
```
### Use basic good cryptographic practices

The project does not implement or configure cryptography. All network traffic uses HTTPS through the Node.js runtime. The only use of `node:crypto` is a SHA-256 hash to name local cache files (`src/lib/fetch.ts`), which is not a security mechanism.

**crypto_published**: N/A
```
The project does not implement cryptographic protocols or algorithms; HTTPS is provided by the Node.js runtime.
```

**crypto_call**: N/A
```
The project does not implement cryptography. TLS is handled by Node.js.
```

**crypto_floss**: N/A
```
No project functionality depends on cryptography beyond HTTPS from the FLOSS Node.js runtime.
```

**crypto_keylength**: N/A
```
The project does not implement security mechanisms with keys.
```

**crypto_working**: N/A
```
The project does not use cryptographic algorithms for security. (SHA-256 is used only to derive local cache file names, not for integrity or authentication.)
```

**crypto_weaknesses**: N/A
```
No security mechanism depends on a weak algorithm, and no SHA-1/MD5 is used anywhere; the only hash is SHA-256 for local cache file names.
```

**crypto_pfs**: N/A
```
The project implements no key-agreement protocol.
```

**crypto_password_storage**: N/A
```
The project does not store passwords or authenticate users.
```

**crypto_random**: N/A
```
The project generates no cryptographic keys or nonces.
```

### Secured delivery against MITM attacks

**delivery_mitm**: Met
```
Distribution channels use HTTPS exclusively: the GitHub repository and releases, and the npm registry (https://www.npmjs.com/package/frontend-inspo-mcp).
```

**delivery_unsigned**: Met
```
The project does not retrieve any cryptographic hash over HTTP; all downloads use HTTPS.
```

### Publicly known vulnerabilities fixed

**vulnerabilities_fixed_60_days**: Met
```
There are no known unpatched vulnerabilities of medium or higher severity. GitHub shows 0 open code-scanning alerts and 0 open Dependabot alerts, and `npm audit` reports 0 vulnerabilities. Dependabot checks weekly.
```

**vulnerabilities_critical_fixed**: Met  (SUGGESTED)
```
No critical vulnerabilities have been reported. Findings from static analysis were fixed within hours of being raised, and Dependabot pull requests are merged promptly.
```

### Other security issues

**no_leaked_credentials**: Met
```
No credentials are stored in the repository. Tokens such as GITHUB_TOKEN are read from the environment or from GitHub Actions secrets, and GitGuardian secret scanning runs on pull requests.
```

---

## 6. Analysis

### Static code analysis

**static_analysis**: Met
```
GitHub CodeQL analyses the code (JavaScript/TypeScript and GitHub Actions workflows) on every push to main, and weekly. Configuration: GitHub code scanning default setup.
```

**static_analysis_common_vulnerabilities**: Met  (SUGGESTED)
```
CodeQL includes rules for common vulnerabilities, for example js/incomplete-url-substring-sanitization and actions/missing-workflow-permissions, which it found in this project.
```

**static_analysis_fixed**: Met
```
Both CodeQL findings so far (incomplete URL substring sanitization, and missing workflow permissions) were fixed, in commits 39454fd and b7f41d9. There are 0 open alerts.
```

**static_analysis_often**: Met  (SUGGESTED)
```
CodeQL runs on every push to main and weekly, so analysis happens on every change.
```

### Dynamic code analysis

**dynamic_analysis**: UNMET  (SUGGESTED)
```
No dynamic analysis tool (fuzzer or scanner) is run before releases. The live smoke test exercises all 27 sources against the real sites, but it is not a dynamic-analysis tool.
```

**dynamic_analysis_unsafe**: N/A  (SUGGESTED)
```
The project is written in TypeScript, a memory-safe language, and contains no C or C++ code.
```

**dynamic_analysis_enable_assertions**: UNMET  (SUGGESTED)
```
No dynamic-analysis configuration with extra assertions is used.
```

**dynamic_analysis_fixed**: N/A
```
No dynamic analysis is performed, so there are no findings to fix.
```

---

## Remaining work

| Item | What to do |
|---|---|
| `know_secure_design`, `know_common_errors` | Paste the drafted answers in section 5, but only if you can stand behind them: they are your statement as the project developer. |
| `release_notes` | Set to Met manually with the release URL (the auto-check looks for a file, but the notes are on the GitHub release). |
| `documentation_basics` | Set to Met manually (the auto-check looks for a `docs/` folder; the README is the documentation). |
| Optional: `dynamic_analysis`, `dynamic_analysis_enable_assertions` | SUGGESTED only; they do not block the badge. |

Done since the first draft of this file: offline unit-test suite (`npm test`, 24 tests, run in CI), testing policy in CONTRIBUTING.md, SHA-1 cache hash replaced with SHA-256, and the GitHub repo description updated to say 27 sources.

Silver answers are in openssf-silver-answers.md.
