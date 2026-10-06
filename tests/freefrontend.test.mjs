// FreeFrontend adapter: parsing of the current card markup, collection discovery from the
// sitemap, and how a query (or a bare snippet id) picks the collections to read.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { freefrontend } from "../dist/sources/freefrontend.js";
import { mockFetch } from "./helpers.mjs";

// Every test controls the responses, so switch off fetch.ts's response cache.
process.env.FRONTEND_INSPO_CACHE_TTL_MS = "0";

const b64 = (s) => Buffer.from(s).toString("base64");

// Mirrors the redesigned markup: cards are <article.snippet-card>; the preview/code
// popover is a *sibling* keyed by the card's popovertarget id.
const PAGE = `<html><body><main>
<div class=grid>
<article class="snippet-card" id="2026-01-01-alpha-l">
  <div class="card-media-wrapper" popovertarget="2026-01-01-alpha"><img src="/img/a.webp" alt=""></div>
  <div class="card-body">
    <div class="card-meta-strip"><span class="meta-tech">HTML</span><span class="meta-tech">CSS</span></div>
    <h3 class="card-title"><a href="#alpha">Alpha Card</a></h3>
    <div class="card-description"><p>An <code>alpha</code> card.</p></div>
    <dl class="card-readout"><div class="readout-row"><dt>Features</dt><dd>Grid \u00b7 Hover</dd></div></dl>
    <footer><a class="author-link" href="https://codepen.io/ada">Ada</a></footer>
  </div>
</article>
<article class="snippet-card" id="beta-l">
  <div class="card-media-wrapper" popovertarget="beta"></div>
  <div class="card-body"><h3 class="card-title"><a href="#beta">Beta Embed</a></h3></div>
</article>
</div>
<div id="2026-01-01-alpha" popover>
  <pre class="code-editor" data-lang="html" data-original="${b64("<div>hi</div>")}"><code></code></pre>
  <pre class="code-editor" data-lang="css" data-original="${b64("div{color:red}")}"><code></code></pre>
  <textarea id="prompt-2026-01-01-alpha">Make it pop</textarea>
</div>
<div id="beta" popover><p class="codepen"></p></div>
</main></body></html>`;

/** One card in the live markup (no popover: these cards have no inline code). */
const card = (id, title, desc = "") => `<article class=snippet-card id=${id}-l>
<div class=card-media-wrapper popovertarget=${id}></div><div class=card-body>
<div class=card-meta-strip><span class=meta-tech>HTML</span><span class=meta-sep>·</span><span class=meta-tech>CSS</span></div>
<h3 class=card-title><a href=#${id}-l class=card-title-link>${title}</a></h3>
<div class=card-description><p>${desc}</p></div></div></article>`;
const listing = (...cards) =>
  `<html><body><main class=content><div class=grid>${cards.join("")}</div></main></body></html>`;

// A cut of the live sitemap.xml: one-segment pages are collections; the home page, top
// category landing pages (*-code-examples), info pages and /code/<slug>/ item pages are not.
const entry = (loc, prio = "0.9", freq = "weekly") =>
  `<url><loc>${loc}</loc><lastmod>2026-05-08</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`;
const SITEMAP = `<?xml version="1.0" encoding="utf-8" standalone="yes"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[
  entry("https://freefrontend.com/", "1.0", "daily"),
  entry("https://freefrontend.com/alpine-js/"),
  entry("https://freefrontend.com/bootstrap-buttons/"),
  entry("https://freefrontend.com/bootstrap-cards/"),
  entry("https://freefrontend.com/css-@property/"),
  entry("https://freefrontend.com/css-3d-buttons/"),
  entry("https://freefrontend.com/css-button-hover-effects/"),
  entry("https://freefrontend.com/css-buttons/"),
  entry("https://freefrontend.com/css-hover-effects/"),
  entry("https://freefrontend.com/javascript-buttons/"),
  entry("https://freefrontend.com/tailwind-buttons/"),
  entry("https://freefrontend.com/tailwind-navbars/"),
  entry("https://freefrontend.com/webgl/"),
  entry("https://www.freefrontend.com/js-fancy-things/"),
  entry("https://evil.example/css-bad-one/"),
  entry("https://freefrontend.com.evil.example/css-bad-two/"),
  entry("https://freefrontend.com/css-%20bad/"),
  entry("https://freefrontend.com/code/gooey-liquid-radio-buttons-2026-05-07/", "0.8", "monthly"),
  entry("https://freefrontend.com/css-code-examples/", "0.8", "monthly"),
  entry("https://freefrontend.com/react-code-examples/", "0.8", "monthly"),
  entry("https://freefrontend.com/about-me/", "0.8", "monthly"),
  entry("https://freefrontend.com/privacy-policy/", "0.8", "monthly"),
].join("")}</urlset>`;

