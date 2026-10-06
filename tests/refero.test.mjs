// Refero adapter: extraction from the Next.js flight payload of public pages, the union of
// the three gallery sorts, and the index of styles seen.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { refero } from "../dist/sources/refero.js";
import { mockFetch } from "./helpers.mjs";

// Every test controls the responses, so switch off fetch.ts's response cache.
process.env.FRONTEND_INSPO_CACHE_TTL_MS = "0";

// Wrap a payload string the way Next.js embeds it in the page.
const page = (payload) =>
  `<html><body><script>self.__next_f.push([1,${JSON.stringify(payload)}])</script></body></html>`;

/** A gallery page as the live site renders it: one sort, its first 20 styles, no paging. */
const gallery = (styles, sort = "trending") =>
  page(
    `x:["$","$L16",null,{"initialFilters":{"sort":"${sort}"},"initialPage":{"styles":${JSON.stringify(styles)},"nextCursor":null,"nextPage":2},"isAdmin":false}]`,
  );
const style = (id, siteName, northStar, colorScheme = "light") => ({
  id,
  url: `https://${siteName.toLowerCase().replace(/\W+/g, "")}.example`,
  siteName,
  thumbnailUrl: `https://images.refero.design/styles/${id}.jpg`,
  colorScheme,
  colors: [{ name: "Ink", hex: "#111111" }],
  fonts: ["Inter"],
  northStar,
  createdAt: "2026-09-24 18:02:28",
});

const EXAMPLE = {
  id: "abc-1",
  url: "https://example.com",
  siteName: "Example",
  colorScheme: "light",
  northStar: "Calm and clear",
};
const detail = (url, siteName, ds) =>
  page(
    `y:{"result":{"meta":${JSON.stringify({ url, siteName })},"raw":{}},"designSystem":${JSON.stringify(ds)}}`,
  );
const DETAIL = page(
  `y:{"result":{"meta":{"url":"https://example.com","siteName":"Example"},"raw":{}},"designSystem":{"theme":"light","industry":"saas","northStar":"Calm and clear","colors":[{"hex":"#112233","name":"Ink","role":"text"}],"surfaces":[{"hex":"#ffffff","name":"Paper","level":0}],"typography":[{"family":"Inter","role":"body"}],"components":[],"spacing":{"radius":{"cards":"8px"},"sectionGap":"64px"}}}`,
);
const NOT_FOUND_SHELL = page(`z:{"notFound":true}`);

// The three server-rendered sorts; "" is the default (trending) page at "/".
let sorts = { "": [EXAMPLE], popular: [EXAMPLE], newest: [EXAMPLE] };
let broken = false;
const calls = mockFetch((url) => {
  const u = new URL(url);
  if (u.pathname === "/") {
    if (broken) return { body: page(`x:{"somethingElse":true}`) };
    return { body: gallery(sorts[u.searchParams.get("sort") ?? ""] ?? []) };
  }
  if (u.pathname === "/style/abc-1") return { body: DETAIL };
  if (u.pathname === "/style/def-9") {
    return {
      body: detail("https://quietbank.example", "Quiet Bank", {
        theme: "dark",
        industry: "fintech",
        northStar: "Vault at dusk",
      }),
    };
  }
  return { body: NOT_FOUND_SHELL }; // unknown ids render a 200 "not found" shell
});

const ids = (results) => results.map((r) => r.id);

