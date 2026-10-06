// Package/source-tree adapters (three.js, drei, react-spring, ...): driven by one generic fake
// that serves GitHub git-trees, jsDelivr file listings and raw file contents.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categorySchema } from "../dist/lib/validate.js";
import {
  detectgpu,
  drei,
  glyph,
  gsap,
  img2threejs,
  liquidglass,
  liquidlogo,
  makeGithubSrcAdapter,
  makeJsdelivrSrcAdapter,
  postprocessing,
  reactspring,
  scrollama,
  shadergradient,
  threejs,
  twojs,
  zustand,
} from "../dist/sources/packages.js";
import { mockFetch } from "./helpers.mjs";

const ADAPTERS = {
  threejs,
  drei,
  twojs,
  scrollama,
  reactspring,
  zustand,
  glyph,
  postprocessing,
  detectgpu,
  shadergradient,
  liquidlogo,
  liquidglass,
  img2threejs,
  gsap,
};

// A path that satisfies each adapter's `include` filter, with the category we expect.
const CASES = {
  threejs: { path: "/examples/jsm/controls/OrbitControls.js", category: "controls", lang: "js" },
  drei: { path: "/src/core/Html.tsx", category: "core", lang: "tsx" },
  twojs: { path: "/src/effects/Stage.js", category: "effects", lang: "js" },
  scrollama: { path: "/src/index.js", category: "src", lang: "js" },
  reactspring: { path: "/packages/core/src/SpringValue.ts", category: "core", lang: "ts" },
  zustand: { path: "/src/middleware/persist.ts", category: "middleware", lang: "ts" },
  glyph: { path: "/packages/raster/src/bake.ts", category: "raster", lang: "ts" },
  postprocessing: { path: "/src/effects/BloomEffect.js", category: "effects", lang: "js" },
  detectgpu: { path: "/src/index.ts", category: "index.ts", lang: "ts" },
  shadergradient: {
    path: "/packages/react/src/Gradient.glsl",
    category: "react",
    lang: "glsl",
    // ruucm/shadergradient has no LICENSE file; the README and its packages declare MIT.
    license:
      "MIT (declared in the README and in each listed package's package.json; no LICENSE file)",
  },
  liquidlogo: { path: "/main.js", category: "main.js", lang: "js" },
  liquidglass: { path: "/glass.mjs", category: "glass.mjs", lang: "mjs" },
  img2threejs: { path: "/forge/pipeline/run.py", category: "pipeline", lang: "py" },
  gsap: { path: "/skills/scrolltrigger/README.md", category: "scrolltrigger", lang: "md" },
};
const NOISE = ["/README.md.bak", "/docs/guide.html", "/package.json"]; // never match any include

function serve() {
  const requested = [];
  mockFetch((url) => {
    requested.push(url);
    const u = new URL(url);
    if (u.host === "data.jsdelivr.com" && !u.search) {
      return { body: JSON.stringify({ tags: { latest: "9.9.9" } }) };
    }
    if (u.host === "data.jsdelivr.com") {
      const files = [...Object.values(CASES), ...NOISE.map((path) => ({ path }))].map((c) => ({
        name: c.path,
      }));
      return { body: JSON.stringify({ files }) };
    }
    if (u.host === "api.github.com") {
      const tree = [...Object.values(CASES).map((c) => c.path), ...NOISE].map((path) => ({
        path: path.slice(1),
        type: "blob",
      }));
      tree.push({ path: "src/dir", type: "tree" }); // directories must be ignored
      return { body: JSON.stringify({ tree }) };
    }
    if (u.pathname.endsWith("/missing.ts")) return { status: 404 };
    if (u.pathname.endsWith("/limited.ts")) return { status: 429, headers: { "retry-after": "0" } };
    return { body: `// contents of ${u.pathname}` };
  });
  return requested;
}

describe("package adapters", () => {
  for (const [name, c] of Object.entries(CASES)) {
    const adapter = ADAPTERS[name];

    it(`${name}: lists, filters and fetches a file`, async () => {
      serve();
      const res = await adapter.search({ limit: 100 });
      const hit = res.find((r) => r.id === c.path);
      assert.ok(hit, `expected ${c.path} among ${res.map((r) => r.id)}`);
      assert.equal(hit.category, c.category);
      assert.deepEqual(hit.tags, [c.category, c.lang]);
      assert.ok(!res.some((r) => NOISE.includes(r.id)), "files outside `include` are excluded");

      const cats = await adapter.listCategories();
      assert.ok(cats.some((x) => x.id === c.category && x.count >= 1));

      const d = await adapter.getResource(c.path);
      assert.match(d.code[c.lang], /contents of/);
      assert.equal(d.id, c.path);
      assert.equal(d.extra.path, c.path);
      if (c.license) assert.equal(d.license, c.license);
    });
  }
});