const PAGES = {
  "tailwind-navbars": listing(
    card("2026-02-01-responsive-menu", "Responsive Menu", "Collapses into a drawer."),
    card("2026-02-02-animated-navbar", "Tailwind Animated Navbar", "A sliding indicator."),
    card("2026-02-03-glass-header", "Glass Header", "A frosted navbar for landing pages."),
  ),
  "css-buttons": listing(
    card("2026-03-01-shared", "Shared Button"),
    card("2026-03-02-push", "Push Button"),
  ),
  "javascript-buttons": listing(card("2026-03-01-shared", "Shared Button")),
};

let sitemap = `<?xml version="1.0"?><urlset></urlset>`; // first: a sitemap without collections
let sitemapRequests = 0;
const failing = new Set();
const calls = mockFetch((url) => {
  if (url === "https://freefrontend.com/sitemap.xml") {
    sitemapRequests++;
    return { body: sitemap };
  }
  if (url.includes("/page/")) return { status: 404 };
  const slug = new URL(url).pathname.split("/")[1];
  if (failing.has(slug)) return { status: 404 };
  return { body: PAGES[slug] ?? PAGE };
});

/** The collections `run()` reads (their first pages), in request order, and its result. */
async function collectionsRead(run) {
  calls.length = 0;
  const result = await run();
  assert.ok(!calls.some((u) => u.includes("?")), "robots.txt disallows URLs with a query string");
  const read = calls
    .filter((u) => !u.includes("/page/") && !u.endsWith("/sitemap.xml"))
    .map((u) => decodeURI(new URL(u).pathname.split("/")[1]));
  return { result, read };
}

/** The collections read by `search(args)`, and its results. */
async function readBy(args) {
  const { result, read } = await collectionsRead(() => freefrontend.search(args));
  return { results: result, read };
}

/** The collections read by `getResource(id)`, and the resource. */
const lookUp = (id) => collectionsRead(() => freefrontend.getResource(id));

