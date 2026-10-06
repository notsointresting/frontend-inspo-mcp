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

// A clock that only moves forward: advancing it expires the hourly index memo (and the fetch
// cache) without confusing the per-host throttle, which a jump back in time would.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const realNow = Date.now;
let skew = 0;
Date.now = () => realNow() + skew;
const advance = (ms) => {
  skew += ms;
};

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
  { name: "font-geist", title: "Geist", type: "registry:font", files: [] }, // meta: must be dropped
  { type: "registry:ui" }, // nameless: must be dropped
  { name: "two words", type: "registry:ui" }, // not a valid tool id: must be dropped
  { name: "../up", type: "registry:ui" }, // not a valid tool id: must be dropped
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
function makeAdapter(handler, extra = {}) {
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
    ...extra,
  });
  return { adapter, calls, base: `https://example.test/${n}` };
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

const ids = (results) => results.map((r) => r.id);

describe("registry factory", () => {
  it("drops meta, nameless and invalid-id entries from search", async () => {
    const { adapter } = makeAdapter(serve());
    const res = await adapter.search({});
    assert.deepEqual(ids(res), ["button", "card", "marquee"]);
    assert.equal(res[0].title, "Button");
    assert.equal(res[2].title, "marquee"); // falls back to the name
    assert.equal(res[2].category, "registry:component"); // falls back to the type
  });

  it("filters by query (name, title or description) and by category or type", async () => {
    const { adapter } = makeAdapter(serve());
    assert.deepEqual(ids(await adapter.search({ query: "SCROLLING" })), ["marquee"]);
    assert.deepEqual(ids(await adapter.search({ category: "layout" })), ["card"]);
    assert.deepEqual(ids(await adapter.search({ category: "registry:component" })), ["marquee"]);
    assert.deepEqual(await adapter.search({ query: "zzz" }), []);
  });

  it("ranks best match first, ignoring word order and plurals, within the category", async () => {
    const index = [
      { name: "card", type: "registry:ui", description: "Holds a button and text" },
      { name: "shimmer-button", type: "registry:ui", title: "Shimmer Button" },
      { name: "button", type: "registry:ui" }, // untitled: its name ranks as the title
      { name: "forms-kit", type: "registry:block", categories: ["button"] },
    ];
    const { adapter } = makeAdapter(() => ({ body: JSON.stringify(index) }));
    const want = ["button", "shimmer-button", "card", "forms-kit"];
    assert.deepEqual(ids(await adapter.search({ query: "button" })), want);
    // A plural finds the same items (ranked by search.ts; only membership is asserted here).
    assert.deepEqual(ids(await adapter.search({ query: "BUTTONS" })).sort(), [...want].sort());
    assert.deepEqual(ids(await adapter.search({ query: "button shimmer" })), ["shimmer-button"]);
    assert.deepEqual(ids(await adapter.search({ query: "button", limit: 2 })), want.slice(0, 2));
    const blocks = await adapter.search({ query: "button", category: "registry:block" });
    assert.deepEqual(ids(blocks), ["forms-kit"]);
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

  it("shares one index download between concurrent calls and refreshes it hourly", async () => {
    let body = JSON.stringify(INDEX);
    const { adapter, calls } = makeAdapter((url) =>
      url.endsWith("/index.json") ? { body } : { status: 404 },
    );
    await Promise.all([adapter.search({}), adapter.listCategories(), adapter.search({})]);
    assert.equal(calls.length, 1);
    body = JSON.stringify([...INDEX, { name: "new-item", type: "registry:ui" }]);
    advance(59 * MINUTE); // the fetch cache has expired, the index memo has not
    assert.equal((await adapter.search({ limit: 100 })).length, 3);
    assert.equal(calls.length, 1);
    advance(2 * MINUTE);
    assert.deepEqual(ids(await adapter.search({ limit: 100 })), [
      "button",
      "card",
      "marquee",
      "new-item",
    ]);
    assert.equal(calls.length, 2);
  });

  it("does not keep a failed index download", async () => {
    let fail = true;
    const { adapter } = makeAdapter((url) => (fail ? { status: 404 } : serve()(url)));
    await assert.rejects(adapter.search({}), /HTTP 404/);
    fail = false;
    assert.equal((await adapter.search({})).length, 3);
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

  it("returns the item URL as registryUrl and a shadcn install command for it", async () => {
    const { adapter, base } = makeAdapter(serve());
    const d = await adapter.getResource("button");
    assert.equal(d.extra.registryUrl, `${base}/r/button.json`);
    assert.equal(d.extra.install, `npx shadcn@latest add ${base}/r/button.json`);
    assert.deepEqual(d.extra.registryDependencies, ["utils"]);
    assert.deepEqual(
      d.extra.files,
      ITEM.files.map((f) => f.path),
    );
  });

  it("links items to docsUrl pages, falling back to the homepage", async () => {
    const docsUrl = (id, item) =>
      item.type === "registry:ui" ? `https://example.test/docs/${id}` : undefined;
    const { adapter } = makeAdapter(serve(), { docsUrl });
    const urls = Object.fromEntries((await adapter.search({})).map((r) => [r.id, r.url]));
    assert.deepEqual(urls, {
      button: "https://example.test/docs/button",
      card: "https://example.test/docs/card",
      marquee: "https://example.test/",
    });
    const d = await adapter.getResource("button");
    assert.equal(d.url, "https://example.test/docs/button");
    const { adapter: plain } = makeAdapter(serve());
    assert.equal((await plain.getResource("button")).url, "https://example.test/");
  });

  it("returns null for missing or nameless items and surfaces rate limits", async () => {
    const { adapter } = makeAdapter(serve());
    assert.equal(await adapter.getResource("missing"), null);
    assert.equal(await adapter.getResource("nameless"), null);
    await assert.rejects(adapter.getResource("limited"), /HTTP 429/);
  });
});

describe("concrete registries", () => {
  // Each site has its own index and item URL; call every one and check what it requested.
  const cases = [
    [
      shadcn,
      "https://ui.shadcn.com/r/styles/new-york-v4/registry.json",
      "https://ui.shadcn.com/r/styles/new-york-v4/x.json",
    ],
    [magicui, "https://magicui.design/r/registry.json", "https://magicui.design/r/x.json"],
    [
      aceternity,
      "https://ui.aceternity.com/registry.json",
      "https://ui.aceternity.com/registry/x.json",
    ],
    [reactbits, "https://reactbits.dev/r/registry.json", "https://reactbits.dev/r/x.json"],
    [fancy, "https://fancycomponents.dev/r/registry.json", "https://fancycomponents.dev/r/x.json"],
    [
      vengeanceui,
      "https://raw.githubusercontent.com/Ashutoshx7/VengeanceUI/main/public/r/registry.json",
      "https://raw.githubusercontent.com/Ashutoshx7/VengeanceUI/main/public/r/x.json",
    ],
    [canvasui, "https://canvasui.dev/r/registry.json", "https://canvasui.dev/r/x.json"],
  ];

  cases.forEach(([adapter, indexUrl, itemUrl], i) => {
    // Alternate the two index shapes every registry must read: {items: [...]} and a bare array.
    const shape = i % 2 ? "array" : "{items}";
    it(`${adapter.id}: requests its own index and item URLs, reads an ${shape} index`, async () => {
      advance(2 * HOUR); // expire indexes memoized by earlier tests
      const urls = mockFetch((url) => {
        if (url === indexUrl) return { body: JSON.stringify(i % 2 ? INDEX : { items: INDEX }) };
        if (url === itemUrl) return { body: JSON.stringify(ITEM) };
        return { status: 404 };
      });
      assert.equal((await adapter.search({ limit: 1 })).length, 1);
      const d = await adapter.getResource("x");
      assert.deepEqual(urls, [indexUrl, itemUrl]);
      assert.equal(d.id, "x");
      assert.equal(d.extra.registryUrl, itemUrl);
      assert.equal(d.extra.install, `npx shadcn@latest add ${itemUrl}`);
    });
  });

  it("declare their stacks and an id format with a real example", () => {
    const want = {
      shadcn: ["react", "tailwind"],
      magicui: ["react", "tailwind", "animation"],
      aceternity: ["react", "tailwind", "animation"],
      reactbits: ["react", "tailwind", "css", "animation"],
      fancy: ["react", "tailwind", "animation"],
      vengeanceui: ["react", "tailwind", "animation"],
      canvasui: ["react", "javascript", "3d", "animation"],
    };
    for (const [adapter] of cases) {
      assert.deepEqual(adapter.stack, want[adapter.id], adapter.id);
      assert.match(adapter.idFormat, /e\.g\. "[^"]+"/, adapter.id);
      assert.equal(adapter.hasInlineCode, true, adapter.id);
    }
  });

  it("link magicui components and canvasui builds to docs, the rest to the homepage", async () => {
    advance(2 * HOUR);
    // Trimmed from the live indexes.
    const magic = {
      name: "magicui",
      homepage: "https://magicui.design",
      items: [
        {
          name: "marquee",
          type: "registry:ui",
          title: "Marquee",
          description:
            "An infinite scrolling component that can be used to display text, images, or videos.",
          files: [{ path: "registry/magicui/marquee.tsx", type: "registry:ui" }],
        },
        {
          name: "marquee-demo",
          type: "registry:example",
          title: "Marquee Demo",
          description: "Example showing an infinite scrolling component.",
          files: [{ path: "registry/example/marquee-demo.tsx", type: "registry:example" }],
        },
      ],
    };
    const canvas = {
      name: "canvasui",
      homepage: "https://canvasui.dev",
      items: [
        {
          name: "ascii-object-react",
          type: "registry:component",
          title: "AsciiObject (React)",
          description:
            "Renders any GLB/glTF model, SVG, or image in a floating studio scene as ASCII characters chosen by shape, so glyphs trace the object's edges. Built on three.js.",
          dependencies: ["three"],
        },
        {
          name: "cloth-vanilla-webgpu",
          type: "registry:component",
          title: "Cloth (Vanilla, WebGPU)",
          dependencies: ["vgpu"],
        },
      ],
    };
    mockFetch((url) => {
      if (url === "https://magicui.design/r/registry.json") return { body: JSON.stringify(magic) };
      if (url === "https://canvasui.dev/r/registry.json") return { body: JSON.stringify(canvas) };
      if (url.endsWith("registry.json")) return { body: JSON.stringify({ items: INDEX }) };
      return { status: 404 };
    });
    const urls = async (a) =>
      Object.fromEntries((await a.search({ limit: 100 })).map((r) => [r.id, r.url]));
    assert.deepEqual(await urls(magicui), {
      marquee: "https://magicui.design/docs/components/marquee",
      "marquee-demo": "https://magicui.design/",
    });
    assert.deepEqual(await urls(canvasui), {
      "ascii-object-react": "https://canvasui.dev/docs/components/ascii-object",
      "cloth-vanilla-webgpu": "https://canvasui.dev/docs/components/cloth",
    });
    // No reliable per-item page pattern for these.
    for (const a of [aceternity, reactbits, fancy, vengeanceui]) {
      const all = Object.values(await urls(a));
      assert.ok(all.length > 0, a.id);
      for (const u of all) assert.equal(u, a.homepage, a.id);
    }
  });
});

describe("shadcn (Tailwind v4)", () => {
  const INDEX_URL = "https://ui.shadcn.com/r/styles/new-york-v4/registry.json";
  // Trimmed from the live INDEX_URL.
  const V4_INDEX = {
    name: "shadcn/ui",
    homepage: "https://ui.shadcn.com",
    items: [
      {
        name: "index",
        dependencies: ["class-variance-authority", "cn", "lucide-react", "radix-ui"],
        registryDependencies: ["utils"],
        type: "registry:style",
        files: [],
      },
      {
        name: "button",
        dependencies: ["cn", "radix-ui"],
        type: "registry:ui",
        files: [{ path: "registry/new-york-v4/ui/button.tsx", type: "registry:ui" }],
      },
      {
        name: "dashboard-01",
        description: "A dashboard with sidebar, charts and data table.",
        categories: ["dashboard"],
        type: "registry:block",
        files: [
          {
            path: "registry/new-york-v4/blocks/dashboard-01/page.tsx",
            type: "registry:page",
            target: "app/dashboard/page.tsx",
          },
        ],
      },
      {
        name: "use-mobile",
        type: "registry:hook",
        files: [{ path: "registry/new-york-v4/hooks/use-mobile.ts", type: "registry:hook" }],
      },
      { name: "theme-stone", dependencies: [], type: "registry:theme", files: [] },
      {
        name: "accordion-demo",
        registryDependencies: ["accordion"],
        type: "registry:example",
        files: [
          { path: "registry/new-york-v4/examples/accordion-demo.tsx", type: "registry:example" },
        ],
      },
      { name: "font-geist", title: "Geist", type: "registry:font", files: [] },
    ],
  };
  // Trimmed from https://ui.shadcn.com/r/styles/new-york-v4/button.json.
  const V4_BUTTON = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "button",
    dependencies: ["cn", "radix-ui"],
    type: "registry:ui",
    files: [
      {
        path: "registry/new-york-v4/ui/button.tsx",
        content:
          'import * as React from "react"\nimport { cva, type VariantProps } from "class-variance-authority"\nimport { cn } from "cn"\nimport { Slot } from "radix-ui"\n',
        type: "registry:ui",
      },
    ],
  };
  const serveShadcn = (index = V4_INDEX) =>
    mockFetch((url) => {
      if (url === INDEX_URL) return { body: JSON.stringify(index) };
      if (/^https:\/\/ui\.shadcn\.com\/r\/styles\/[a-z0-9-]+\/button\.json$/.test(url)) {
        return { body: JSON.stringify(V4_BUTTON) };
      }
      return { status: 404 };
    });
  const all = async () => (await shadcn.search({ limit: 100 })).map((r) => [r.id, r.url]);

  it("reads the new-york-v4 index as {items} or a bare array and refreshes it hourly", async () => {
    advance(2 * HOUR); // expire the index memoized by earlier tests
    const want = [
      ["button", "https://ui.shadcn.com/docs/components/radix/button"],
      ["dashboard-01", "https://ui.shadcn.com/view/new-york-v4/dashboard-01"],
      ["use-mobile", "https://ui.shadcn.com/"], // hooks have no page of their own
      ["accordion-demo", "https://ui.shadcn.com/view/new-york-v4/accordion-demo"],
    ]; // style, theme and font entries are dropped
    const objectShape = serveShadcn();
    assert.deepEqual(await all(), want);
    assert.equal(objectShape.length, 1);
    const arrayShape = serveShadcn(V4_INDEX.items); // the shape the server tests mock
    advance(30 * MINUTE);
    assert.deepEqual(await all(), want);
    assert.equal(arrayShape.length, 0); // still memoized
    advance(31 * MINUTE);
    assert.deepEqual(await all(), want);
    assert.deepEqual(arrayShape, [INDEX_URL]);
  });

  it("searches the v4 index by query, category and type", async () => {
    serveShadcn();
    assert.deepEqual(ids(await shadcn.search({ query: "dashboard charts" })), ["dashboard-01"]);
    assert.deepEqual(ids(await shadcn.search({ category: "dashboard" })), ["dashboard-01"]);
    assert.deepEqual(ids(await shadcn.search({ category: "registry:hook" })), ["use-mobile"]);
  });

  it("serves new-york-v4 by default and other v4 styles written <style>::<name>", async () => {
    const calls = serveShadcn();
    const d = await shadcn.getResource("button");
    const v4 = "https://ui.shadcn.com/r/styles/new-york-v4/button.json";
    assert.equal(calls.at(-1), v4);
    assert.equal(d.id, "button");
    assert.match(d.code.tsx, /class-variance-authority/);
    assert.equal(d.url, "https://ui.shadcn.com/docs/components/radix/button");
    assert.equal(d.extra.registryUrl, v4);
    assert.equal(d.extra.install, `npx shadcn@latest add ${v4}`);
    for (const [style, docs] of [
      ["base-nova", "base"],
      ["aria-vega", "aria"],
      ["radix-maia", "radix"],
    ]) {
      const s = await shadcn.getResource(`${style}::button`);
      const url = `https://ui.shadcn.com/r/styles/${style}/button.json`;
      assert.equal(calls.at(-1), url);
      assert.equal(s.id, `${style}::button`);
      assert.equal(s.url, `https://ui.shadcn.com/docs/components/${docs}/button`);
      assert.equal(s.extra.install, `npx shadcn@latest add ${url}`);
    }
    assert.equal(await shadcn.getResource("base-nova::nope"), null);
  });

  it("rejects styles outside the allowlist without fetching", async () => {
    const calls = serveShadcn();
    for (const id of ["new-york::button", "evil.example::button", "::button", "a::b::c"]) {
      await assert.rejects(shadcn.getResource(id), /Unknown shadcn style/, id);
    }
    assert.deepEqual(calls, []);
  });
});
