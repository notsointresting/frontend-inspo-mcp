// tweakcn: theme presets (registry:style items carrying cssVars, no files) turned into the
// Tailwind v4 CSS a shadcn project uses plus the raw tokens. Samples trimmed from tweakcn.com.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tweakcn } from "../dist/sources/tweakcn.js";
import { mockFetch } from "./helpers.mjs";

const INDEX_URL = "https://tweakcn.com/r/registry.json";
const THEME_URL = "https://tweakcn.com/r/themes/modern-minimal.json";
const LETTER_SPACING = { "@layer base": { body: { "letter-spacing": "var(--tracking-normal)" } } };
// The index repeats each theme's variables (rounded); the theme file has the exact ones.
const INDEX = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "tweakcn-theme-registry",
  homepage: "http://tweakcn.com",
  items: [
    {
      name: "modern-minimal",
      type: "registry:style",
      title: "Modern Minimal",
      description: "A theme based on the Modern Minimal color palette.",
      css: LETTER_SPACING,
      cssVars: { theme: { radius: "0.375rem" }, light: { background: "oklch(1.00 0 0)" } },
    },
    {
      name: "t3-chat",
      type: "registry:style",
      title: "T3 Chat",
      description: "A theme based on the T3 Chat color palette.",
      cssVars: { light: { background: "oklch(0.98 0.01 320.66)" } },
    },
  ],
};
const THEME = {
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  name: "modern-minimal",
  type: "registry:style",
  css: LETTER_SPACING,
  cssVars: {
    theme: { "font-sans": "Inter, sans-serif", radius: "0.375rem" },
    light: { background: "oklch(1.0000 0 0)", primary: "oklch(0.6231 0.1880 259.8145)" },
    dark: { background: "oklch(0.2046 0 0)", primary: "oklch(0.6231 0.1880 259.8145)" },
  },
};

const serve = (url) => {
  if (url === INDEX_URL) return { body: JSON.stringify(INDEX) };
  if (url === THEME_URL) return { body: JSON.stringify(THEME) };
  if (url.endsWith("/themes/light-only.json")) {
    return { body: JSON.stringify({ name: "light-only", cssVars: { light: { radius: "0" } } }) };
  }
  if (url.endsWith("/themes/limited.json")) return { status: 429, headers: { "retry-after": "0" } };
  return { status: 500, body: "<!DOCTYPE html><html></html>" }; // how tweakcn answers a miss
};

describe("tweakcn", () => {
  it("lists the presets and filters them by query and category", async () => {
    const calls = mockFetch(serve);
    const all = await tweakcn.search({});
    assert.deepEqual(
      all.map((r) => [r.id, r.title, r.category]),
      [
        ["modern-minimal", "Modern Minimal", "theme"],
        ["t3-chat", "T3 Chat", "theme"],
      ],
    );
    assert.deepEqual(
      (await tweakcn.search({ query: "t3" })).map((r) => r.id),
      ["t3-chat"],
    );
    assert.equal((await tweakcn.search({ category: "Theme" })).length, 2);
    assert.deepEqual(await tweakcn.search({ category: "registry:ui" }), []);
    assert.equal((await tweakcn.search({ limit: 1 })).length, 1);
    assert.deepEqual(await tweakcn.listCategories(), [{ id: "theme", label: "theme", count: 2 }]);
    assert.deepEqual(calls, [INDEX_URL]); // downloaded once
  });

  it("turns a theme's variables into Tailwind v4 CSS and a tokens file", async () => {
    const calls = mockFetch(serve);
    const d = await tweakcn.getResource("modern-minimal");
    assert.equal(
      d.code.css,
      [
        ":root {",
        "  --background: oklch(1.0000 0 0);",
        "  --primary: oklch(0.6231 0.1880 259.8145);",
        "}",
        "",
        ".dark {",
        "  --background: oklch(0.2046 0 0);",
        "  --primary: oklch(0.6231 0.1880 259.8145);",
        "}",
        "",
        "@theme inline {",
        "  --font-sans: Inter, sans-serif;",
        "  --radius: 0.375rem;",
        "}",
        "",
        "@layer base {",
        "  body {",
        "    letter-spacing: var(--tracking-normal);",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    assert.deepEqual(JSON.parse(d.code["tokens.json"]), THEME.cssVars);
    assert.equal(d.title, "Modern Minimal"); // from the index: the theme file has no title
    assert.equal(d.description, "A theme based on the Modern Minimal color palette.");
    assert.equal(d.license, "Apache-2.0");
    assert.equal(d.extra.install, `npx shadcn@latest add ${THEME_URL}`);
    assert.ok(calls.includes(THEME_URL));
  });

  it("leaves out empty blocks and titles a theme the index does not list by its name", async () => {
    mockFetch(serve);
    const d = await tweakcn.getResource("light-only");
    assert.equal(d.title, "light-only");
    assert.equal(d.code.css, ":root {\n  --radius: 0;\n}\n");
  });

  it("returns null for an unknown theme and surfaces rate limits", async () => {
    mockFetch(serve);
    assert.equal(await tweakcn.getResource("no-such-theme"), null);
    await assert.rejects(tweakcn.getResource("limited"), /HTTP 429/);
  });
});