describe("freefrontend", () => {
  it("fails loudly when the sitemap lists no collections (format change)", async () => {
    await assert.rejects(freefrontend.listCategories(), /no collections in sitemap/);
    sitemap = SITEMAP;
  });

  it("parses cards: title, id, tags, author, and keeps code out of summaries", async () => {
    const res = await freefrontend.search({ tech: "css", limit: 5 });
    assert.deepEqual(
      res.map((r) => r.title),
      ["Alpha Card", "Beta Embed"],
    );
    const [alpha] = res;
    assert.equal(alpha.id, "2026-01-01-alpha");
    assert.equal(alpha.description, "An alpha card.");
    assert.deepEqual(alpha.tags, ["HTML", "CSS", "Grid", "Hover"]);
    assert.equal(alpha.author, "Ada");
    assert.equal("code" in alpha, false);
    assert.equal("aiPrompt" in alpha, false);
  });

  it("decodes inline code and the AI prompt from the sibling popover", async () => {
    const d = await freefrontend.getResource("css-hover-effects::2026-01-01-alpha");
    assert.equal(d.code.html, "<div>hi</div>");
    assert.equal(d.code.css, "div{color:red}");
    assert.equal(d.aiPrompt, "Make it pop");
  });

  it("returns no code for CodePen-embed cards", async () => {
    const d = await freefrontend.getResource("css-hover-effects::beta");
    assert.equal(d.title, "Beta Embed");
    assert.equal(d.code, undefined);
  });

  it("lists the top categories, then every sitemap collection with its parent", async () => {
    const cats = await freefrontend.listCategories();
    assert.deepEqual(
      cats.slice(0, 5).map((c) => c.id),
      [
        "html-code-examples",
        "css-code-examples",
        "javascript-code-examples",
        "bootstrap-code-examples",
        "tailwind-code-examples",
      ],
    );
    const rest = cats.slice(5);
    assert.deepEqual(
      rest.map((c) => c.id),
      [
        "alpine-js",
        "bootstrap-buttons",
        "bootstrap-cards",
        "css-@property",
        "css-3d-buttons",
        "css-button-hover-effects",
        "css-buttons",
        "css-hover-effects",
        "javascript-buttons",
        "tailwind-buttons",
        "tailwind-navbars",
        "webgl",
        "js-fancy-things",
      ],
      "no home, item, landing, info, foreign-host or invalid-id pages",
    );
    const byId = Object.fromEntries(rest.map((c) => [c.id, c]));
    assert.deepEqual(byId["css-hover-effects"], {
      id: "css-hover-effects",
      label: "css hover effects",
      parent: "css-code-examples",
    });
    assert.equal(byId["javascript-buttons"].parent, "javascript-code-examples");
    assert.equal(byId["css-@property"].parent, "css-code-examples");
    assert.equal(byId["alpine-js"].parent, undefined);
    assert.equal(byId.webgl.parent, undefined);
  });

  it("reads the collection a query names, which the default listing never could", async () => {
    const { results, read } = await readBy({ query: "navbar" });
    assert.deepEqual(read, ["tailwind-navbars"]);
    // Best match first: title, then description; the rest match through their collection.
    assert.deepEqual(
      results.map((r) => r.title),
      ["Tailwind Animated Navbar", "Glass Header", "Responsive Menu"],
    );
    assert.ok(results.every((r) => r.category === "tailwind-navbars"));
  });

  it("reads up to 3 collections, the most general first", async () => {
    assert.deepEqual((await readBy({ query: "buttons" })).read, [
      "bootstrap-buttons",
      "css-buttons",
      "javascript-buttons",
    ]);
    // More query words matched beats a shorter slug.
    assert.equal((await readBy({ query: "hover button" })).read[0], "css-button-hover-effects");
  });

  it("prefers the collections of the tech hint", async () => {
    assert.deepEqual((await readBy({ query: "button", tech: "css" })).read, [
      "css-buttons",
      "css-3d-buttons",
      "css-button-hover-effects",
    ]);
    assert.deepEqual((await readBy({ query: "button", tech: "Tailwind" })).read, [
      "tailwind-buttons",
      "bootstrap-buttons",
      "css-buttons",
    ]);
    assert.equal((await readBy({ query: "button", tech: "js" })).read[0], "javascript-buttons");
    // A top category id reads as its tech hint: it is a landing page without cards.
    const top = await readBy({ category: "tailwind-code-examples", query: "button" });
    assert.equal(top.read[0], "tailwind-buttons");
  });

  it("falls back to the default listing when no collection matches the query", async () => {
    assert.deepEqual((await readBy({ query: "zebra" })).read, ["css-hover-effects"]);
    assert.deepEqual((await readBy({ query: "zebra", tech: "bootstrap" })).read, [
      "bootstrap-cards",
    ]);
    assert.deepEqual((await readBy({ category: "css-code-examples" })).read, ["css-hover-effects"]);
    // Only real tech hints have a default, not inherited object keys.
    assert.deepEqual((await readBy({ tech: "constructor" })).read, ["css-hover-effects"]);
  });

  it("reads exactly the category it is given", async () => {
    const { results, read } = await readBy({ category: "webgl", query: "alpha card" });
    assert.deepEqual(read, ["webgl"]);
    assert.deepEqual(
      results.map((r) => r.id),
      ["2026-01-01-alpha"],
    );
  });

  it("lists a snippet found in several collections once, from the best collection", async () => {
    const { results, read } = await readBy({ query: "buttons", limit: 10 });
    assert.deepEqual(read.slice(1), ["css-buttons", "javascript-buttons"]);
    const shared = results.filter((r) => r.id === "2026-03-01-shared");
    assert.equal(shared.length, 1);
    assert.equal(shared[0].category, "css-buttons");
  });

  it("skips a collection that fails, unless every one does", async () => {
    failing.add("bootstrap-buttons");
    try {
      const { results, read } = await readBy({ query: "buttons" });
      assert.deepEqual(read, ["bootstrap-buttons", "css-buttons", "javascript-buttons"]);
      assert.ok(results.length > 0);
      assert.ok(results.every((r) => r.category !== "bootstrap-buttons"));
      failing.add("tailwind-navbars");
      await assert.rejects(freefrontend.search({ query: "navbar" }), /HTTP 404/);
    } finally {
      failing.clear();
    }
  });

  it("looks up a bare snippet id in the collections its words name", async () => {
    // The date prefix is dropped; "animated navbar" names tailwind-navbars.
    const { result, read } = await lookUp("2026-02-02-animated-navbar");
    assert.deepEqual(read, ["tailwind-navbars"]);
    assert.equal(result.title, "Tailwind Animated Navbar");
    assert.equal(result.category, "tailwind-navbars");
  });

  it("falls back to the general collections for a bare id, then returns null", async () => {
    // "alpha" names no collection: the safety net has it.
    const alpha = await lookUp("2026-01-01-alpha");
    assert.deepEqual(alpha.read, ["css-hover-effects"]);
    assert.equal(alpha.result.code.css, "div{color:red}");

    // The 3 collections "buttons" picks, then the safety net; a failing one is skipped.
    failing.add("css-buttons");
    try {
      const missing = await lookUp("2026-09-09-zebra-buttons");
      assert.equal(missing.result, null);
      assert.deepEqual(missing.read, [
        "bootstrap-buttons",
        "css-buttons",
        "javascript-buttons",
        "css-hover-effects",
        "css-animations",
      ]);
    } finally {
      failing.clear();
    }
  });

  it("reads the sitemap once and keeps it (6 h memo)", () => {
    assert.equal(sitemapRequests, 2, "one failed read, then one good read");
  });

  it("declares its stack and id format", () => {
    assert.deepEqual(freefrontend.stack, ["html", "css", "javascript", "tailwind"]);
    assert.match(freefrontend.idFormat, /collection::snippetId/);
    assert.match(freefrontend.idFormat, /bare snippetId/);
    assert.match(freefrontend.description, /3 of its ~900 collections/);
    assert.equal(freefrontend.heavy, undefined);
  });
});
