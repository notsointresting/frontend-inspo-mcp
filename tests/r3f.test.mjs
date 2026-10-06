// r3f adapter: serves the bundled React Three Fiber guidance from disk (no network).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { r3f } from "../dist/sources/r3f.js";

describe("r3f", () => {
  it("lists its two categories", async () => {
    assert.deepEqual(await r3f.listCategories(), [
      { id: "overview", label: "overview", count: 1 },
      { id: "reference", label: "reference", count: 3 },
    ]);
  });

  it("returns every bundled document, with a description and section tags", async () => {
    const res = await r3f.search({ limit: 100 });
    assert.deepEqual(
      res.map((r) => r.id),
      ["skill", "geometry-and-scenes", "scroll-storytelling", "architecture-decisions"],
    );
    for (const r of res) {
      assert.ok(r.title.length > 0);
      assert.ok((r.description ?? "").length <= 200);
      assert.ok(r.tags.includes("react-three-fiber"));
    }
  });

  it("filters by category and query, and honors the limit", async () => {
    assert.equal((await r3f.search({ category: "overview" })).length, 1);
    assert.equal((await r3f.search({ category: "Reference" })).length, 3);
    assert.ok((await r3f.search({ query: "scroll" })).some((r) => r.id === "scroll-storytelling"));
    assert.equal((await r3f.search({ query: "qqqq-not-in-any-doc" })).length, 0);
    assert.equal((await r3f.search({ limit: 1 })).length, 1);
  });

  it("ranks the best match first, in any word order and with plurals", async () => {
    const first = async (query) => (await r3f.search({ query }))[0]?.id;
    assert.equal(await first("scroll"), "scroll-storytelling");
    assert.equal(await first("storytelling scroll"), "scroll-storytelling");
    assert.equal(await first("material"), "geometry-and-scenes");
    assert.equal(await first("architecture decision"), "architecture-decisions");
  });

  it("declares its stack and an id format naming every doc", async () => {
    assert.deepEqual(r3f.stack, ["react", "3d", "guidance"]);
    for (const r of await r3f.search({ limit: 100 })) assert.ok(r3f.idFormat.includes(r.id), r.id);
  });

  it("returns the markdown as code for a known id", async () => {
    const d = await r3f.getResource("skill");
    assert.ok(d.code.md.length > 500);
    assert.deepEqual(d.extra.file, "SKILL.md");
    assert.ok(Array.isArray(d.extra.sections));
  });

  it("only serves ids from its fixed document list (no path lookups)", async () => {
    assert.equal(await r3f.getResource("nope"), null);
    assert.equal(await r3f.getResource("../package"), null);
    assert.equal(await r3f.getResource("references/scroll-storytelling.md"), null);
  });
});
