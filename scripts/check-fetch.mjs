// Self-check for src/lib/fetch.ts retry logic (needs `npm run build` first).
// Usage: node scripts/check-fetch.mjs   -> exits non-zero on any failed assertion.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { FetchError, fetchText, retryDelayMs, serverWaitMs } from "../dist/lib/fetch.js";

// --- pure helpers ---------------------------------------------------------
const H = (o) => new Headers(o);
assert.equal(serverWaitMs(H({ "retry-after": "7" })), 7000);
assert.equal(serverWaitMs(H({ "retry-after": new Date(10_000).toUTCString() }), 4_000), 6000);
assert.equal(serverWaitMs(H({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": "100" }), 90_000), 10_000);
assert.equal(serverWaitMs(H({ "x-ratelimit-remaining": "5", "x-ratelimit-reset": "100" })), undefined);
assert.equal(serverWaitMs(H({})), undefined);
assert.deepEqual([0, 1, 2].map((a) => retryDelayMs(a)), [1000, 2000, 4000]);
assert.equal(retryDelayMs(0, 3_600_000), 30_000); // capped

// --- end-to-end against a local server -----------------------------------
const hits = {};
const server = createServer((req, res) => {
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
const base = `http://127.0.0.1:${server.address().port}`;

try {
  // 429 twice (Retry-After: 0 honored -> no 1s/2s exponential wait), then 200.
  const t0 = Date.now();
  assert.equal(await fetchText(`${base}/flaky`), "ok");
  assert.equal(hits["/flaky"], 3);
  assert.ok(Date.now() - t0 < 2000, "Retry-After: 0 should skip exponential backoff");

  // Persistent 429: exactly 3 attempts, then a transient FetchError.
  await assert.rejects(fetchText(`${base}/always429`), (e) => e instanceof FetchError && e.transient && e.status === 429);
  assert.equal(hits["/always429"], 3);

  // 404 is not retried and not transient.
  await assert.rejects(fetchText(`${base}/missing`), (e) => e instanceof FetchError && !e.transient && e.status === 404);
  assert.equal(hits["/missing"], 1);

  // 500 is an error unless the caller opts in via okStatuses.
  await assert.rejects(fetchText(`${base}/err500`), /HTTP 500/);
  assert.equal(await fetchText(`${base}/err500`, { okStatuses: [500] }), "body-anyway");

  // Connection refused -> transient network error.
  server.close();
  await assert.rejects(fetchText(`http://127.0.0.1:1/x`), (e) => e instanceof FetchError && e.transient && e.status === undefined);
  console.log("fetch retry self-check: OK");
} finally {
  server.close();
}
