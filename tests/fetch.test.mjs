// Retry/backoff logic of src/lib/fetch.ts, tested against a local HTTP server.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import { FetchError, fetchText, retryDelayMs, serverWaitMs } from "../dist/lib/fetch.js";

describe("retry helpers", () => {
  const H = (o) => new Headers(o);

  it("honors Retry-After in seconds and as an HTTP date", () => {
    assert.equal(serverWaitMs(H({ "retry-after": "7" })), 7000);
    assert.equal(serverWaitMs(H({ "retry-after": new Date(10_000).toUTCString() }), 4_000), 6000);
  });

  it("honors X-RateLimit-Reset only when the quota is exhausted", () => {
    assert.equal(serverWaitMs(H({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": "100" }), 90_000), 10_000);
    assert.equal(serverWaitMs(H({ "x-ratelimit-remaining": "5", "x-ratelimit-reset": "100" })), undefined);
    assert.equal(serverWaitMs(H({})), undefined);
  });

  it("backs off exponentially and caps the wait", () => {
    assert.deepEqual([0, 1, 2].map((a) => retryDelayMs(a)), [1000, 2000, 4000]);
    assert.equal(retryDelayMs(0, 3_600_000), 30_000);
  });
});

describe("fetchText against a local server", () => {
  const hits = {};
  let server;
  let base;

  before(async () => {
    server = createServer((req, res) => {
      hits[req.url] = (hits[req.url] ?? 0) + 1;
      const n = hits[req.url];
      if (req.url === "/flaky") {
        if (n < 3) return void res.writeHead(429, { "retry-after": "0" }).end("slow down");
        return void res.writeHead(200).end("ok");
      }
      if (req.url === "/always429") return void res.writeHead(429, { "retry-after": "0" }).end();
      if (req.url === "/missing") return void res.writeHead(404).end();
      if (req.url === "/err500") return void res.writeHead(500).end("body-anyway");
      res.writeHead(200).end("ok");
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => server.close());

  it("retries 429 (honoring Retry-After: 0) and then succeeds", async () => {
    const t0 = Date.now();
    assert.equal(await fetchText(`${base}/flaky`), "ok");
    assert.equal(hits["/flaky"], 3);
    assert.ok(Date.now() - t0 < 2000, "Retry-After: 0 must skip the 1s/2s exponential wait");
  });

  it("gives up after 3 attempts with a transient FetchError", async () => {
    await assert.rejects(fetchText(`${base}/always429`), (e) => e instanceof FetchError && e.transient && e.status === 429);
    assert.equal(hits["/always429"], 3);
  });

  it("does not retry 404", async () => {
    await assert.rejects(fetchText(`${base}/missing`), (e) => e instanceof FetchError && !e.transient && e.status === 404);
    assert.equal(hits["/missing"], 1);
  });

  it("returns an error body only when the caller opts in via okStatuses", async () => {
    await assert.rejects(fetchText(`${base}/err500`), /HTTP 500/);
    assert.equal(await fetchText(`${base}/err500`, { okStatuses: [500] }), "body-anyway");
  });

  it("treats a refused connection as a transient network error", async () => {
    await assert.rejects(
      fetchText("http://127.0.0.1:1/x"),
      (e) => e instanceof FetchError && e.transient && e.status === undefined,
    );
  });
});
