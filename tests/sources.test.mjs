// Contract checks over every registered source, so a new adapter cannot be registered with
// a duplicate id, a non-HTTPS homepage or an unknown stack tag.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STACKS } from "../dist/lib/types.js";
import { ADAPTER_LIST, getAdapter, SOURCE_IDS } from "../dist/sources/index.js";

describe("source registry", () => {
  it("has one unique id per adapter and looks each one up", () => {
    assert.equal(new Set(SOURCE_IDS).size, ADAPTER_LIST.length);
    for (const a of ADAPTER_LIST) assert.equal(getAdapter(a.id), a);
    assert.throws(() => getAdapter("no-such-source"), /Unknown source/);
  });

  it("every adapter satisfies the metadata contract", () => {
    for (const a of ADAPTER_LIST) {
      assert.match(a.id, /^[a-z0-9][a-z0-9-]*$/, `${a.id}: id must be lowercase`);
      assert.ok(a.label && a.description, `${a.id}: label and description`);
      assert.ok(a.homepage.startsWith("https://"), `${a.id}: https homepage`);
      assert.equal(typeof a.hasInlineCode, "boolean", `${a.id}: hasInlineCode`);
      for (const s of a.stack ?? []) assert.ok(STACKS.includes(s), `${a.id}: unknown stack ${s}`);
      if (a.idFormat !== undefined) assert.equal(typeof a.idFormat, "string", a.id);
      for (const fn of ["listCategories", "search", "getResource"]) {
        assert.equal(typeof a[fn], "function", `${a.id}.${fn}`);
      }
    }
  });
});
