// memoAsync: shared in-flight loads, TTL expiry, no caching of failures, stale-on-error.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoAsync } from "../dist/lib/memo.js";

describe("memoAsync", () => {
  it("shares one in-flight load between concurrent callers and caches within the TTL", async () => {
    let calls = 0;
    const get = memoAsync(async () => ++calls, 60_000);
    const [a, b] = await Promise.all([get(), get()]);
    assert.equal(a, 1);
    assert.equal(b, 1);
    assert.equal(await get(), 1);
    assert.equal(calls, 1);
  });

  it("reloads once the TTL has passed", async () => {
    let calls = 0;
    const get = memoAsync(async () => ++calls, 0);
    await get();
    await new Promise((r) => setTimeout(r, 2));
    assert.equal(await get(), 2);
  });

  it("does not cache a failure", async () => {
    let calls = 0;
    const get = memoAsync(async () => {
      calls++;
      if (calls === 1) throw new Error("boom");
      return "ok";
    }, 60_000);
    await assert.rejects(get(), /boom/);
    assert.equal(await get(), "ok");
  });

  it("serves the last good value when a refresh fails", async () => {
    let calls = 0;
    const get = memoAsync(async () => {
      calls++;
      if (calls > 1) throw new Error("upstream down");
      return "v1";
    }, 0);
    assert.equal(await get(), "v1");
    await new Promise((r) => setTimeout(r, 2));
    assert.equal(await get(), "v1");
    assert.equal(calls, 2);
  });
});
