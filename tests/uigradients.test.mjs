// uiGradients: gradients.json from the GitHub repo is ranked locally; get_resource returns the
// gradient as a CSS background and as JSON. Sample trimmed from ghosh/uiGradients.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { uigradients } from "../dist/sources/uigradients.js";
import { mockFetch } from "./helpers.mjs";

const DATA_URL = "https://raw.githubusercontent.com/ghosh/uiGradients/main/gradients.json";
const GRADIENTS = [
  { name: "Omolon", colors: ["#091E3A", "#2F80ED", "#2D9EE0"] },
  { name: "Royal Blue + Petrol", colors: ["#BBD2C5", "#536976", "#292E49"] },
  { name: "Purple Bliss", colors: ["#360033", "#0b8793"] },
  { name: "Sunset", colors: ["#0B486B", "#F56217"] },
  { name: "Ed's Sunset Gradient", colors: ["#ff7e5f", "#feb47b"] },
  { name: "Black Rosé", colors: ["#f4c4f3", "#fc67fa"] },
  // Left out: a duplicate slug, a non-hex color, a single color, no name.
  { name: "Sunset!", colors: ["#000000", "#ffffff"] },
  { name: "Injected", colors: ["#fff", "red); } body { color: red"] },
  { name: "Lonely", colors: ["#123456"] },
  { colors: ["#000", "#fff"] },
];

const ids = (rows) => rows.map((r) => r.id);

describe("uigradients", () => {
  it("is a CSS design-token source with inline code and no categories", async () => {
    const calls = mockFetch(() => ({ body: JSON.stringify(GRADIENTS) }));
    assert.equal(uigradients.hasInlineCode, true);
    assert.deepEqual(uigradients.stack, ["design-tokens", "css"]);
    assert.match(uigradients.idFormat, /"purple-bliss"/);
    assert.deepEqual(await uigradients.listCategories(), []);
    assert.deepEqual(calls, []);
  });

  it("slugs every valid gradient and ranks them by name and colors, read once", async () => {
    const calls = mockFetch(() => ({ body: JSON.stringify(GRADIENTS) }));
    const all = await uigradients.search({});
    assert.deepEqual(ids(all), [
      "omolon",
      "royal-blue-petrol",
      "purple-bliss",
      "sunset",
      "eds-sunset-gradient",
      "black-rose",
    ]);
    assert.deepEqual(all[1], {
      source: "uigradients",
      id: "royal-blue-petrol",
      title: "Royal Blue + Petrol",
      description: "#BBD2C5 → #536976 → #292E49",
      url: "https://uigradients.com/#RoyalBlue+Petrol",
    });
    assert.deepEqual(ids(await uigradients.search({ query: "sunset" })), [
      "sunset",
      "eds-sunset-gradient",
    ]);
    assert.deepEqual(ids(await uigradients.search({ query: "#2f80ed" })), ["omolon"]);
    assert.deepEqual(ids(await uigradients.search({ query: "rose" })), ["black-rose"]);
    assert.deepEqual(await uigradients.search({ query: "sunset", category: "warm" }), []);
    assert.equal((await uigradients.search({ limit: 2 })).length, 2);
    assert.deepEqual(calls, [DATA_URL]);
  });

  it("returns the gradient as a CSS background and as JSON, with its license", async () => {
    mockFetch(() => ({ status: 500 })); // the list is already memoized
    const d = await uigradients.getResource("omolon");
    assert.deepEqual(d.code, {
      css: "background: linear-gradient(to right, #091E3A, #2F80ED, #2D9EE0);\n",
      json: `${JSON.stringify({ name: "Omolon", colors: ["#091E3A", "#2F80ED", "#2D9EE0"] }, null, 2)}\n`,
    });
    assert.equal(d.title, "Omolon");
    assert.equal(d.url, "https://uigradients.com/#Omolon");
    assert.equal(d.license, "MIT");
    assert.equal(d.author, "Indrashish Ghosh (uiGradients)");
    assert.equal(await uigradients.getResource("injected"), null);
    assert.equal(await uigradients.getResource("no-such-gradient"), null);
  });
});