describe("refero", () => {
  it("lists styles from the gallery page payload", async () => {
    const res = await refero.search({ limit: 5 });
    assert.equal(res.length, 1);
    assert.deepEqual(
      { id: res[0].id, title: res[0].title, url: res[0].url },
      { id: "abc-1", title: "Example", url: "https://styles.refero.design/style/abc-1" },
    );
  });

  it("filters the gallery by query", async () => {
    assert.equal((await refero.search({ query: "zzz-no-match" })).length, 0);
    assert.equal((await refero.search({ query: "calm" })).length, 1);
    assert.equal((await refero.search({ query: "clear calm" })).length, 1, "word order");
  });

  it("searches the union of the trending, popular and newest pages, deduplicated", async () => {
    const a = style("aaa-1", "Atlas", "Map room at dawn");
    const b = style("bbb-2", "Beacon", "Lighthouse beam", "dark");
    const c = style("ccc-3", "Cobalt", "Deep blue workshop");
    const d = style("ddd-4", "Drift", "Sand and wind");
    sorts = { "": [a, b], popular: [b, c], newest: [d] };
    calls.length = 0;
    const res = await refero.search({ limit: 10 });
    assert.deepEqual(ids(res), ["aaa-1", "bbb-2", "ccc-3", "ddd-4", "abc-1"]);
    assert.deepEqual(
      calls.toSorted(),
      [
        "https://styles.refero.design/",
        "https://styles.refero.design/?sort=newest",
        "https://styles.refero.design/?sort=popular",
      ],
      "only the sort parameter, which is the only one the gallery reads",
    );
    assert.deepEqual(res[1].tags, ["dark"]);
    assert.equal(res[1].image, "https://images.refero.design/styles/bbb-2.jpg");
  });

  it("reads only its own sort page for a category", async () => {
    calls.length = 0;
    assert.deepEqual(ids(await refero.search({ category: "newest" })), ["ddd-4"]);
    assert.deepEqual(calls, ["https://styles.refero.design/?sort=newest"]);
    assert.deepEqual(ids(await refero.search({ category: "featured" })), ["aaa-1", "bbb-2"]);
  });

  it("keeps finding styles that have left the gallery pages", async () => {
    const e = style("eee-5", "Ember", "Glowing coals");
    sorts = { "": [e], popular: [e], newest: [e] };
    assert.deepEqual(ids(await refero.search({ query: "atlas" })), ["aaa-1"]);
    assert.deepEqual(ids(await refero.search({ query: "lighthouse beam" })), ["bbb-2"]);
    // Without a query: the current pages first, then everything seen before.
    assert.deepEqual(ids(await refero.search({ limit: 3 })), ["eee-5", "abc-1", "aaa-1"]);
    // A category stays one sort page.
    assert.deepEqual(ids(await refero.search({ category: "popular", query: "atlas" })), []);
  });

  it("ranks the best match first: site name, then domain, then its north star", async () => {
    const calm = style("fff-6", "Calm", "Quiet pastel studio");
    const studio = style("ggg-7", "Studio Nine", "Calm and quiet");
    sorts = { "": [studio, calm], popular: [], newest: [] };
    const res = await refero.search({ query: "calm" });
    assert.deepEqual(ids(res).slice(0, 2), ["fff-6", "ggg-7"]);
    assert.ok(ids(res).includes("abc-1"), "an indexed style matching by north star");
    assert.deepEqual(ids(await refero.search({ query: "studionine.example" })), ["ggg-7"]);
  });

  it("drops styles whose ids the tools would reject", async () => {
    sorts = { "": [style("../evil", "Evil", "x"), style("ok-1", "Okay", "y")] };
    const res = await refero.search({ category: "featured" });
    assert.deepEqual(ids(res), ["ok-1"]);
  });

  it("synthesizes design.md, css, tailwind and tokens from the detail page", async () => {
    const d = await refero.getResource("abc-1");
    assert.equal(d.title, "Example");
    assert.deepEqual(Object.keys(d.code), ["design.md", "css", "tailwind.js", "tokens.json"]);
    assert.match(d.code["design.md"], /#112233/);
    assert.match(d.code.css, /--color-ink: #112233;/);
    assert.equal(JSON.parse(d.code["tokens.json"]).color.ink.value, "#112233");
  });

  it("adds a style fetched by id to the index of styles seen", async () => {
    assert.deepEqual(ids(await refero.search({ query: "quiet bank" })), []);
    assert.equal((await refero.getResource("def-9")).title, "Quiet Bank");
    const [hit] = await refero.search({ query: "quiet bank" });
    assert.deepEqual(
      { id: hit.id, title: hit.title, category: hit.category, tags: hit.tags },
      { id: "def-9", title: "Quiet Bank", category: "fintech", tags: ["dark", "fintech"] },
    );
  });

  it("returns null for an unknown id", async () => {
    assert.equal(await refero.getResource("does-not-exist"), null);
  });

  it("fails loudly (not with an empty list) when the page format changes", async () => {
    broken = true;
    await assert.rejects(refero.search({ category: "popular", limit: 1 }), /payload .* not found/);
    await assert.rejects(refero.search({ query: "atlas" }), /payload .* not found/);
  });

  it("describes how it reads Refero and how far search reaches", () => {
    assert.doesNotMatch(refero.description, /public API/i);
    assert.match(refero.description, /server-rendered pages/);
    assert.match(refero.description, /robots\.txt disallows its API/);
    assert.match(refero.description, /20 trending, 20 popular and 20 newest/);
    assert.match(refero.description, /~1\.3k/);
    assert.deepEqual(refero.stack, ["design-tokens"]);
    assert.match(refero.idFormat, /uuid/);
  });
});