describe("package adapter behavior", () => {
  it("filters by query and category, and clamps the limit", async () => {
    serve();
    const d = drei;
    assert.deepEqual(
      (await d.search({ query: "HTML" })).map((r) => r.id),
      ["/src/core/Html.tsx"],
    );
    assert.equal((await d.search({ category: "core" })).length, 1);
    assert.equal((await d.search({ category: "nope" })).length, 0);
    assert.equal((await d.search({ limit: 0 })).length, 1);
  });

  it("accepts ids with or without the leading slash", async () => {
    serve();
    const a = await zustand.getResource("src/middleware/persist.ts");
    const b = await zustand.getResource("/src/middleware/persist.ts");
    assert.equal(a.id, "/src/middleware/persist.ts");
    assert.equal(b.id, a.id);
  });

  it("returns null for a missing file but surfaces rate limits", async () => {
    serve();
    assert.equal(await detectgpu.getResource("/src/missing.ts"), null);
    await assert.rejects(detectgpu.getResource("/src/limited.ts"), /HTTP 429/);
  });

  it("builds the right raw URLs for GitHub and jsDelivr sources", async () => {
    const requested = serve();
    await glyph.getResource("/packages/raster/src/urlcheck.ts");
    await twojs.search({ limit: 1 });
    await twojs.getResource("/src/effects/UrlCheck.js");
    assert.ok(
      requested.includes(
        "https://raw.githubusercontent.com/pmndrs/glyph/HEAD/packages/raster/src/urlcheck.ts",
      ),
    );
    assert.ok(
      requested.some((u) =>
        u.startsWith("https://cdn.jsdelivr.net/npm/two.js@9.9.9/src/effects/UrlCheck.js"),
      ),
    );
  });
});

// --- ranking, caches and the jsDelivr fallback ----------------------------------------------
// Each test builds its own adapter on a repo/package name no other test uses, so its tree memo
// and fetch.ts's URL cache start empty.

const MINUTE = 60_000;
// fetch.ts retries 403 (but not jsDelivr's), 429 and 502-504 with backoff; a zero Retry-After
// skips the wait.
const NO_BACKOFF = { "retry-after": "0" };

// memoAsync and fetch.ts read Date.now(). This fake clock only moves forward: fetch.ts's
// per-host throttle would sit out a clock that jumped back.
let clockOffset = 0;
function advanceClock(ms) {
  if (!clockOffset) {
    const realNow = Date.now;
    Date.now = () => realNow() + clockOffset;
  }
  clockOffset += ms;
}

const ghAdapter = (repo, opts = {}) =>
  makeGithubSrcAdapter({
    id: "gh-test",
    label: "GitHub test",
    description: "GitHub-backed test source",
    homepage: `https://github.com/${repo}`,
    repo,
    license: "MIT",
    include: /^\/src\//,
    categoryIndex: 1,
    ...opts,
  });

const npmAdapter = (pkg) =>
  makeJsdelivrSrcAdapter({
    id: "npm-test",
    label: "npm test",
    description: "npm-backed test source",
    homepage: "https://www.npmjs.com/",
    pkg,
    include: /^\/src\//,
    categoryIndex: 2,
  });

const ghTree = (paths) =>
  JSON.stringify({
    sha: "d7a5583cffd80af515f7dfb69583c95cbdc9e2ce",
    tree: [
      { path: "src", mode: "040000", type: "tree" },
      ...paths.map((path) => ({ path, mode: "100644", type: "blob", size: 95 })),
    ],
    truncated: false,
  });

// GitHub's reply once the unauthenticated quota is spent (captured, client IP replaced). The
// reset is an hour ahead of the (possibly advanced) clock, so fetch.ts fails fast.
const githubRateLimited = () => ({
  status: 403,
  headers: {
    "x-ratelimit-limit": "60",
    "x-ratelimit-remaining": "0",
    "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
    "x-ratelimit-used": "60",
    "x-ratelimit-resource": "core",
  },
  body: JSON.stringify({
    message:
      "API rate limit exceeded for 203.0.113.7. (But here's the good news: Authenticated requests get a higher rate limit. Check out the documentation for more details.)",
    documentation_url:
      "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting",
  }),
});

