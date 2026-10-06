// Refero adapter: extraction from the Next.js flight payload of public pages.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { refero } from "../dist/sources/refero.js";
import { mockFetch } from "./helpers.mjs";

// Wrap a payload string the way Next.js embeds it in the page.
const page = (payload) =>
  `<html><body><script>self.__next_f.push([1,${JSON.stringify(payload)}])</script></body></html>`;

const LIST = page(
  `x:["$","div",null,{"initialPage":{"styles":[{"id":"abc-1","url":"https://example.com","siteName":"Example","colorScheme":"light","northStar":"Calm and clear"}]},"other":1}]`,
);
const DETAIL = page(
  `y:{"result":{"meta":{"url":"https://example.com","siteName":"Example"},"raw":{}},"designSystem":{"theme":"light","industry":"saas","northStar":"Calm and clear","colors":[{"hex":"#112233","name":"Ink","role":"text"}],"surfaces":[{"hex":"#ffffff","name":"Paper","level":0}],"typography":[{"family":"Inter","role":"body"}],"components":[],"spacing":{"radius":{"cards":"8px"},"sectionGap":"64px"}}}`,
);
const NOT_FOUND_SHELL = page(`z:{"notFound":true}`);

let listHtml = LIST;
mockFetch((url) => {
  // "/" and "/?sort=popular" both serve the gallery; tests use a distinct URL to dodge fetch.ts caching.
  if (url === "https://styles.refero.design/" || url.includes("?sort=")) return { body: listHtml };
  if (url.endsWith("/style/abc-1")) return { body: DETAIL };
  return { body: NOT_FOUND_SHELL }; // unknown ids render a 200 "not found" shell
});

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
  });

  it("synthesizes design.md, css, tailwind and tokens from the detail page", async () => {
    const d = await refero.getResource("abc-1");
    assert.equal(d.title, "Example");
    assert.deepEqual(Object.keys(d.code), ["design.md", "css", "tailwind.js", "tokens.json"]);
    assert.match(d.code["design.md"], /#112233/);
    assert.match(d.code.css, /--color-ink: #112233;/);
    assert.equal(JSON.parse(d.code["tokens.json"]).color.ink.value, "#112233");
  });

  it("returns null for an unknown id", async () => {
    assert.equal(await refero.getResource("does-not-exist"), null);
  });

  it("fails loudly (not with an empty list) when the page format changes", async () => {
    listHtml = page(`x:{"somethingElse":true}`);
    await assert.rejects(refero.search({ category: "popular", limit: 1 }), /payload .* not found/);
  });
});
