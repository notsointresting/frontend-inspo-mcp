// GITHUB_TOKEN handling in src/lib/fetch.ts. Its own file so the module's response cache is fresh.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { zustand } from "../dist/sources/packages.js";
import "./helpers.mjs";

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
});
