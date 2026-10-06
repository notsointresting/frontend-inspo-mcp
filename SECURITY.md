# Security Policy

## Supported versions

Only the latest release on npm (and the `main` branch) receives security fixes. Upgrading is a single step: `npx -y frontend-inspo-mcp` always runs the newest version, and `npm install frontend-inspo-mcp@latest` updates a pinned install. See [GOVERNANCE.md](GOVERNANCE.md#releases-versioning-and-upgrades) for the versioning policy.

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Report privately through GitHub's Private Vulnerability Reporting:

1. Go to the **Security** tab of this repository, or open <https://github.com/notsointresting/frontend-inspo-mcp/security/advisories/new>.
2. Click **Report a vulnerability**.
3. Describe the issue, the affected version, and a proof of concept if you have one.

The report stays private between you and the maintainers until a fix is published.

## How we respond

1. **Acknowledge** the report within 48 hours (the project commits to well under the 14-day maximum).
2. **Triage** within 7 days: reproduce it, decide whether it is a vulnerability, and assess severity using CVSS. We tell you the outcome either way.
3. **Fix** in a private branch or a private security-advisory fork. Target: 30 days for medium or higher severity, sooner for critical issues. A regression test is added with the fix.
4. **Release** a patched version to npm and GitHub, then publish a GitHub Security Advisory and request a CVE when the issue is exploitable.
5. **Disclose** after the fix is available. The release notes list every publicly known vulnerability that release fixes.

If we cannot fix an issue within 90 days we will tell you why and agree a disclosure date with you.

## Credit

We credit every reporter by name (or handle) in the advisory and the release notes, unless they ask to stay anonymous. No vulnerability reports have been received or resolved so far.

## What you can expect in terms of security

The security requirements, threat model and the argument for why they are met are documented in [docs/security-assurance-case.md](docs/security-assurance-case.md). In short:

- The server only **reads** public third-party data. It has no write tools, runs no shell commands, and executes no code it downloads.
- It talks to clients over **stdio only**; it opens no network port.
- All outbound requests use **HTTPS** with certificate verification (Node.js defaults, TLS 1.2 or later), to a fixed set of hosts.
- Tool arguments are **validated against allowlists** before use.
- An optional `GITHUB_TOKEN` is read from the environment and sent **only** to `api.github.com`.

It does **not** protect you from the content of third-party sites: returned code is untrusted reference material. Review it before running it, and treat it like any code copied from the internet.