// data.jsdelivr.com/v1/packages/gh/pmndrs/zustand@main?structure=flat, trimmed.
const JSDELIVR_GH_LISTING = JSON.stringify({
  type: "gh",
  name: "pmndrs/zustand",
  version: "main",
  default: null,
  files: [
    {
      name: "/.github/FUNDING.yml",
      hash: "snLkW7SKryx4XtgTAtXHE/M4mJDD2kpNPO2hFmOtzns=",
      size: 914,
    },
    { name: "/src/shallow.ts", hash: "QKjkBvtWU7DrzHYmD4I1DgE47SkE5NCyPQzvjj3kd2Y=", size: 95 },
    { name: "/src/vanilla.ts", hash: "OWrqelgIYuKD9TOvx0sm4PKpiZoeZmyLHUlK7r4g57w=", size: 3338 },
  ],
});

describe("package search ranking", () => {
  it("ranks file-name hits first, in any word order, after the category filter", async () => {
    mockFetch(() => ({
      body: ghTree([
        "src/controls/CameraHelper.ts",
        "src/core/CameraControls.tsx",
        "src/core/Text.tsx",
      ]),
    }));
    const a = ghAdapter("rank-owner/rank-repo");
    const ids = async (args) => (await a.search(args)).map((r) => r.id);
    // A plain substring filter returned the first listed path for "controls" and nothing for
    // "control camera".
    assert.deepEqual(await ids({ query: "controls", limit: 1 }), ["/src/core/CameraControls.tsx"]);
    assert.deepEqual(await ids({ query: "control camera" }), [
      "/src/core/CameraControls.tsx",
      "/src/controls/CameraHelper.ts",
    ]);
    assert.deepEqual(await ids({ query: "camera", category: "controls" }), [
      "/src/controls/CameraHelper.ts",
    ]);
    assert.deepEqual(await ids({ query: "orbit" }), []);
  });
});

