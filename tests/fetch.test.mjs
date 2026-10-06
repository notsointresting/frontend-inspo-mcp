// Retry/backoff logic of src/lib/fetch.ts, tested against a local HTTP server, plus the per-host
// rules (politeness gaps, jsDelivr's permanent 403s) against a faked fetch.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import { FetchError, fetchText, minGapMs, retryDelayMs, serverWaitMs } from "../dist/lib/fetch.js";

describe("retry helpers", () => {
  const H = (o) => new Headers(o);

  it("honors Retry-After in seconds and as an HTTP date", () => {
    assert.equal(serverWaitMs(H({ "retry-after": "7" })), 7000);
    assert.equal(serverWaitMs(H({ "retry-after": new Date(10_000).toUTCString() }), 4_000), 6000);
  });

  it("honors X-RateLimit-Reset only when the quota is exhausted", () => {
    assert.equal(
      serverWaitMs(H({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": "100" }), 90_000),
      10_000,
    );
    assert.equal(
      serverWaitMs(H({ "x-ratelimit-remaining": "5", "x-ratelimit-reset": "100" })),
      undefined,
    );
    assert.equal(serverWaitMs(H({})), undefined);
  });

  it("backs off exponentially and caps the wait", () => {
    assert.deepEqual(
      [0, 1, 2].map((a) => retryDelayMs(a)),
      [1000, 2000, 4000],
    );
    assert.equal(retryDelayMs(0, 3_600_000), 30_000);
  });
});

describe("fetchText against a local server", () => {
  const hits = {};
  const userAgents = [];
  let server;
  let base;

  before(async () => {
    server = createServer((req, res) => {
      hits[req.url] = (hits[req.url] ?? 0) + 1;
      userAgents.push(req.headers["user-agent"]);
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
    await assert.rejects(
      fetchText(`${base}/always429`),
      (e) => e instanceof FetchError && e.transient && e.status === 429,
    );
    assert.equal(hits["/always429"], 3);
  });

  it("does not retry 404", async () => {
    await assert.rejects(
      fetchText(`${base}/missing`),
      (e) => e instanceof FetchError && !e.transient && e.status === 404,
    );
    assert.equal(hits["/missing"], 1);
  });

  it("returns an error body only when the caller opts in via okStatuses", async () => {
    await assert.rejects(fetchText(`${base}/err500`), /HTTP 500/);
    assert.equal(await fetchText(`${base}/err500`, { okStatuses: [500] }), "body-anyway");
  });

  it("identifies itself with the package version and the project URL", async () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
    await fetchText(`${base}/ua`);
    assert.equal(
      userAgents.at(-1),
      `frontend-inspo-mcp/${pkg.version} (+https://github.com/notsointresting/frontend-inspo-mcp)`,
    );
  });

  it("treats a refused connection as a transient network error", async () => {
    await assert.rejects(
      fetchText("http://127.0.0.1:1/x"),
      (e) => e instanceof FetchError && e.transient && e.status === undefined,
    );
  });
});

/** Run `fn` with FRONTEND_INSPO_MIN_GAP_MS set to `value` (undefined: unset), then restore it. */
async function withGap(value, fn) {
  const saved = process.env.FRONTEND_INSPO_MIN_GAP_MS;
  if (value === undefined) delete process.env.FRONTEND_INSPO_MIN_GAP_MS;
  else process.env.FRONTEND_INSPO_MIN_GAP_MS = value;
  try {
    return await fn();
  } finally {
    if (saved === undefined) delete process.env.FRONTEND_INSPO_MIN_GAP_MS;
    else process.env.FRONTEND_INSPO_MIN_GAP_MS = saved;
  }
}

describe("per-host politeness gap", () => {
  it("is 400 ms, raised by a host's Crawl-delay, and 0 switches every gap off", async () => {
    const gaps = () => [minGapMs("example.com"), minGapMs("www.ui-layouts.com")];
    await withGap(undefined, () => assert.deepEqual(gaps(), [400, 1000]));
    await withGap("100", () => assert.deepEqual(gaps(), [100, 1000]));
    await withGap("2000", () => assert.deepEqual(gaps(), [2000, 2000]));
    await withGap("0", () => assert.deepEqual(gaps(), [0, 0])); // what the unit tests use
  });

  it("spaces requests to www.ui-layouts.com 1 s apart (its robots.txt Crawl-delay)", async (t) => {
    const times = [];
    t.mock.method(globalThis, "fetch", async () => {
      times.push(Date.now());
      return new Response("{}");
    });
    await withGap(undefined, async () => {
      await fetchText("https://www.ui-layouts.com/r/registry.json");
      await fetchText("https://www.ui-layouts.com/r/text-animations.json");
    });
    assert.equal(times.length, 2);
    assert.ok(times[1] - times[0] >= 950, `${times[1] - times[0]} ms apart`);
  });
});

describe("jsDelivr 403s", () => {
  // data.jsdelivr.com's reply for a repo over its size limit (captured, "links" dropped).
  const TOO_BIG = JSON.stringify({
    type: "gh",
    name: "pmndrs/uikit",
    version: "main",
    status: 403,
    message: "Package size exceeded the configured limit of 50 MB.",
  });

  it("fails at once with a permanent (not transient) 403 on both jsDelivr hosts", async (t) => {
    const fake = t.mock.method(globalThis, "fetch", async (url) =>
      String(url).startsWith("https://data.jsdelivr.com/")
        ? new Response(TOO_BIG, {
            status: 403,
            headers: { "content-type": "application/json; charset=utf-8" },
          })
        : new Response("", { status: 403 }),
    );
    for (const url of [
      "https://data.jsdelivr.com/v1/packages/gh/pmndrs/uikit@main?structure=flat",
      "https://cdn.jsdelivr.net/npm/huge-package@1.0.0/index.js",
    ]) {
      await assert.rejects(fetchText(url), (e) => {
        assert.ok(e instanceof FetchError);
        assert.equal(e.status, 403);
        assert.equal(e.transient, false);
        assert.equal(e.retryable, false);
        return true;
      });
    }
    assert.equal(fake.mock.callCount(), 2, "one request per URL: no retries");
  });
});
