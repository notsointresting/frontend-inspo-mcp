// Registry (shadcn-schema) adapters: shared factory logic + each site's URL/index wiring.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aceternity,
  canvasui,
  fancy,
  magicui,
  makeRegistryAdapter,
  reactbits,
  shadcn,
  vengeanceui,
} from "../dist/sources/registry.js";
import { mockFetch } from "./helpers.mjs";

const INDEX = [
  {
    name: "button",
    type: "registry:ui",
    title: "Button",
    description: "A clickable thing",
    categories: ["forms"],
  },
  {
    name: "card",
    type: "registry:ui",
    description: "A container",
    categories: ["layout", "forms"],
  },
  { name: "marquee", type: "registry:component", description: "Scrolling text" },
  { name: "index", type: "registry:ui" }, // meta: must be dropped
  { name: "default", type: "registry:style" }, // meta: must be dropped
  { type: "registry:ui" }, // nameless: must be dropped
];

const ITEM = {
  name: "button",
  type: "registry:ui",
  title: "Button",
  description: "A clickable thing",
  categories: ["forms"],
  dependencies: ["clsx"],
  registryDependencies: ["utils"],
  files: [
    { path: "ui/button.tsx", content: "export const Button = 1;" },
    { path: "ui/button-extra.tsx", content: "export const Extra = 2;" }, // same language -> suffixed key
    { path: "ui/button.css", content: ".b{}" },
    { path: "ui/empty.tsx", content: "" }, // no content -> skipped
    { path: "ui/data.weird", content: "x" }, // unknown extension -> ext as language
  ],
};

let seq = 0;
function makeAdapter(handler) {
  const n = ++seq; // fetch.ts caches by URL, so every adapter gets its own URLs
  const calls = mockFetch(handler);
  const adapter = makeRegistryAdapter({
    id: "shadcn",
    label: "T",
    description: "d",
    homepage: "https://example.test/",
    base: `https://example.test/${n}`,
    indexUrl: `https://example.test/${n}/index.json`,
    indexItems: (p) => (Array.isArray(p) ? p : []),
    itemUrl: (base, name) => `${base}/r/${name}.json`,
    license: "MIT",
  });
  return { adapter, calls };
}

const serve =
  (over = {}) =>
  (url) => {
    if (url in over) return over[url];
    if (url.endsWith("/index.json")) return { body: JSON.stringify(INDEX) };
    if (url.endsWith("/r/button.json")) return { body: JSON.stringify(ITEM) };
    if (url.endsWith("/r/nameless.json")) return { body: JSON.stringify({ type: "x" }) };
    if (url.endsWith("/r/limited.json")) return { status: 429, headers: { "retry-after": "0" } };
    return { status: 404 };
  };

describe("registry factory", () => {
  it("drops meta and nameless entries from search", async () => {
    const { adapter } = makeAdapter(serve());
    const res = await adapter.search({});
    assert.deepEqual(
      res.map((r) => r.id),
      ["button", "card", "marquee"],
    );
    assert.equal(res[0].title, "Button");
    assert.equal(res[2].title, "marquee"); // falls back to the name
    assert.equal(res[2].category, "registry:component"); // falls back to the type
  });

  it("filters by query (name, title or description) and by category or type", async () => {
    const { adapter } = makeAdapter(serve());
    assert.deepEqual(
      (await adapter.search({ query: "SCROLLING" })).map((r) => r.id),
      ["marquee"],
    );
    assert.deepEqual(
      (await adapter.search({ category: "layout" })).map((r) => r.id),
      ["card"],
    );
    assert.deepEqual(
      (await adapter.search({ category: "registry:component" })).map((r) => r.id),
      ["marquee"],
    );
    assert.deepEqual(await adapter.search({ query: "zzz" }), []);
  });

  it("clamps the limit to between 1 and 100", async () => {
    const { adapter } = makeAdapter(serve());
    assert.equal((await adapter.search({ limit: 1 })).length, 1);
    assert.equal((await adapter.search({ limit: 0 })).length, 1);
    assert.equal((await adapter.search({ limit: 1000 })).length, 3);
  });

  it("counts categories, most common first, using the type when uncategorised", async () => {
    const { adapter } = makeAdapter(serve());
    const cats = await adapter.listCategories();
    assert.deepEqual(cats[0], { id: "forms", label: "forms", count: 2 });
    assert.ok(cats.some((c) => c.id === "registry:component" && c.count === 1));
  });

  it("downloads the index only once", async () => {
    const { adapter, calls } = makeAdapter(serve());
    await adapter.search({});
    await adapter.listCategories();
    assert.equal(calls.filter((u) => u.endsWith("/index.json")).length, 1);
  });

  it("assembles code per language and keeps same-language files apart", async () => {
    const { adapter } = makeAdapter(serve());
    const d = await adapter.getResource("button");
    assert.equal(d.code.tsx, "export const Button = 1;");
    assert.equal(d.code["tsx:ui/button-extra.tsx"], "export const Extra = 2;");
    assert.equal(d.code.css, ".b{}");
    assert.equal(d.code.weird, "x");
    assert.equal("ui/empty.tsx" in d.code, false);
    assert.deepEqual(d.extra.dependencies, ["clsx"]);
    assert.equal(d.license, "MIT");
  });

  it("returns null for missing or nameless items and surfaces rate limits", async () => {
    const { adapter } = makeAdapter(serve());
    assert.equal(await adapter.getResource("missing"), null);
    assert.equal(await adapter.getResource("nameless"), null);
    await assert.rejects(adapter.getResource("limited"), /HTTP 429/);
  });
});

describe("concrete registries", () => {
  // Each site has its own index shape and item URL; call every one and check what it requested.
  const cases = [
    [shadcn, "https://ui.shadcn.com/r/index.json", "ui.shadcn.com/r/styles/new-york/x.json"],
    [magicui, "https://magicui.design/r/registry.json", "magicui.design/r/x.json"],
    [aceternity, null, "ui.aceternity.com"],
    [reactbits, null, "reactbits.dev"],
    [fancy, null, "fancycomponents.dev"],
    [
      vengeanceui,
      "raw.githubusercontent.com/Ashutoshx7/VengeanceUI",
      "VengeanceUI/main/public/r/x.json",
    ],
    [canvasui, null, "x.json"],
  ];

  for (const [adapter, indexHint, itemHint] of cases) {
    it(`${adapter.id}: requests its own index and item URLs and reads both shapes`, async () => {
      const urls = [];
      mockFetch((url) => {
        urls.push(url);
        if (url.includes("x.json")) return { body: JSON.stringify(ITEM) };
        // Serve the index in both common shapes: a bare array and {items: [...]}.
        return {
          body: JSON.stringify(
            url.includes("registry.json") || !url.includes("index.json") ? { items: INDEX } : INDEX,
          ),
        };
      });
      assert.ok((await adapter.search({ limit: 1 })).length <= 1);
      await adapter.getResource("x");
      if (indexHint)
        assert.ok(
          urls.some((u) => u.includes(indexHint)),
          `${adapter.id} index url, got ${urls}`,
        );
      assert.ok(
        urls.some((u) => u.includes(itemHint)),
        `${adapter.id} item url, got ${urls}`,
      );
    });
  }
});
