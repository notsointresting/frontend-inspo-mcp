// Fontsource: the font list is ranked locally; get_resource turns one font's /v1/fonts/<id> into
// @font-face rules and install lines. Samples trimmed from api.fontsource.org.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fontsource } from "../dist/sources/fontsource.js";
import { mockFetch } from "./helpers.mjs";

const API = "https://api.fontsource.org/v1/fonts";
const woff2 = (id, file) => `https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/${file}.woff2`;
const LATIN = "U+0000-00FF,U+0131,U+0152-0153";

const font = (id, family, extra) => ({
  id,
  family,
  subsets: ["latin"],
  weights: [400],
  styles: ["normal"],
  defSubset: "latin",
  variable: false,
  lastModified: "2025-09-08",
  category: "sans-serif",
  license: "OFL-1.1",
  type: "google",
  ...extra,
});
const LIST = [
  font("abeezee", "ABeeZee", { subsets: ["latin", "latin-ext"], styles: ["italic", "normal"] }),
  font("fira-code", "Fira Code", {
    subsets: ["cyrillic", "greek", "latin"],
    weights: [300, 400, 500, 600, 700],
    variable: true,
    category: "monospace",
  }),
  font("inter", "Inter", {
    subsets: ["cyrillic", "greek", "latin", "vietnamese"],
    weights: [400, 700],
    styles: ["italic", "normal"],
    variable: true,
  }),
  font("molle", "Molle", { styles: ["italic"], category: "handwriting" }),
  font("noto-sans-jp", "Noto Sans JP", { subsets: ["japanese", "latin"], variable: true }),
  font("Bad Id", "Left out: the id is not a Fontsource id"),
  { id: "no-family" }, // left out: no family
];

/** variants: weight -> style -> subset -> files, as /v1/fonts/<id> returns them. */
function variants(id, weights, styles, subsets) {
  const files = (s, w, st) => ({
    url: {
      woff2: woff2(id, `${s}-${w}-${st}`),
      woff: woff2(id, `${s}-${w}-${st}`).replace(/2$/, ""),
    },
  });
  return Object.fromEntries(
    weights.map((w) => [
      w,
      Object.fromEntries(
        styles.map((st) => [st, Object.fromEntries(subsets.map((s) => [s, files(s, w, st)]))]),
      ),
    ]),
  );
}
const detail = (f, v) => ({
  ...f,
  version: "v23",
  source: "https://github.com/google/fonts",
  npmVersion: "5.3.0",
  unicodeRange: { "latin-ext": "U+0100-02BA,U+02BD-02C5", latin: LATIN },
  variants: v,
});
const DETAILS = {
  abeezee: detail(
    LIST[0],
    variants("abeezee", [400], ["italic", "normal"], ["latin-ext", "latin"]),
  ),
  inter: detail(LIST[2], {
    ...variants("inter", [700, 400], ["italic", "normal"], ["cyrillic", "latin"]),
    // Never written into the CSS: not HTTPS, and a URL that would break out of url("...").
    900: { normal: { latin: { url: { woff2: "http://example.com/x.woff2" } } } },
    950: { normal: { latin: { url: { woff2: 'https://x.test/a") ; } body { color: red' } } } },
  }),
  molle: detail(LIST[3], variants("molle", [400], ["italic"], ["latin"])),
};

function serve(url) {
  if (url === API) return { body: JSON.stringify(LIST) };
  const id = url.slice(API.length + 1);
  if (id === "broken-api") return { status: 500 };
  return Object.hasOwn(DETAILS, id)
    ? { body: JSON.stringify(DETAILS[id]) }
    : { status: 404, body: '{"error":"Not Found"}' };
}

const ids = (rows) => rows.map((r) => r.id);

