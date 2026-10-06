// Caching in src/lib/fetch.ts: lifetimes, the bounded LRU memory cache, in-flight dedupe and the
// opt-in disk cache. Its own file, with fresh URLs per test, because the cache is module-global.
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { cacheStats, cacheTtlMs, fetchText, sweepDiskCache } from "../dist/lib/fetch.js";
import { mockFetch } from "./helpers.mjs";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const SHA = "0123456789abcdef0123456789abcdef01234567";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Run `fn` with env vars set, restoring them afterwards. */
async function withEnv(vars, fn) {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.assign(process.env, vars);
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("cache lifetimes", () => {
  it("keeps version-pinned URLs for a day and everything else for 10 minutes", () => {
    const pinned = [
      "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js",
      "https://cdn.jsdelivr.net/npm/@radix-ui/colors@3.0.0/gray.css",
      "https://cdn.jsdelivr.net/npm/react@19.0.0-rc.1/index.js",
      `https://cdn.jsdelivr.net/gh/pmndrs/drei@${SHA}/src/core/Html.tsx`,
      `https://raw.githubusercontent.com/pmndrs/drei/${SHA}/src/core/Html.tsx`,
      "https://data.jsdelivr.com/v1/packages/npm/three@0.170.0?structure=flat",
      "https://data.jsdelivr.com/v1/packages/npm/@radix-ui/colors@3.0.0?structure=flat",
      "https://data.jsdelivr.com/v1/packages/npm/three@0.170.0",
    ];
    const floating = [
      "https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js",
      "https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.js",
      "https://cdn.jsdelivr.net/npm/three@^0.170.0/build/three.module.js",
      "https://cdn.jsdelivr.net/npm/three@0.170.0x/build/three.module.js",
      "https://cdn.jsdelivr.net/npm/three/build/three.module.js",
      "https://cdn.jsdelivr.net/gh/pmndrs/drei@master/src/core/Html.tsx",
      "https://raw.githubusercontent.com/pmndrs/drei/HEAD/src/core/Html.tsx",
      "https://raw.githubusercontent.com/pmndrs/drei/main/src/core/Html.tsx",
      `https://raw.githubusercontent.com/pmndrs/drei/${SHA.slice(1)}/src/core/Html.tsx`,
      "https://data.jsdelivr.com/v1/package/npm/three",
      "https://data.jsdelivr.com/v1/packages/npm/three@latest?structure=flat",
      "https://example.com/cdn.jsdelivr.net/npm/three@0.170.0/x.js",
      "https://cdn.jsdelivr.net.example.com/npm/three@0.170.0/x.js",
    ];
    for (const url of pinned) assert.equal(cacheTtlMs(url), DAY, url);
    for (const url of floating) assert.equal(cacheTtlMs(url), 10 * MIN, url);
  });

  it("lets FRONTEND_INSPO_CACHE_TTL_MS set the default lifetime and ignores invalid values", async () => {
    const pinned = "https://cdn.jsdelivr.net/npm/three@0.170.0/x.js";
    const plain = "https://example.com/x";
    await withEnv({ FRONTEND_INSPO_CACHE_TTL_MS: "1234" }, () => {
      assert.equal(cacheTtlMs(plain), 1234);
      assert.equal(cacheTtlMs(pinned), DAY);
    });
    await withEnv({ FRONTEND_INSPO_CACHE_TTL_MS: String(2 * DAY) }, () => {
      assert.equal(cacheTtlMs(pinned), 2 * DAY, "pinned URLs never expire before the others");
    });
    for (const bad of ["abc", "-5", ""]) {
      await withEnv({ FRONTEND_INSPO_CACHE_TTL_MS: bad }, () => {
        assert.equal(cacheTtlMs(plain), 10 * MIN, `"${bad}"`);
      });
    }
  });

  it("refetches an ordinary URL once its TTL passes but keeps a pinned one", async () => {
    const calls = mockFetch(() => ({ body: "x" }));
    const plain = "https://ttl.example/plain";
    const pinned = "https://cdn.jsdelivr.net/npm/ttl-test@1.0.0/index.js";
    await withEnv({ FRONTEND_INSPO_CACHE_TTL_MS: "30" }, async () => {
      await fetchText(plain);
      await fetchText(pinned);
      await sleep(60);
      await fetchText(plain);
      await fetchText(pinned);
    });
    assert.deepEqual(calls, [plain, pinned, plain]);
  });
});

describe("memory cache", () => {
  it("drops expired entries from memory on the next write", async () => {
    mockFetch((url) => ({ body: url.endsWith("/old") ? "o".repeat(1000) : "n" }));
    await sleep(50); // let short-TTL entries from earlier tests expire...
    await fetchText("https://sweep.example/warmup"); // ...and be swept by this write
    const before = cacheStats();
    await withEnv({ FRONTEND_INSPO_CACHE_TTL_MS: "20" }, () =>
      fetchText("https://sweep.example/old"),
    );
    assert.deepEqual(cacheStats(), { entries: before.entries + 1, chars: before.chars + 1000 });
    await sleep(40);
    await fetchText("https://sweep.example/new");
    assert.deepEqual(cacheStats(), { entries: before.entries + 1, chars: before.chars + 1 });
  });

  it("evicts the least recently used entries once the size cap is reached", async () => {
    const calls = mockFetch((url) => ({
      body: url.slice(-1).repeat(url.endsWith("z") ? 300 : 100),
    }));
    const u = (k) => `https://lru.example/${k}`;
    await withEnv({ FRONTEND_INSPO_CACHE_MAX_BYTES: "250" }, async () => {
      await fetchText(u("a"));
      await fetchText(u("b"));
      await fetchText(u("a")); // hit: "a" becomes the most recently used
      await fetchText(u("c")); // 300 > 250 characters: evicts "b", the least recently used
      assert.ok(cacheStats().chars <= 250, `${cacheStats().chars} characters cached`);
      await fetchText(u("z")); // bigger than the whole cap: not cached, evicts nothing
      await fetchText(u("z"));
      await fetchText(u("a"));
      await fetchText(u("c"));
      await fetchText(u("b"));
    });
    assert.deepEqual(calls, [u("a"), u("b"), u("c"), u("z"), u("z"), u("b")]);
  });

  it("does not keep bodies over 2 MB in memory, nor evict others to make room", async () => {
    const big = "x".repeat(2 * 1024 * 1024 + 1);
    const calls = mockFetch((url) => ({ body: url.endsWith("/big") ? big : "small" }));
    const small = "https://size.example/small";
    const bigUrl = "https://size.example/big";
    await fetchText(small);
    const before = cacheStats();
    assert.equal((await fetchText(bigUrl)).length, big.length);
    assert.equal((await fetchText(bigUrl)).length, big.length);
    assert.ok(cacheStats().chars <= before.chars, "the big body is not held in memory");
    assert.equal(await fetchText(small), "small");
    assert.deepEqual(calls, [small, bigUrl, bigUrl]);
  });
});

describe("in-flight dedupe", () => {
  it("shares one request between concurrent callers", async () => {
    const calls = mockFetch(() => ({ body: "shared" }));
    const url = "https://dedupe.example/a";
    const results = await Promise.all([fetchText(url), fetchText(url), fetchText(url)]);
    assert.deepEqual(results, ["shared", "shared", "shared"]);
    assert.equal(calls.length, 1);
  });

  it("shares a failure too, and does not cache it", async () => {
    const calls = mockFetch(() => ({ status: 404 }));
    const url = "https://dedupe.example/missing";
    const settled = await Promise.allSettled([fetchText(url), fetchText(url)]);
    assert.deepEqual(
      settled.map((r) => r.status),
      ["rejected", "rejected"],
    );
    assert.equal(calls.length, 1);
    await assert.rejects(fetchText(url), /HTTP 404/);
    assert.equal(calls.length, 2, "the next call tries again");
  });
});

describe("disk cache", () => {
  const root = mkdtempSync(join(tmpdir(), "frontend-inspo-cache-"));
  after(() => rmSync(root, { recursive: true, force: true }));
  const twoDaysAgo = (Date.now() - 2 * DAY) / 1000;
  const ours = (c) => `${c.repeat(64)}.json`;
  /** Create a file (or directory) in `dir`, optionally with a mtime two days in the past. */
  function make(dir, name, { old = false, isDir = false } = {}) {
    const p = join(dir, name);
    if (isDir) mkdirSync(p);
    else writeFileSync(p, JSON.stringify({ body: "x", expires: 1 }));
    if (old) utimesSync(p, twoDaysAgo, twoDaysAgo);
    return p;
  }

  it("sweeps only our files older than any TTL, and never throws", async () => {
    const dir = join(root, "sweep");
    mkdirSync(dir);
    make(dir, ours("a"), { old: true }); // ours and expired: deleted
    make(dir, ours("b")); // ours but fresh: kept
    make(dir, "notes.json", { old: true }); // not ours: kept
    make(dir, `${"c".repeat(64)}.txt`, { old: true }); // not ours: kept
    make(dir, ours("d"), { old: true, isDir: true }); // a directory: kept
    await sweepDiskCache(dir);
    assert.deepEqual(readdirSync(dir).sort(), [
      ours("b"),
      `${"c".repeat(64)}.txt`,
      ours("d"),
      "notes.json",
    ]);
    await sweepDiskCache(join(root, "does-not-exist")); // resolves, no throw
  });

  it("sweeps at startup, and stores big bodies on disk while keeping them out of memory", async () => {
    const dir = join(root, "startup");
    mkdirSync(dir);
    const stale = make(dir, ours("e"), { old: true });
    // FRONTEND_INSPO_CACHE_DIR is read at load, so load a second module instance (the query
    // string makes ESM evaluate it again) with the variable set.
    const disk = await withEnv(
      { FRONTEND_INSPO_CACHE_DIR: dir },
      () => import("../dist/lib/fetch.js?with-disk-cache"),
    );
    for (let i = 0; i < 100 && existsSync(stale); i++) await sleep(20);
    assert.equal(existsSync(stale), false, "the startup sweep deletes stale files");

    const big = "y".repeat(2 * 1024 * 1024 + 1);
    const calls = mockFetch(() => ({ body: big }));
    const url = "https://disk.example/big";
    assert.equal((await disk.fetchText(url)).length, big.length);
    assert.equal(disk.cacheStats().entries, 0, "too big for the memory cache");
    assert.equal(readdirSync(dir).length, 1, "but written to disk");
    assert.equal((await disk.fetchText(url)).length, big.length);
    assert.equal(calls.length, 1, "the second call is served from disk");
  });
});
