// GitHub API handling in src/lib/fetch.ts: GITHUB_TOKEN and rate limits. Its own file so the
// module's response cache is fresh.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FetchError, fetchText } from "../dist/lib/fetch.js";
import { zustand } from "../dist/sources/packages.js";
import { mockFetch } from "./helpers.mjs";

describe("GITHUB_TOKEN", () => {
  it("is sent to api.github.com and never to any other host", async () => {
    const seen = [];
    globalThis.fetch = async (url, init) => {
      seen.push([new URL(String(url)).host, init?.headers?.authorization]);
      return new Response(JSON.stringify({ tree: [] }), { status: 200 });
    };
    process.env.GITHUB_TOKEN = "test-token-123";
    try {
      await zustand.search({});
      await zustand.getResource("/src/x.ts"); // raw.githubusercontent.com
    } finally {
      delete process.env.GITHUB_TOKEN;
    }
    assert.deepEqual(
      seen.map(([host]) => host),
      ["api.github.com", "raw.githubusercontent.com"],
    );
    assert.equal(seen[0]?.[1], "Bearer test-token-123");
    assert.equal(seen[1]?.[1], undefined, "token must not reach raw.githubusercontent.com");
  });

  it("sends no Authorization header when no token is set", async () => {
    let auth = "unset";
    globalThis.fetch = async (_url, init) => {
      auth = init?.headers?.authorization;
      return new Response("ok", { status: 200 });
    };
    const { fetchText } = await import("../dist/lib/fetch.js");
    await fetchText("https://api.github.com/repos/x/y/git/trees/main?recursive=1");
    assert.equal(auth, undefined);
  });

  it("treats the placeholders an MCP client passes for an empty setting as no token", async () => {
    const auth = [];
    globalThis.fetch = async (_url, init) => {
      auth.push(init?.headers?.authorization);
      return new Response("ok", { status: 200 });
    };
    // manifest.json maps GITHUB_TOKEN to the template below; a client may pass it unfilled, or
    // stringify a missing value.
    const template = `\${user_config.github_token}`; // the literal text, not an interpolation
    const placeholders = ["", "  ", "undefined", "null", template];
    try {
      for (const [i, value] of placeholders.entries()) {
        process.env.GITHUB_TOKEN = value;
        await fetchText(`https://api.github.com/repos/x/placeholder-${i}/git/trees/HEAD`);
      }
      process.env.GITHUB_TOKEN = " test-token-456\n"; // a pasted token keeps working
      await fetchText("https://api.github.com/repos/x/padded/git/trees/HEAD");
    } finally {
      delete process.env.GITHUB_TOKEN;
    }
    assert.deepEqual(auth, [...placeholders.map(() => undefined), "Bearer test-token-456"]);
  });
});

describe("GitHub rate limits", () => {
  const treeUrl = (repo) => `https://api.github.com/repos/o/${repo}/git/trees/HEAD?recursive=1`;
  const nowSecs = () => Math.floor(Date.now() / 1000);
  const exhausted = (status, reset) => ({
    status,
    headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) },
  });

  for (const status of [403, 429]) {
    it(`fails fast on ${status} when the quota resets later than we would wait`, async () => {
      const reset = nowSecs() + 3600;
      const calls = mockFetch(() => exhausted(status, reset));
      const url = treeUrl(`far-${status}`);
      const hhmm = new Date(reset * 1000).toISOString().slice(11, 16);
      const t0 = Date.now();
      await assert.rejects(fetchText(url), (e) => {
        assert.ok(e instanceof FetchError);
        assert.equal(
          e.message,
          `GitHub API rate limit exhausted for ${url} (resets at ${hhmm} UTC). Set GITHUB_TOKEN to raise the limit.`,
        );
        assert.equal(e.transient, true, "transient, so callers fall back and smoke retries later");
        assert.equal(e.status, status);
        return true;
      });
      assert.equal(calls.length, 1, "no retries");
      assert.ok(Date.now() - t0 < 1000, "no retry waits");
    });
  }

  it("still waits and retries when the quota resets within the wait limit", async () => {
    let n = 0;
    const calls = mockFetch(() => (++n === 1 ? exhausted(403, nowSecs()) : { body: "ok" }));
    assert.equal(await fetchText(treeUrl("near")), "ok");
    assert.equal(calls.length, 2);
  });

  it("still retries other GitHub 403s, such as secondary limits with Retry-After", async () => {
    let n = 0;
    const calls = mockFetch(() =>
      ++n === 1 ? { status: 403, headers: { "retry-after": "0" } } : { body: "ok" },
    );
    assert.equal(await fetchText(treeUrl("secondary")), "ok");
    assert.equal(calls.length, 2);
  });
});
