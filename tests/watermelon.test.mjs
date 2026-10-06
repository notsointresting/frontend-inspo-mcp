// Watermelon adapter: must only request kinds the live API supports.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { watermelon } from "../dist/sources/watermelon.js";
import { mockFetch } from "./helpers.mjs";

const SUPPORTED = ["components", "animated-components", "blocks", "dashboards", "templates"];
const entry = (kind, slug = "s") => ({
  kind,
  title: `T ${kind}`,
  slug,
  description: "d",
  path: `/p/${slug}`,
});

const calls = mockFetch((url) => {
  const u = new URL(url);
  if (u.pathname === "/api/v1/catalog/summary") {
    return {
      body: JSON.stringify({ counts: Object.fromEntries(SUPPORTED.map((k, i) => [k, i + 1])) }),
    };
  }
  if (u.pathname === "/api/v1/catalog/entries") {
    const kind = u.searchParams.get("kind");
    // Same behavior as the real API: unknown kinds are a 400.
    if (!SUPPORTED.includes(kind))
      return { status: 400, body: JSON.stringify({ error: "invalid_kind" }) };
    return { body: JSON.stringify({ entries: [entry(kind)] }) };
  }
  const m = u.pathname.match(/\/entries\/([^/]+)\/([^/]+)$/);
  if (m) return { body: JSON.stringify({ found: true, entry: entry(m[1], m[2]) }) };
  return { status: 404 };
});

describe("watermelon", () => {
  it("lists exactly the kinds the API supports", async () => {
    const cats = await watermelon.listCategories();
    assert.deepEqual(
      cats.map((c) => c.id),
      SUPPORTED,
    );
    assert.equal(cats[0].label, "Components");
  });

  it("never requests an unsupported kind when searching everything", async () => {
    const res = await watermelon.search({ limit: 3 });
    assert.equal(res.length, 3);
    const kinds = calls
      .filter((u) => u.includes("/entries?"))
      .map((u) => new URL(u).searchParams.get("kind"));
    assert.ok(kinds.length > 0);
    for (const k of kinds) assert.ok(SUPPORTED.includes(k), `unexpected kind ${k}`);
  });

  it("resolves a kind/slug id to a detail record", async () => {
    const d = await watermelon.getResource("components/button");
    assert.equal(d.id, "components/button");
    assert.equal(d.url, "https://ui.watermelon.sh/p/button");
    assert.equal(await watermelon.getResource("showcases/old"), null);
  });
});