describe("fontsource", () => {
  it("is a font source with inline code", () => {
    assert.equal(fontsource.hasInlineCode, true);
    assert.deepEqual(fontsource.stack, ["fonts"]);
    assert.match(fontsource.idFormat, /"inter"/);
    assert.equal(fontsource.heavy, undefined);
  });

  it("ranks the font list by family, id, category and subsets, read once", async () => {
    const calls = mockFetch(serve);
    const all = await fontsource.search({});
    assert.deepEqual(ids(all), ["abeezee", "fira-code", "inter", "molle", "noto-sans-jp"]);
    assert.deepEqual(all[2], {
      source: "fontsource",
      id: "inter",
      title: "Inter",
      description: "sans-serif; weights 400, 700; italic and normal; variable",
      category: "sans-serif",
      url: "https://fontsource.org/fonts/inter",
      tags: ["cyrillic", "greek", "latin", "vietnamese"],
    });
    assert.deepEqual(ids(await fontsource.search({ query: "fira" })), ["fira-code"]);
    assert.deepEqual(ids(await fontsource.search({ query: "japanese" })), ["noto-sans-jp"]);
    assert.deepEqual(ids(await fontsource.search({ query: "cyrillic" })), ["fira-code", "inter"]);
    assert.deepEqual(ids(await fontsource.search({ query: "mono" })), ["fira-code"]);
    assert.deepEqual(ids(await fontsource.search({ category: "Handwriting" })), ["molle"]);
    assert.deepEqual(ids(await fontsource.search({ query: "inter", category: "serif" })), []);
    assert.equal((await fontsource.search({ limit: 2 })).length, 2);
    assert.deepEqual(calls, [API]);
  });

  it("lists the categories with counts, largest first", async () => {
    mockFetch(serve);
    assert.deepEqual(await fontsource.listCategories(), [
      { id: "sans-serif", label: "Sans Serif", count: 3 },
      { id: "handwriting", label: "Handwriting", count: 1 },
      { id: "monospace", label: "Monospace", count: 1 },
    ]);
  });

  it("builds @font-face rules and static imports for a static font", async () => {
    const calls = mockFetch(serve);
    const d = await fontsource.getResource("abeezee");
    assert.deepEqual(calls, [`${API}/abeezee`]);
    const face = (style) =>
      [
        `/* abeezee-latin-400-${style} */`,
        "@font-face {",
        '  font-family: "ABeeZee";',
        `  font-style: ${style};`,
        "  font-display: swap;",
        "  font-weight: 400;",
        `  src: url("${woff2("abeezee", `latin-400-${style}`)}") format("woff2");`,
        `  unicode-range: ${LATIN};`,
        "}",
      ].join("\n");
    assert.equal(d.code.css, `${face("normal")}\n\n${face("italic")}\n`);
    assert.equal(
      d.code["install.md"],
      [
        "# ABeeZee (Fontsource)",
        "",
        "```sh",
        "npm install @fontsource/abeezee",
        "```",
        "",
        "```js",
        'import "@fontsource/abeezee/400.css";',
        'import "@fontsource/abeezee/400-italic.css";',
        "```",
        "",
        "```css",
        "body {",
        '  font-family: "ABeeZee", sans-serif;',
        "}",
        "```",
        "",
      ].join("\n"),
    );
    assert.equal(d.title, "ABeeZee");
    assert.equal(d.url, "https://fontsource.org/fonts/abeezee");
    assert.equal(d.license, "OFL-1.1");
    assert.deepEqual(d.extra, {
      weights: [400],
      styles: ["italic", "normal"],
      subsets: ["latin", "latin-ext"],
      defaultSubset: "latin",
      variable: false,
      npmPackage: "@fontsource/abeezee",
      npmVersion: "5.3.0",
    });
  });

  it("points a variable font at its variable package and skips unsafe file URLs", async () => {
    mockFetch(serve);
    const d = await fontsource.getResource("inter");
    const md = d.code["install.md"];
    assert.match(md, /^npm install @fontsource-variable\/inter$/m);
    assert.match(md, /^import "@fontsource-variable\/inter";$/m);
    assert.match(md, /^ {2}font-family: "Inter Variable", sans-serif;$/m);
    // Ascending weights, normal before italic, default subset only; 900 and 950 are dropped.
    assert.deepEqual(
      [...d.code.css.matchAll(/\/\* (\S+) \*\//g)].map((m) => m[1]),
      [
        "inter-latin-400-normal",
        "inter-latin-400-italic",
        "inter-latin-700-normal",
        "inter-latin-700-italic",
      ],
    );
    assert.doesNotMatch(d.code.css, /example\.com|color: red/);
    assert.equal(d.extra.variable, true);
    assert.equal(d.extra.npmPackage, "@fontsource-variable/inter");
  });

  it("imports an italic-only font file by file, with its generic family", async () => {
    mockFetch(serve);
    const md = (await fontsource.getResource("molle")).code["install.md"];
    assert.match(md, /```js\nimport "@fontsource\/molle\/400-italic\.css";\n```/);
    assert.match(md, /font-family: "Molle", cursive;/);
  });

  it("rejects ids that are not Fontsource ids without a request, and maps 404 to null", async () => {
    const calls = mockFetch(serve);
    for (const id of ["Inter", "kind/slug", "../inter", "a--b", "-inter", "inter-", ""]) {
      assert.equal(await fontsource.getResource(id), null, id);
    }
    assert.deepEqual(calls, []);
    assert.equal(await fontsource.getResource("no-such-font"), null);
    await assert.rejects(fontsource.getResource("broken-api"), /HTTP 500/);
  });
});
