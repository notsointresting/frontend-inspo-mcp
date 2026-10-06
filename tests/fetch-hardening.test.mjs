// Hardening in src/lib/fetch.ts: HTTPS only, no redirect downgrade, bounded response size.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FetchError, fetchText, isSecureUrl } from "../dist/lib/fetch.js";
import { mockFetch } from "./helpers.mjs";

describe("isSecureUrl", () => {
  it("allows https anywhere and plain http only for loopback", () => {
    assert.equal(isSecureUrl("https://ui.shadcn.com/r/index.json"), true);
    assert.equal(isSecureUrl("http://127.0.0.1:8080/x"), true);
    assert.equal(isSecureUrl("http://localhost:3000/x"), true);
    assert.equal(isSecureUrl("http://ui.shadcn.com/r/index.json"), false);
    assert.equal(isSecureUrl("http://127.0.0.1.evil.example/x"), false);
    assert.equal(isSecureUrl("ftp://example.com/x"), false);
    assert.equal(isSecureUrl("file:///etc/passwd"), false);
    assert.equal(isSecureUrl("not a url"), false);
  });
});

describe("fetchText hardening", () => {
  it("refuses plain-HTTP URLs without making a request", async () => {
    const calls = mockFetch(() => ({ body: "x" }));
    await assert.rejects(
      fetchText("http://insecure.example/a"),
      (e) => e instanceof FetchError && !e.transient && /non-HTTPS/.test(e.message),
    );
    assert.equal(calls.length, 0);
  });

  it("refuses a redirect that downgrades to plain HTTP", async () => {
    globalThis.fetch = async () => {
      const res = new Response("secret", { status: 200 });
      Object.defineProperty(res, "url", { value: "http://downgraded.example/x" });
      return res;
    };
    await assert.rejects(fetchText("https://redirects.example/a"), /redirect to non-HTTPS/);
  });

  it("rejects a response whose declared length exceeds the cap", async () => {
    process.env.FRONTEND_INSPO_MAX_BODY_BYTES = "100";
    try {
      mockFetch(() => ({ body: "y".repeat(500), headers: { "content-length": "500" } }));
      await assert.rejects(fetchText("https://big-declared.example/a"), /too large/);
    } finally {
      delete process.env.FRONTEND_INSPO_MAX_BODY_BYTES;
    }
  });

  it("stops reading a chunked response that has no length header once it passes the cap", async () => {
    process.env.FRONTEND_INSPO_MAX_BODY_BYTES = "100";
    let chunksSent = 0;
    globalThis.fetch = async () => {
      const body = new ReadableStream({
        pull(controller) {
          chunksSent++;
          controller.enqueue(new TextEncoder().encode("z".repeat(60)));
          if (chunksSent > 1000) controller.close(); // would be 60 KB if never stopped
        },
      });
      return new Response(body, { status: 200 });
    };
    try {
      await assert.rejects(fetchText("https://big-chunked.example/a"), /too large/);
      assert.ok(chunksSent < 10, `kept reading after the cap (${chunksSent} chunks)`);
    } finally {
      delete process.env.FRONTEND_INSPO_MAX_BODY_BYTES;
    }
  });

  it("decodes multi-byte text split across chunks correctly", async () => {
    const bytes = new TextEncoder().encode("héllo wörld ✓");
    globalThis.fetch = async () => {
      const body = new ReadableStream({
        start(controller) {
          // split in the middle of a multi-byte character
          controller.enqueue(bytes.slice(0, 2));
          controller.enqueue(bytes.slice(2));
          controller.close();
        },
      });
      return new Response(body, { status: 200 });
    };
    assert.equal(await fetchText("https://unicode.example/a"), "héllo wörld ✓");
  });
});
