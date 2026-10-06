# Releasing and verifying releases

## How releases are signed

Releases are published to npm by the [`Publish to npm`](.github/workflows/publish.yml) GitHub Actions workflow, using npm **trusted publishing**:

- GitHub mints a short-lived OIDC identity token for that one workflow run, and npm exchanges it for a single-use publish token. No long-lived npm token exists in the repository, in CI secrets or on a maintainer's machine.
- npm signs the package and publishes a **provenance attestation**, signed through [Sigstore](https://www.sigstore.dev/) and recorded in its public transparency log. It states which repository, commit and workflow built the package.
- The signing keys are ephemeral and held by Sigstore and the npm registry, not by the project, so no private key sits on the site the package is downloaded from.

## How to verify a release

After installing the package, from your project directory:

```bash
npm audit signatures
```

This checks the npm registry signature of every installed package and, for packages published with provenance, the Sigstore attestation. A verified result looks like:

```
audited N packages
N packages have verified registry signatures
N packages have verified attestations
```

You can also open the version on <https://www.npmjs.com/package/frontend-inspo-mcp>. The **Provenance** section links to the exact commit and workflow run that built it. The public keys npm uses for registry signatures are published at <https://registry.npmjs.org/-/npm/v1/keys>, and Sigstore's trust root is distributed by Sigstore itself.

Versions up to and including 0.2.1 were published manually, before this process existed, and have registry signatures but no provenance.

## Cutting a release (maintainers)

1. Make sure `main` is green in CI.
2. Bump the version without creating a tag: `npm version <patch|minor|major> --no-git-tag-version`. Commit it as `chore: bump version to X.Y.Z` and push.
3. Write the release notes: highlights, fixes, any vulnerabilities fixed (with credit, see [SECURITY.md](SECURITY.md)), and upgrade steps if anything breaks.
4. Create the GitHub release with tag `vX.Y.Z` on that commit, for example `gh release create vX.Y.Z --target <full-sha> --notes-file notes.md`. Pushing the tag starts the publish workflow, which checks the tag matches `package.json`, runs lint, tests with coverage and the reproducibility check, and then publishes.
5. Confirm the workflow passed and that `npm view frontend-inspo-mcp version` shows the new version.

## One-time setup (lead maintainer)

On npmjs.com, open the package's **Settings → Trusted publishing**, choose **GitHub Actions**, and enter:

- Organization or user: `notsointresting`
- Repository: `frontend-inspo-mcp`
- Workflow filename: `publish.yml`
- Allowed actions: allow `npm publish`

Then, under **Settings → Publishing access**, select **Require two-factor authentication and disallow tokens**, so the workflow is the only automated way to publish.
