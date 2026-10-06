// ThreeUI adapter: one big manifest, parsed once and searched in memory.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { threeui } from "../dist/sources/threeui.js";
import { mockFetch } from "./helpers.mjs";

const MANIFEST = {
  components: [
    {
      id: "kage-landing-page",
      title: "Kage Landing Page",
      runtime: "webgl",
      files: [
        { path: "src/a.html", language: "html", code: "<canvas></canvas>" },
        { path: "src/b.html", language: "html", code: "<p>second html</p>" }, // same language -> path-suffixed key
        { path: "src/c.css", language: "css", code: "body{}" },
        { path: "src/empty.js", language: "js" }, // no code -> skipped
      ],
      sharedFilePaths: ["src/shared.ts", "src/not-there.ts"],
      exportName: "Kage",
    },
    { id: "glow_orb", category: "Raw WebGL", runtime: "three", files: [] },
    { id: "plain" },
  ],
  sharedFiles: [{ path: "src/shared.ts", language: "typescript", code: "export const x = 1;" }],
};

let manifestRequests = 0;
mockFetch((url) => {
  if (url.endsWith("/source-code.json")) {
    manifestRequests++;
    return { body: JSON.stringify(MANIFEST) };
  }
  return { status: 404 };
});

describe("threeui", () => {
  it("derives titles and categories from ids and runtimes", async () => {
    const res = await threeui.search({ limit: 10 });
    assert.deepEqual(
      res.map((r) => r.title),
      ["Kage Landing Page", "Glow Orb", "Plain"],
    );
    assert.deepEqual(
      res.map((r) => r.category),
      ["landing-pages", "Raw WebGL", "component"],
    );
    assert.ok(res[0].tags.includes("webgl") && res[0].tags.includes("html"));
  });

  it("counts categories and filters by category, query and limit", async () => {
    const cats = await threeui.listCategories();
    assert.equal(cats.length, 3);
    assert.deepEqual(
      (await threeui.search({ category: "raw webgl" })).map((r) => r.id),
      ["glow_orb"],
    );
    assert.deepEqual(
      (await threeui.search({ query: "kage" })).map((r) => r.id),
      ["kage-landing-page"],
    );
    assert.equal((await threeui.search({ limit: 1 })).length, 1);
  });

  it("merges component and shared files, keeping same-language files apart", async () => {
    const d = await threeui.getResource("kage-landing-page");
    assert.equal(d.code.html, "<canvas></canvas>");
    assert.equal(d.code["html:src/b.html"], "<p>second html</p>");
    assert.equal(d.code.css, "body{}");
    assert.equal(d.code.typescript, "export const x = 1;");
    assert.equal("js" in d.code, false);
    assert.equal(d.extra.exportName, "Kage");
    assert.equal(d.license, "MIT");
  });

  it("has no code for a component without files, and null for an unknown id", async () => {
    assert.equal((await threeui.getResource("glow_orb")).code, undefined);
    assert.equal(await threeui.getResource("missing"), null);
  });

  it("downloads the large manifest only once", async () => {
    await threeui.search({});
    assert.equal(manifestRequests, 1);
  });
});
