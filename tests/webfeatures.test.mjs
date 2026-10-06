// web-features: the Baseline data.json of the latest npm release (via jsDelivr), parsed once and
// searched in memory. Feature entries trimmed from web-features@3.40.1.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { webfeatures } from "../dist/sources/webfeatures.js";
import { mockFetch } from "./helpers.mjs";

const PACKAGE_URL = "https://data.jsdelivr.com/v1/package/npm/web-features";
const DATA_URL = "https://cdn.jsdelivr.net/npm/web-features@3.40.1/data.json";
const support = (chrome, firefox, safari) => ({
  chrome,
  chrome_android: chrome,
  edge: chrome,
  firefox,
  firefox_android: firefox,
  safari,
  safari_ios: safari,
});
const HIGH = {
  baseline: "high",
  baseline_high_date: "2025-08-14",
  baseline_low_date: "2023-02-14",
  support: support("105", "110", "16"),
};
const SVG_KEYS = Array.from({ length: 60 }, (_, i) => `svg.elements.e${i}`);

const DATA = {
  browsers: { chrome: { name: "Chrome", releases: [{ date: "2008-12-11", version: "1" }] } },
  features: {
    // Alphabetically first, and its name holds "container queries" too.
    "container-anchor-position-queries": {
      compat_features: ["css.at-rules.container.anchored"],
      description:
        "Anchor position container queries with the @container anchored(fallback: …) at-rule apply styles to an element based on the element's anchor position.",
      group: ["anchor-positioning"],
      kind: "feature",
      name: "Anchor position container queries",
      spec: ["https://drafts.csswg.org/css-anchor-position-2/#anchored-container-queries"],
      status: { baseline: false, support: { chrome: "143", chrome_android: "143", edge: "143" } },
    },
    "container-queries": {
      caniuse: ["css-container-queries", "css-container-query-units"],
      compat_features: [
        "api.CSSContainerRule",
        "css.at-rules.container",
        "css.properties.container-type",
      ],
      description:
        "Container size queries with the @container (…) at-rule apply styles to an element based on a dimension of its container, such as width or height.",
      description_html: "Container size queries with the <code>@container (…)</code> at-rule …",
      group: ["container-queries"],
      kind: "feature",
      name: "Container queries (size)",
      spec: ["https://drafts.csswg.org/css-conditional-5/#container-queries"],
      status: {
        ...HIGH,
        by_compat_key: { "api.CSSContainerRule": HIGH, "css.at-rules.container": HIGH },
      },
    },
    "contrast-color": {
      compat_features: ["css.types.color.contrast-color"],
      description:
        "The contrast-color() CSS function picks a color that has guaranteed contrast against a specified foreground or background color.",
      group: ["color-types"],
      kind: "feature",
      name: "contrast-color()",
      spec: ["https://drafts.csswg.org/css-color-6/#funcdef-contrast-color"],
      status: {
        baseline: "low",
        baseline_low_date: "2026-04-10",
        support: support("147", "146", "26"),
      },
    },
    "anchor-positioning": {
      caniuse: ["css-anchor-positioning"],
      description:
        "Anchor positioning places an element based on the position of another element. For example, you can place a tooltip next to the content it references.",
      group: ["anchor-positioning"],
      kind: "feature",
      name: "Anchor positioning",
      spec: ["https://drafts.csswg.org/css-anchor-position-1/#anchoring"],
      status: { baseline: false, support: { safari: "27", safari_ios: "27" } },
    },
    "grid-lanes": {
      caniuse: ["css-grid-lanes"],
      description:
        "The display: grid-lanes and display: inline-grid-lanes CSS declarations create a layout where items are tightly packed in parallel lanes. Also known as masonry.",
      group: ["layout"],
      kind: "feature",
      name: "Grid lanes",
      spec: ["https://drafts.csswg.org/css-grid-3/"],
      status: { baseline: false, support: { safari: "26.4", safari_ios: "26.4" } },
    },
    masonry: { kind: "moved", redirect_target: "grid-lanes" },
    "text-wrap-style": {
      kind: "split",
      redirect_targets: ["text-wrap", "text-wrap-balance", "text-wrap-pretty"],
    },
    "accessor-methods": {
      compat_features: ["javascript.builtins.Object.defineGetter"],
      description:
        "The __defineGetter__() and __defineSetter__() methods of objects bind a function to a property, which is called on setting or reading the property.",
      discouraged: {
        according_to: [
          "https://tc39.es/ecma262/multipage/additional-ecmascript-features-for-web-browsers.html#sec-additional-ecmascript-features-for-web-browsers",
        ],
        reason:
          "TC39 included accessor methods in Annex B of the ECMAScript specification, which covers JavaScript features with undesirable characteristics.",
        reason_html: "TC39 included accessor methods in Annex B …",
      },
      group: ["javascript"],
      kind: "feature",
      name: "Accessor methods",
      spec: [
        "https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.prototype-legacy-accessor-methods",
      ],
      status: { baseline: false, support: support("1", "1", "3") },
    },
    svg: {
      compat_features: SVG_KEYS,
      description: "The SVG image format describes vector graphics.",
      group: ["loop-a"],
      kind: "feature",
      name: "SVG",
      spec: ["https://svgwg.org/svg2-draft/"],
      status: { ...HIGH, by_compat_key: { "svg.elements.e0": { ...HIGH, baseline: "low" } } },
    },
    "not a tool id": { kind: "feature", name: "Left out", status: HIGH },
  },
  groups: {
    css: { name: "CSS" },
    "container-queries": { name: "Container queries", parent: "css" },
    "anchor-positioning": { name: "Anchor positioning", parent: "css" },
    color: { name: "Color", parent: "css" },
    "color-types": { name: "Color types", parent: "color" },
    layout: { name: "Layout", parent: "css" },
    javascript: { name: "JavaScript" },
    "loop-a": { name: "Loop A", parent: "loop-b" }, // a cycle must not hang the loader
    "loop-b": { name: "Loop B", parent: "loop-a" },
  },
  snapshots: {
    "ecmascript-2015": { name: "ECMAScript 2015", spec: "https://262.ecma-international.org/6.0/" },
  },
};