describe("package titles and categories", () => {
  it("titles a generic or numbered file name by its folder", async () => {
    const titles = {
      "/design-md/stripe/DESIGN.md": "stripe", // awesome-design-md
      "/skills/frontend-design/SKILL.md": "frontend-design", // anthropics/skills
      "/skills/gsap-react/README.md": "gsap-react",
      "/examples/stagger/index.js": "stagger", // anime.js examples
      "/packages/docs/src/routes/(routes)/components/button/+page.md": "button", // daisyUI docs
      "/public/examples/application/accordions/1.html": "accordions 1", // HyperUI
      "/public/examples/application/accordions/1-dark.html": "accordions 1-dark",
      "/elements/accordion-examples/example-01.html": "accordion-examples example-01", // Pines
      // Everything else keeps its base name, as does a top-level file (no folder to name it).
      "/elements/accordion.html": "accordion",
      "/src/core/index.d.ts": "index.d",
      "/src/utils/stagger-grid.js": "stagger-grid",
      "/public/examples/application/accordions/1-light.html": "1-light",
      "/README.md": "README",
    };
    mockFetch((url) =>
      new URL(url).host === "api.github.com"
        ? { body: ghTree(Object.keys(titles).map((p) => p.slice(1))) }
        : { body: "<!-- file -->" },
    );
    const a = ghAdapter("title-owner/repo", { include: /^\// });
    const res = await a.search({ limit: 100 });
    assert.deepEqual(Object.fromEntries(res.map((r) => [r.id, r.title])), titles);
    for (const path of [
      "/design-md/stripe/DESIGN.md",
      "/public/examples/application/accordions/1.html",
    ]) {
      assert.equal((await a.getResource(path)).title, titles[path]);
    }
    // Search weighs the title like any file name: the "stagger" example comes first.
    assert.deepEqual(
      (await a.search({ query: "stagger" })).map((r) => r.id),
      ["/examples/stagger/index.js", "/src/utils/stagger-grid.js"],
    );
  });

  it("drops leading symbols from a category, so a client can pass it back", async () => {
    // img2threejs keeps shared helpers in /forge/_shared/, which categorySchema would refuse.
    mockFetch((url) =>
      new URL(url).host === "api.github.com"
        ? {
            body: ghTree([
              "forge/_shared/glb_container.py",
              "forge/stage1_intake/intake.py",
              "forge/_/notes.py",
            ]),
          }
        : { body: "# file" },
    );
    const a = ghAdapter("category-owner/repo", { include: /^\/forge\// });
    const cats = await a.listCategories();
    assert.deepEqual(cats.map((c) => c.id).sort(), ["misc", "shared", "stage1_intake"]);
    for (const c of cats) assert.ok(categorySchema.safeParse(c.id).success, c.id);
    const res = await a.search({ category: "shared" });
    assert.deepEqual(
      res.map((r) => [r.id, r.category]),
      [["/forge/_shared/glb_container.py", "shared"]],
    );
    const d = await a.getResource("/forge/_shared/glb_container.py");
    assert.equal(d.category, "shared");
    assert.deepEqual(d.tags, ["shared", "py"]);
  });
});

describe("GitHub sources: jsDelivr fallback", () => {
  it("lists and serves files through jsDelivr while the GitHub API is rate limited", async () => {
    const calls = mockFetch((url) => {
      const u = new URL(url);
      if (u.host === "api.github.com") return githubRateLimited();
      if (u.host === "data.jsdelivr.com") return { body: JSDELIVR_GH_LISTING };
      if (u.host === "cdn.jsdelivr.net") return { body: `// jsDelivr ${u.pathname}` };
      return { status: 404 };
    });
    const a = ghAdapter("fallback-owner/repo", { fallbackRef: "next" });
    assert.deepEqual(
      (await a.search({})).map((r) => r.id),
      ["/src/shallow.ts", "/src/vanilla.ts"],
    );
    assert.ok(
      calls.includes(
        "https://data.jsdelivr.com/v1/packages/gh/fallback-owner/repo@next?structure=flat",
      ),
    );
    const d = await a.getResource("/src/vanilla.ts");
    assert.equal(d.code.ts, "// jsDelivr /gh/fallback-owner/repo@next/src/vanilla.ts");
    assert.ok(
      !calls.some((u) => u.startsWith("https://raw.githubusercontent.com/")),
      "files come from the snapshot that was listed",
    );
  });

  it("uses a pinned commit SHA on GitHub and in the jsDelivr fallback", async () => {
    const sha = "d7a5583cffd80af515f7dfb69583c95cbdc9e2ce";
    const calls = mockFetch((url) => {
      const u = new URL(url);
      if (u.host === "api.github.com") {
        return u.pathname.includes("/pinned-down/")
          ? githubRateLimited()
          : { body: ghTree(["src/vanilla.ts"]) };
      }
      if (u.host === "data.jsdelivr.com") return { body: JSDELIVR_GH_LISTING };
      return { body: "// file" };
    });
    for (const repo of ["pin-owner/pinned-up", "pin-owner/pinned-down"]) {
      const a = ghAdapter(repo, { ref: sha, fallbackRef: "next" });
      await a.search({});
      await a.getResource("/src/vanilla.ts");
    }
    for (const url of [
      `https://api.github.com/repos/pin-owner/pinned-up/git/trees/${sha}?recursive=1`,
      `https://raw.githubusercontent.com/pin-owner/pinned-up/${sha}/src/vanilla.ts`,
      `https://data.jsdelivr.com/v1/packages/gh/pin-owner/pinned-down@${sha}?structure=flat`,
      `https://cdn.jsdelivr.net/gh/pin-owner/pinned-down@${sha}/src/vanilla.ts`,
    ]) {
      assert.ok(calls.includes(url), `expected a request to ${url}`);
    }
    assert.ok(!calls.some((u) => u.includes("@next")), "a pinned SHA wins over fallbackRef");
  });

  it("throws the GitHub error when jsDelivr cannot serve the repo either", async () => {
    const calls = mockFetch((url) => {
      if (new URL(url).host === "api.github.com") {
        return { status: 500, body: '{"message":"Server Error"}' };
      }
      return { status: 403, headers: NO_BACKOFF }; // jsDelivr's empty 403 for repos over 150 MB
    });
    await assert.rejects(
      ghAdapter("big-owner/huge-repo").search({}),
      (e) => e.name === "FetchError" && e.status === 500,
    );
    assert.ok(
      calls.includes(
        "https://data.jsdelivr.com/v1/packages/gh/big-owner/huge-repo@main?structure=flat",
      ),
      "fallbackRef defaults to main",
    );
    assert.equal(
      calls.filter((u) => u.startsWith("https://data.jsdelivr.com/")).length,
      1,
      "jsDelivr's 403 is permanent: not retried",
    );
  });

  it("does not fall back on a malformed GitHub reply", async () => {
    const calls = mockFetch(() => ({ body: "<!doctype html><title>Unicorn!</title>" }));
    await assert.rejects(ghAdapter("odd-owner/repo").search({}), SyntaxError);
    assert.ok(!calls.some((u) => u.includes("jsdelivr")));
  });
});

describe("package caches", () => {
  it("resolves the npm version before building a raw URL, even with no search first", async () => {
    const calls = mockFetch((url) => {
      const u = new URL(url);
      if (u.pathname === "/v1/package/npm/fresh-pkg") {
        return {
          body: JSON.stringify({ tags: { latest: "3.1.4" }, versions: ["3.1.4", "3.1.3"] }),
        };
      }
      if (u.pathname === "/v1/package/npm/gone-pkg") return { status: 404 };
      return { body: "// file" };
    });
    const d = await npmAdapter("fresh-pkg").getResource("/src/fx/x.js");
    assert.equal(d.code.js, "// file");
    assert.deepEqual(calls, [
      "https://data.jsdelivr.com/v1/package/npm/fresh-pkg",
      "https://cdn.jsdelivr.net/npm/fresh-pkg@3.1.4/src/fx/x.js",
    ]);
    // A failed version lookup is an error, not a missing file.
    await assert.rejects(npmAdapter("gone-pkg").getResource("/src/x.js"), /HTTP 404/);
  });

  it("re-lists a tree after an hour and re-resolves an npm version after six", async () => {
    let latest = "1.0.0";
    const calls = mockFetch((url) => {
      const u = new URL(url);
      if (u.host === "api.github.com") return { body: ghTree(["src/vanilla.ts"]) };
      if (u.pathname === "/v1/package/npm/ttl-pkg") {
        return { body: JSON.stringify({ tags: { latest }, versions: [latest] }) };
      }
      if (u.host === "data.jsdelivr.com") {
        return { body: JSON.stringify({ files: [{ name: "/src/fx/a.js" }] }) };
      }
      return { body: "// a" };
    });
    const count = (part) => calls.filter((u) => u.includes(part)).length;
    const gh = ghAdapter("ttl-owner/repo");
    const npm = npmAdapter("ttl-pkg");
    const searchBoth = () => Promise.all([gh.search({}), npm.search({})]);
    await searchBoth();
    latest = "2.0.0";
    // fetch.ts keeps these (unpinned) URLs 10 minutes, so past that only the memo saves a request.
    advanceClock(30 * MINUTE);
    await searchBoth();
    assert.equal(count("api.github.com"), 1, "tree still memoized after 30 minutes");

    advanceClock(31 * MINUTE);
    await searchBoth();
    assert.equal(count("api.github.com"), 2, "tree re-listed after an hour");
    assert.equal(count("/v1/package/npm/ttl-pkg"), 1, "version still memoized");

    advanceClock(5 * 60 * MINUTE);
    await searchBoth();
    assert.equal(count("/v1/package/npm/ttl-pkg"), 2, "version re-resolved after six hours");
    assert.ok(
      calls.includes("https://data.jsdelivr.com/v1/packages/npm/ttl-pkg@2.0.0?structure=flat"),
    );
    await npm.getResource("/src/fx/a.js");
    assert.ok(calls.includes("https://cdn.jsdelivr.net/npm/ttl-pkg@2.0.0/src/fx/a.js"));
  });

  it("serves files from the listing's host until a refresh succeeds, then GitHub again", async () => {
    let githubUp = false;
    let jsdelivrUp = true;
    mockFetch((url) => {
      const u = new URL(url);
      if (u.host === "api.github.com") {
        return githubUp ? { body: ghTree(["src/vanilla.ts"]) } : githubRateLimited();
      }
      if (u.host === "data.jsdelivr.com") {
        return jsdelivrUp ? { body: JSDELIVR_GH_LISTING } : { status: 503, headers: NO_BACKOFF };
      }
      return { body: `// ${u.host}` };
    });
    const a = ghAdapter("switch-owner/repo");
    const served = async () => (await a.getResource("/src/vanilla.ts")).code.ts;
    assert.equal((await a.search({})).length, 2);
    assert.equal(await served(), "// cdn.jsdelivr.net");

    jsdelivrUp = false; // the refresh fails on both hosts: the stale listing and its host stay
    advanceClock(61 * MINUTE);
    assert.equal((await a.search({})).length, 2);
    assert.equal(await served(), "// cdn.jsdelivr.net");

    githubUp = true;
    advanceClock(61 * MINUTE);
    assert.deepEqual(
      (await a.search({})).map((r) => r.id),
      ["/src/vanilla.ts"],
    );
    assert.equal(await served(), "// raw.githubusercontent.com");
  });
});
