// shadcn Registry Directory: discovery over ui.shadcn.com/r/registries.json. Metadata only:
// it must never fetch anything from the registries it lists. Entries trimmed from the live file.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shadcndirectory } from "../dist/sources/shadcn-directory.js";
import { mockFetch } from "./helpers.mjs";

const DIRECTORY_URL = "https://ui.shadcn.com/r/registries.json";
const CHECKED = "2026-10-06T11:28:21.383Z";
const health = (status, score, message, hidden = false) => ({
  schemaVersion: 1,
  scoreVersion: 1,
  status,
  statusReason: { code: "x", message },
  score,
  checkedAt: CHECKED,
  hidden,
});
const DOWN = "No successful index check in the last 24 hours";

// The API's own (alphabetical) order.
const DIRECTORY = [
  {
    name: "@abstract",
    homepage: "https://build.abs.xyz",
    url: "https://build.abs.xyz/r/{name}/json",
    description: "A collection of React components for the most common crypto patterns",
    health: health("unavailable", 50.525, DOWN, true),
  },
  {
    name: "@diceui",
    homepage: "https://www.diceui.com/",
    url: "https://diceui.com/r/{style}/{name}.json",
    description: "Accessible shadcn/ui components built with React, TypeScript, and Tailwind CSS.",
    health: health("healthy", 96.362, "Recent checks are within healthy thresholds"),
    ranking: { version: 1, score: 94.814, itemCount: 246 },
  },
  {
    name: "@kokonutui",
    homepage: "https://kokonutui.com",
    url: "https://kokonutui.com/r/{name}.json",
    description:
      "Collection of stunning components built with Tailwind CSS, shadcn/ui and Motion to use on your websites.",
    health: health("healthy", 96.088, "Recent checks are within healthy thresholds"),
    ranking: { version: 1, score: 89.582, itemCount: 51 },
  },
  {
    name: "@phucbm",
    homepage: "https://phucbm.com/components",
    url: "https://phucbm.com/r/{name}.json",
    description: "A collection of modern React UI components with GSAP animations.",
    health: health("observing", 87.013, "Collecting baseline data (0 of 24 checks)"),
  },
  {
    name: "@shadcn-map", // a plain-HTTP template: left out
    homepage: "https://shadcn-map.vercel.app",
    url: "http://shadcn-map.vercel.app/r/{name}.json",
    description: "A map component for shadcn/ui. Built with Leaflet and React Leaflet.",
    health: health("degraded", 81.088, "The last two CLI dry-run checks failed"),
    ranking: { version: 1, score: 76.119, itemCount: 32 },
  },
  {
    name: "@wandry-ui", // a plain-HTTP homepage: the directory page stands in for it
    homepage: "http://ui.wandry.com.ua/",
    url: "https://ui.wandry.com.ua/r/{name}.json",
    description: "A set of open source fully controlled React Inertia form elements",
    health: health("unavailable", 50.525, DOWN, true),
  },
];

describe("shadcn registry directory", () => {
  const ids = (rows) => rows.map((r) => r.id);

  it("lists registries best first and filters them by query and health status", async () => {
    const calls = mockFetch((url) =>
      url === DIRECTORY_URL ? { body: JSON.stringify(DIRECTORY) } : { status: 404 },
    );
    const all = await shadcndirectory.search({});
    // Ranked by score, then the unranked one, then the unavailable ones.
    assert.deepEqual(ids(all), ["diceui", "kokonutui", "phucbm", "abstract", "wandry-ui"]);
    assert.deepEqual(all[1], {
      source: "shadcndirectory",
      id: "kokonutui",
      title: "@kokonutui",
      description: DIRECTORY[2].description,
      category: "healthy",
      url: "https://kokonutui.com",
    });
    assert.equal(all[4].url, "https://ui.shadcn.com/docs/directory");
    assert.deepEqual(ids(await shadcndirectory.search({ query: "gsap animations" })), ["phucbm"]);
    assert.deepEqual(ids(await shadcndirectory.search({ query: "kokonut" })), ["kokonutui"]);
    assert.deepEqual(ids(await shadcndirectory.search({ category: "HEALTHY", limit: 1 })), [
      "diceui",
    ]);
    assert.deepEqual(ids(await shadcndirectory.search({ category: "unavailable" })), [
      "abstract",
      "wandry-ui",
    ]);
    assert.deepEqual(await shadcndirectory.listCategories(), [
      { id: "healthy", label: "healthy", count: 2 },
      { id: "unavailable", label: "unavailable", count: 2 },
      { id: "observing", label: "observing", count: 1 },
    ]);
    assert.deepEqual(calls, [DIRECTORY_URL]); // one download, no registry contacted
  });

  it("returns a registry's metadata and install commands, never its code", async () => {
    const calls = mockFetch(() => ({ status: 404 }));
    const d = await shadcndirectory.getResource("kokonutui");
    assert.equal(shadcndirectory.hasInlineCode, false);
    assert.equal(d.code, undefined);
    assert.match(d.license, /check the registry's own license/);
    assert.deepEqual(d.extra, {
      namespace: "@kokonutui",
      urlTemplate: "https://kokonutui.com/r/{name}.json",
      install: "npx shadcn@latest add https://kokonutui.com/r/<item>.json",
      listItems: "npx shadcn@latest search @kokonutui",
      itemCount: 51,
      rankingScore: 89.582,
      health: {
        status: "healthy",
        reason: "Recent checks are within healthy thresholds",
        score: 96.088,
        checkedAt: CHECKED,
      },
    });
    const dice = await shadcndirectory.getResource("diceui");
    assert.equal(
      dice.extra.install,
      "npx shadcn@latest add https://diceui.com/r/<style>/<item>.json",
    );
    assert.deepEqual(calls, []); // the directory is memoized; nothing else is fetched
  });

  it("returns null for unknown or left-out registries", async () => {
    mockFetch(() => ({ status: 404 }));
    assert.equal(await shadcndirectory.getResource("no-such-registry"), null);
    assert.equal(await shadcndirectory.getResource("shadcn-map"), null);
  });
});
