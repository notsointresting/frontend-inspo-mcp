// ls.graphics adapter: listing parse, HTTP-500-with-body detail pages, error handling.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lsgraphics } from "../dist/sources/lsgraphics.js";
import { mockFetch } from "./helpers.mjs";

const LISTING = `<html><body>
<a href="/assets/foo-mockup"><img alt="Foo Mockup" src="/foo.png"></a>
<a href="/assets/bar-mockup"><img alt="Bar Mockup" src="/bar.png"></a>
<a href="/assets/foo-mockup"><img alt="duplicate" src="/foo2.png"></a>
</body></html>`;

// Real detail pages embed download links as escaped JSON inside Next.js data.
const DETAIL = `<html><head>
<meta property="og:title" content="Foo Mockup | LS.GRAPHICS"/>
<meta name="description" content="A tidy mockup"/>
</head><body><script>self.__next_f.push([1,"{\\"zip_link\\":\\"https://cdn.example/foo.zip\\"}"])</script></body></html>`;

// A category listing where the better match comes second in page order.
const DEVICES = `<html><body>
<a href="/assets/iphone-bar-scene"><img alt="iPhone Scene" src="/scene.png"></a>
<a href="/assets/bar-chart-mockup"><img alt="Bar Chart Mockup" src="/chart.png"></a>
<a href="/assets/ipad-mockup"><img alt="iPad Mockup" src="/ipad.png"></a>
</body></html>`;

mockFetch((url) => {
  if (url.endsWith("/free-mockups")) return { body: LISTING };
  if (url.endsWith("/devices-mockups")) return { body: DEVICES };
  if (url.endsWith("/assets/foo-mockup")) return { status: 500, body: DETAIL }; // upstream bug: 500 + full page
  if (url.endsWith("/assets/gone")) return { status: 404 };
  if (url.endsWith("/assets/limited")) return { status: 429, headers: { "retry-after": "0" } };
  return { status: 404 };
});

describe("lsgraphics", () => {
  it("parses asset cards and de-duplicates by slug", async () => {
    const res = await lsgraphics.search({ limit: 10 });
    assert.deepEqual(
      res.map((r) => r.id),
      ["foo-mockup", "bar-mockup"],
    );
    assert.equal(res[0].title, "Foo Mockup");
  });

  it("ranks by query: title before slug, any word order, plurals", async () => {
    const res = await lsgraphics.search({ category: "devices-mockups", query: "bar" });
    assert.deepEqual(
      res.map((r) => r.id),
      ["bar-chart-mockup", "iphone-bar-scene"],
    );
    const ids = async (query) => (await lsgraphics.search({ query })).map((r) => r.id);
    assert.deepEqual(await ids("mockup foo"), ["foo-mockup"]);
    assert.deepEqual(await ids("mockups"), ["foo-mockup", "bar-mockup"]);
    assert.deepEqual(await ids("zzz"), []);
  });

  it("declares its stack and id format", () => {
    assert.deepEqual(lsgraphics.stack, ["mockups"]);
    assert.match(lsgraphics.idFormat, /asset slug/);
  });

  it("reads a detail page even though the server answers HTTP 500", async () => {
    const d = await lsgraphics.getResource("foo-mockup");
    assert.equal(d.title, "Foo Mockup");
    assert.equal(d.description, "A tidy mockup");
    assert.deepEqual(d.formats, ["zip"]);
    assert.equal(d.downloads[0].url, "https://cdn.example/foo.zip");
  });

  it("returns null for an unknown asset (404)", async () => {
    assert.equal(await lsgraphics.getResource("gone"), null);
  });

  it("surfaces rate limits instead of pretending the asset does not exist", async () => {
    await assert.rejects(lsgraphics.getResource("limited"), /HTTP 429/);
  });
});
