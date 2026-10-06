// FreeFrontend adapter: parsing of the current card markup + link-host validation.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { freefrontend } from "../dist/sources/freefrontend.js";
import { mockFetch } from "./helpers.mjs";

const b64 = (s) => Buffer.from(s).toString("base64");

// Mirrors the redesigned markup: cards are <article.snippet-card>; the preview/code
// popover is a *sibling* keyed by the card's popovertarget id.
const PAGE = `<html><body><main>
<a href="/css-glow-effects/">Glow</a>
<a href="https://www.freefrontend.com/js-fancy-things/">JS</a>
<a href="https://evil.example/freefrontend.com">spoof path</a>
<a href="https://freefrontend.com.evil.example/css-bad-one/">spoof subdomain</a>
<a href="//evil.example/css-bad-two/">protocol-relative</a>
<a href="#top">fragment</a>
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

mockFetch((url) => {
  if (url.includes("/page/")) return { status: 404 };
  return { body: PAGE };
});

describe("freefrontend", () => {
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

  it("only follows links whose parsed host is freefrontend.com", async () => {
    const ids = (await freefrontend.listCategories()).map((c) => c.id);
    assert.ok(ids.includes("css-glow-effects"), "relative link accepted");
    assert.ok(ids.includes("js-fancy-things"), "www host accepted");
    assert.ok(
      !ids.includes("css-bad-one"),
      "host containing freefrontend.com as a prefix must be rejected",
    );
    assert.ok(
      !ids.includes("css-bad-two"),
      "protocol-relative link to another host must be rejected",
    );
  });
});
