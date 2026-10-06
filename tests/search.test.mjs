// Shared query matcher used by every adapter that filters locally.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchScore, queryTokens, rankByQuery } from "../dist/lib/search.js";

describe("queryTokens", () => {
  it("lowercases, splits on punctuation, dedupes and strips a plural s", () => {
    assert.deepEqual(queryTokens("Shimmer-Buttons, shimmer"), ["shimmer", "button"]);
    assert.deepEqual(queryTokens("css glass"), ["css", "glass"]); // short words and -ss stay
    assert.deepEqual(queryTokens(undefined), []);
    assert.deepEqual(queryTokens("  "), []);
  });
});

describe("matchScore", () => {
  it("ignores word order and hyphens", () => {
    assert.ok(matchScore("button shimmer", ["shimmer-button"]) > 0);
    assert.ok(matchScore("SHIMMER BUTTON", ["Shimmer Button"]) > 0);
  });

  it("requires every word somewhere, in any field", () => {
    assert.ok(matchScore("animated card", ["card", "An animated container"]) > 0);
    assert.equal(matchScore("animated card", ["card", "A container"]), 0);
  });

  it("finds singular items for plural queries", () => {
    assert.ok(matchScore("buttons", ["button"]) > 0);
  });

  it("weighs earlier fields, whole words and the full phrase higher", () => {
    const inTitle = matchScore("marquee", ["Marquee", "scrolling text"]);
    const inDescription = matchScore("marquee", ["Ticker", "a marquee effect"]);
    assert.ok(inTitle > inDescription);
    assert.ok(matchScore("card", ["card stack"]) > matchScore("card", ["discard pile"]));
    assert.ok(
      matchScore("hover effect", ["hover effect"]) >
        matchScore("hover effect", ["effect on hover"]),
    );
  });

  it("matches non-ASCII words and treats an empty query as a match", () => {
    assert.ok(matchScore("café", ["Café au lait"]) > 0);
    assert.equal(matchScore("", ["anything"]), 1);
    assert.equal(matchScore("x", [undefined, ""]), 0);
  });
});

describe("rankByQuery", () => {
  const items = [
    { t: "Card", d: "a box" },
    { t: "Button", d: "click me" },
    { t: "Glow card", d: "shiny" },
    { t: "Badge", d: "a small card-like label" },
  ];
  const fields = (x) => [x.t, x.d];

  it("filters, ranks best first and caps at the limit", () => {
    assert.deepEqual(
      rankByQuery(items, "card", fields, 10).map((x) => x.t),
      ["Card", "Glow card", "Badge"],
    );
    assert.equal(rankByQuery(items, "card", fields, 1).length, 1);
    assert.deepEqual(rankByQuery(items, "zzz", fields, 10), []);
  });

  it("keeps input order (capped) when there is no query", () => {
    assert.deepEqual(
      rankByQuery(items, undefined, fields, 2).map((x) => x.t),
      ["Card", "Button"],
    );
  });
});