const serve = (url) => {
  if (url === PACKAGE_URL) {
    return {
      body: JSON.stringify({
        tags: { latest: "3.40.1", next: "3.40.1-dev-20261005150553-f258815" },
        versions: ["3.40.1"],
      }),
    };
  }
  if (url === DATA_URL) return { body: JSON.stringify(DATA) };
  return { status: 404 };
};

const ids = (rows) => rows.map((r) => r.id);
const json = (d) => JSON.parse(d.code["baseline.json"]);

describe("webfeatures", () => {
  it("is a heavy compat source with inline code", () => {
    assert.equal(webfeatures.heavy, true);
    assert.equal(webfeatures.hasInlineCode, true);
    assert.deepEqual(webfeatures.stack, ["compat"]);
    assert.equal(webfeatures.idFormat, 'web-features id, e.g. "container-queries"');
  });

  it("fails while jsDelivr is unreachable and loads once it answers", async () => {
    mockFetch(() => ({ status: 404 }));
    await assert.rejects(webfeatures.search({}), /HTTP 404/);
    const calls = mockFetch(serve);
    const all = await webfeatures.search({});
    assert.deepEqual(calls, [PACKAGE_URL, DATA_URL]);
    // moved, split and invalid ids are not listed
    assert.deepEqual(ids(all), [
      "container-anchor-position-queries",
      "container-queries",
      "contrast-color",
      "anchor-positioning",
      "grid-lanes",
      "accessor-methods",
      "svg",
    ]);
    assert.deepEqual(all[1], {
      source: "webfeatures",
      id: "container-queries",
      title: "Container queries (size)",
      description: DATA.features["container-queries"].description,
      category: "container-queries",
      url: "https://web-platform-dx.github.io/web-features-explorer/features/container-queries/",
      tags: ["high"],
    });
    assert.deepEqual(
      all.map((r) => r.tags[0]),
      ["false", "high", "low", "false", "false", "false", "high"],
    );
  });

  it("matches ids, names, descriptions, caniuse ids and compat keys, the id first", async () => {
    const calls = mockFetch(serve);
    assert.deepEqual(ids(await webfeatures.search({ query: "container queries" })), [
      "container-queries",
      "container-anchor-position-queries",
    ]);
    assert.deepEqual(ids(await webfeatures.search({ query: "css-container-query-units" })), [
      "container-queries",
    ]);
    assert.deepEqual(ids(await webfeatures.search({ query: "CSSContainerRule" })), [
      "container-queries",
    ]);
    assert.deepEqual(ids(await webfeatures.search({ query: "masonry" })), ["grid-lanes"]);
    assert.deepEqual(ids(await webfeatures.search({ query: "tooltip" })), ["anchor-positioning"]);
    assert.equal((await webfeatures.search({ limit: 2 })).length, 2);
    assert.deepEqual(calls, []); // parsed once
  });

  it("filters by group (subgroups included) and by Baseline status", async () => {
    mockFetch(serve);
    assert.deepEqual(ids(await webfeatures.search({ category: "css" })), [
      "container-anchor-position-queries",
      "container-queries",
      "contrast-color",
      "anchor-positioning",
      "grid-lanes",
    ]);
    assert.deepEqual(ids(await webfeatures.search({ category: "color" })), ["contrast-color"]);
    assert.deepEqual(ids(await webfeatures.search({ category: "low" })), ["contrast-color"]);
    assert.deepEqual(ids(await webfeatures.search({ category: "HIGH" })), [
      "container-queries",
      "svg",
    ]);
    assert.deepEqual(ids(await webfeatures.search({ category: "false", query: "grid" })), [
      "grid-lanes",
    ]);
    assert.deepEqual(await webfeatures.search({ category: "no-such-group" }), []);
  });

  it("lists the statuses and the groups with counts and parents", async () => {
    mockFetch(serve);
    const cats = await webfeatures.listCategories();
    assert.deepEqual(cats.slice(0, 3), [
      { id: "high", label: "Baseline: widely available", count: 2 },
      { id: "low", label: "Baseline: newly available", count: 1 },
      { id: "false", label: "Limited availability (not Baseline)", count: 4 },
    ]);
    const byId = Object.fromEntries(cats.map((c) => [c.id, c]));
    assert.deepEqual(byId.css, { id: "css", label: "CSS", count: 5, parent: undefined });
    assert.deepEqual(byId["color-types"], {
      id: "color-types",
      label: "Color types",
      count: 1,
      parent: "color",
    });
    assert.equal(byId["loop-b"].count, 1);
  });

  it("returns the Baseline data as baseline.json with a one-line status", async () => {
    mockFetch(serve);
    const d = await webfeatures.getResource("container-queries");
    assert.equal(d.description, "Baseline widely available since 2025-08-14");
    assert.equal(d.title, "Container queries (size)");
    assert.equal(d.license, "Apache-2.0");
    assert.deepEqual(d.extra, { dataVersion: "3.40.1" });
    assert.deepEqual(Object.keys(d.code), ["baseline.json"]);
    assert.deepEqual(json(d), {
      id: "container-queries",
      name: "Container queries (size)",
      description: DATA.features["container-queries"].description,
      baseline: "high",
      baseline_low_date: "2023-02-14",
      baseline_high_date: "2025-08-14",
      support: support("105", "110", "16"),
      spec: ["https://drafts.csswg.org/css-conditional-5/#container-queries"],
      caniuse: ["css-container-queries", "css-container-query-units"],
      group: ["container-queries"],
      compat_features: {
        "api.CSSContainerRule": "high",
        "css.at-rules.container": "high",
        "css.properties.container-type": null,
      },
    });
    const low = await webfeatures.getResource("contrast-color");
    assert.equal(low.description, "Baseline newly available since 2026-04-10");
    const none = await webfeatures.getResource("anchor-positioning");
    assert.equal(none.description, "Limited availability (not Baseline)");
    assert.equal(json(none).baseline, false);
  });

  it("flags discouraged features and trims long compat key lists", async () => {
    mockFetch(serve);
    const d = await webfeatures.getResource("accessor-methods");
    assert.equal(
      d.description,
      "Limited availability (not Baseline), but discouraged (see baseline.json)",
    );
    assert.deepEqual(json(d).discouraged, {
      reason: DATA.features["accessor-methods"].discouraged.reason,
      according_to: DATA.features["accessor-methods"].discouraged.according_to,
    });
    const svg = json(await webfeatures.getResource("svg"));
    assert.equal(Object.keys(svg.compat_features).length, 50);
    assert.equal(svg.compat_features["svg.elements.e0"], "low");
    assert.equal(svg.compat_features_omitted, 10);
  });

  it("follows a moved id, explains a split one and returns null otherwise", async () => {
    mockFetch(serve);
    const moved = await webfeatures.getResource("masonry");
    assert.equal(moved.id, "grid-lanes");
    assert.equal(moved.title, "Grid lanes");
    assert.deepEqual(moved.extra, { dataVersion: "3.40.1", movedFrom: "masonry" });
    const split = await webfeatures.getResource("text-wrap-style");
    assert.equal(
      split.description,
      "Split into text-wrap, text-wrap-balance, text-wrap-pretty: get_resource each of them",
    );
    assert.deepEqual(split.extra.splitInto, ["text-wrap", "text-wrap-balance", "text-wrap-pretty"]);
    assert.equal(split.code, undefined);
    assert.equal(await webfeatures.getResource("no-such-feature"), null);
    assert.equal(await webfeatures.getResource("constructor"), null);
  });
});
