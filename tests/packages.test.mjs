// Package/source-tree adapters (three.js, drei, react-spring, ...): driven by one generic fake
// that serves GitHub git-trees, jsDelivr file listings and raw file contents.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectgpu,
  drei,
  glyph,
  gsap,
  img2threejs,
  liquidglass,
  liquidlogo,
  postprocessing,
  reactspring,
  scrollama,
  shadergradient,
  threejs,
  twojs,
  zustand,
} from "../dist/sources/packages.js";
import { mockFetch } from "./helpers.mjs";

const ADAPTERS = {
  threejs,
  drei,
  twojs,
  scrollama,
  reactspring,
  zustand,
  glyph,
  postprocessing,
  detectgpu,
  shadergradient,
  liquidlogo,
  liquidglass,
  img2threejs,
  gsap,
};

// A path that satisfies each adapter's `include` filter, with the category we expect.
const CASES = {
  threejs: { path: "/examples/jsm/controls/OrbitControls.js", category: "controls", lang: "js" },
  drei: { path: "/src/core/Html.tsx", category: "core", lang: "tsx" },
  twojs: { path: "/src/effects/Stage.js", category: "effects", lang: "js" },
  scrollama: { path: "/src/index.js", category: "src", lang: "js" },
  reactspring: { path: "/packages/core/src/SpringValue.ts", category: "core", lang: "ts" },
  zustand: { path: "/src/middleware/persist.ts", category: "middleware", lang: "ts" },
  glyph: { path: "/packages/raster/src/bake.ts", category: "raster", lang: "ts" },
  postprocessing: { path: "/src/effects/BloomEffect.js", category: "effects", lang: "js" },
  detectgpu: { path: "/src/index.ts", category: "index.ts", lang: "ts" },
  shadergradient: { path: "/packages/react/src/Gradient.glsl", category: "react", lang: "glsl" },
  liquidlogo: { path: "/main.js", category: "main.js", lang: "js" },
  liquidglass: { path: "/glass.mjs", category: "glass.mjs", lang: "mjs" },
  img2threejs: { path: "/forge/pipeline/run.py", category: "pipeline", lang: "py" },
  gsap: { path: "/skills/scrolltrigger/README.md", category: "scrolltrigger", lang: "md" },
};
const NOISE = ["/README.md.bak", "/docs/guide.html", "/package.json"]; // never match any include

function serve() {
  const requested = [];
  mockFetch((url) => {
    requested.push(url);
    const u = new URL(url);
    if (u.host === "data.jsdelivr.com" && !u.search) {
      return { body: JSON.stringify({ tags: { latest: "9.9.9" } }) };
    }
    if (u.host === "data.jsdelivr.com") {
      const files = [...Object.values(CASES), ...NOISE.map((path) => ({ path }))].map((c) => ({
        name: c.path,
      }));
      return { body: JSON.stringify({ files }) };
    }
    if (u.host === "api.github.com") {
      const tree = [...Object.values(CASES).map((c) => c.path), ...NOISE].map((path) => ({
        path: path.slice(1),
        type: "blob",
      }));
      tree.push({ path: "src/dir", type: "tree" }); // directories must be ignored
      return { body: JSON.stringify({ tree }) };
    }
    if (u.pathname.endsWith("/missing.ts")) return { status: 404 };
    if (u.pathname.endsWith("/limited.ts")) return { status: 429, headers: { "retry-after": "0" } };
    return { body: `// contents of ${u.pathname}` };
  });
  return requested;
}

describe("package adapters", () => {
  for (const [name, c] of Object.entries(CASES)) {
    const adapter = ADAPTERS[name];

    it(`${name}: lists, filters and fetches a file`, async () => {
      serve();
      const res = await adapter.search({ limit: 100 });
      const hit = res.find((r) => r.id === c.path);
      assert.ok(hit, `expected ${c.path} among ${res.map((r) => r.id)}`);
      assert.equal(hit.category, c.category);
      assert.deepEqual(hit.tags, [c.category, c.lang]);
      assert.ok(!res.some((r) => NOISE.includes(r.id)), "files outside `include` are excluded");

      const cats = await adapter.listCategories();
      assert.ok(cats.some((x) => x.id === c.category && x.count >= 1));

      const d = await adapter.getResource(c.path);
      assert.match(d.code[c.lang], /contents of/);
      assert.equal(d.id, c.path);
      assert.equal(d.extra.path, c.path);
    });
  }
});

describe("package adapter behavior", () => {
  it("filters by query and category, and clamps the limit", async () => {
    serve();
    const d = drei;
    assert.deepEqual(
      (await d.search({ query: "HTML" })).map((r) => r.id),
      ["/src/core/Html.tsx"],
    );
    assert.equal((await d.search({ category: "core" })).length, 1);
    assert.equal((await d.search({ category: "nope" })).length, 0);
    assert.equal((await d.search({ limit: 0 })).length, 1);
  });

  it("accepts ids with or without the leading slash", async () => {
    serve();
    const a = await zustand.getResource("src/middleware/persist.ts");
    const b = await zustand.getResource("/src/middleware/persist.ts");
    assert.equal(a.id, "/src/middleware/persist.ts");
    assert.equal(b.id, a.id);
  });

  it("returns null for a missing file but surfaces rate limits", async () => {
    serve();
    assert.equal(await detectgpu.getResource("/src/missing.ts"), null);
    await assert.rejects(detectgpu.getResource("/src/limited.ts"), /HTTP 429/);
  });

  it("builds the right raw URLs for GitHub and jsDelivr sources", async () => {
    const requested = serve();
    await glyph.getResource("/packages/raster/src/urlcheck.ts");
    await twojs.search({ limit: 1 });
    await twojs.getResource("/src/effects/UrlCheck.js");
    assert.ok(
      requested.includes(
        "https://raw.githubusercontent.com/pmndrs/glyph/main/packages/raster/src/urlcheck.ts",
      ),
    );
    assert.ok(
      requested.some((u) =>
        u.startsWith("https://cdn.jsdelivr.net/npm/two.js@9.9.9/src/effects/UrlCheck.js"),
      ),
    );
  });
});
