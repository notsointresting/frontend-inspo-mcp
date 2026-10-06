// Codrops (the codrops GitHub org): repo listing, search, and getResource's file picking and
// caps, against trimmed replies captured from api.github.com. The adapter memoizes the repo
// list, so the first test also checks the listing requests.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { idSchema } from "../dist/lib/validate.js";
import { codrops } from "../dist/sources/codrops.js";
import { mockFetch } from "./helpers.mjs";

const MIT = {
  key: "mit",
  name: "MIT License",
  spdx_id: "MIT",
  url: "https://api.github.com/licenses/mit",
  node_id: "MDc6TGljZW5zZTEz",
};

/** A record of /orgs/codrops/repos, trimmed to the fields that matter. */
const repo = (r) => ({
  full_name: `codrops/${r.name}`,
  private: false,
  html_url: `https://github.com/codrops/${r.name}`,
  fork: false,
  homepage: null,
  topics: [],
  license: MIT,
  default_branch: "main",
  ...r,
});

const ELASTIC = repo({
  name: "ElasticGridScroll",
  description:
    "A scroll effect where each column of a grid moves at a slightly different speed, creating a soft, elastic feel as you scroll.",
  created_at: "2025-06-03T09:15:51Z",
});
const UNTITLED = repo({
  name: "RepeatingImageTransition",
  description: null,
  created_at: "2025-04-28T11:50:04Z",
});
const FORMATIONS = repo({
  name: "OnScrollLayoutFormations",
  description: "Layout formations on scroll using GSAP",
  created_at: "2024-09-18T13:28:22Z",
  homepage: "https://tympanus.net/codrops/2024/09/18/exploration-of-on-scroll-layout-formations/",
  topics: ["gsap", "gsap-scrolltrigger"],
});
const ASTRO = repo({
  name: "astro-shop-view-transitions",
  description:
    "Minimalist Shop with Browser View Transitions API and Astro for a smoother navigation experience.",
  created_at: "2023-10-03T12:12:09Z",
  homepage: "https://tympanus.net/codrops/?p=73418",
  topics: ["astro"],
  default_branch: "master",
});
const GRID = repo({
  name: "GridLayoutAnimation",
  description:
    "A simple layout transition where a small grid animates to a larger view, using the Flip plugin from GreenSock.",
  created_at: "2022-07-13T12:33:52Z",
  homepage: "https://tympanus.net/codrops/?p=64172",
  topics: ["animation", "gsap-flip", "javascript", "layout", "webdesign"],
});
const SKETCHES = repo({
  name: "codrops-sketches",
  description: "A collection of demo variations, ideas, concepts & experiments.",
  created_at: "2022-02-25T11:23:15Z",
});
// Never listed or served. Most older demos have no license at all (BookBlock). The fork is
// given an MIT license here so that only the fork flag rules it out; the last two are made up.
const UNLICENSED = repo({
  name: "BookBlock",
  description:
    "A jQuery plugin that will create a booklet-like component that let's you navigate through its items by flipping the pages.",
  created_at: "2012-09-03T15:57:21Z",
  license: null,
  default_branch: "master",
});
const FORK = repo({
  name: "InfiniteTubes",
  description:
    "A tunnel experiment in WebGL inspired by the effect seen on http://www.fornasetti.com/",
  fork: true,
  created_at: "2017-05-10T10:37:13Z",
  homepage: "https://tympanus.net/Development/InfiniteTubes/",
});
const PRIVATE = repo({ name: "PrivateDraft", private: true, created_at: "2026-01-02T10:00:00Z" });
const APACHE = repo({
  name: "ApacheDemo",
  created_at: "2026-01-03T10:00:00Z",
  license: { key: "apache-2.0", name: "Apache License 2.0", spdx_id: "Apache-2.0" },
});
const NOT_SERVED = [UNLICENSED, FORK, PRIVATE, APACHE];

// A full first page makes the adapter ask for the next one; the short second page ends it.
const FILLERS = Array.from({ length: 95 }, (_, i) =>
  repo({ name: `UnlicensedDemo${i}`, license: null, created_at: "2013-02-01T10:00:00Z" }),
);
const PAGES = [
  [ELASTIC, FORMATIONS, UNLICENSED, FORK, PRIVATE, ...FILLERS],
  [ASTRO, UNTITLED, GRID, SKETCHES, APACHE],
];

/** A git-tree reply: [path, size] is a file, [path] a directory. */
const gitTree = (entries) => ({
  sha: "40e474582ae72df26cd9d90b05d5b15fed423abd",
  tree: entries.map(([path, size]) =>
    size === undefined
      ? { path, mode: "040000", type: "tree" }
      : { path, mode: "100644", type: "blob", size },
  ),
  truncated: false,
});

// codrops/ElasticGridScroll at HEAD, with most of its 40 images left out.
const ELASTIC_TREE = gitTree([
  [".DS_Store", 10244],
  [".gitattributes", 66],
  [".gitignore", 62],
  ["AGENTS.md", 18653],
  ["LICENSE", 1103],
  ["README.md", 955],
  ["assets"],
  ["assets/.DS_Store", 6148],
  ["assets/1.webp", 101830],
  ["assets/10.webp", 78828],
  ["css"],
  ["css/base.css", 6937],
  ["favicon.ico", 15086],
  ["index.html", 29867],
  ["index2.html", 26620],
  ["index3.html", 20938],
  ["index4.html", 31350],
  ["index5.html", 29850],
  ["index6.html", 31516],
  ["index7.html", 29917],
  ["index8.html", 52908],
  ["index9.html", 52904],
  ["js"],
  ["js/.DS_Store", 6148],
  ["js/ScrollSmoother.min.js", 13373],
  ["js/ScrollTrigger.min.js", 44575],
  ["js/demo1/index.js", 5400],
  ["js/demo2/index.js", 6499],
  ["js/demo3/index.js", 5000],
  ["js/demo4/index.js", 5452],
  ["js/demo5/index.js", 8178],
  ["js/demo6/ElasticColumns.js", 14190],
  ["js/demo6/index.js", 6829],
  ["js/demo7/AccordionFold.js", 15837],
  ["js/demo7/index.js", 6725],
  ["js/demo8/ElasticTwist.js", 15367],
  ["js/demo8/index.js", 6708],
  ["js/demo9/Whirlpool.js", 18288],
  ["js/demo9/index.js", 6686],
  ["js/gsap.min.js", 72927],
  ["js/three.core.js", 1458113],
  ["js/three.module.js", 662772],
  ["js/utils.js", 1111],
]);

// codrops/GridLayoutAnimation at HEAD: a Parcel project with dist/ and node_modules/ committed
// (3,603 dependency files; four kept here) and most images left out.
const GRID_TREE = gitTree([
  [".gitattributes", 66],
  ["LICENSE", 1103],
  ["README.md", 891],
  ["dist/1.1770e3b3.jpg", 74599],
  ["dist/index.b5e7c14d.js", 95420],
  ["dist/index.d73f7ad5.css", 6431],
  ["dist/index.html", 4719],
  ["node_modules/gsap/CSSPlugin.js", 56902],
  ["node_modules/gsap/CSSRulePlugin.js", 3556],
  ["node_modules/gsap/CustomEase.js", 11237],
  ["node_modules/gsap/Draggable.js", 99440],
  ["package-lock.json", 166528],
  ["package.json", 781],
  ["src/.gitignore", 51],
  ["src/css/base.css", 8568],
  ["src/favicon.ico", 15086],
  ["src/img/1.jpg", 74639],
  ["src/index.html", 4933],
  ["src/js/index.js", 5638],
  ["src/js/utils.js", 388],
]);

// codrops/astro-shop-view-transitions at HEAD; "[slug]" is not allowed in an id.
const ASTRO_TREE = gitTree([
  [".gitignore", 229],
  ["LICENSE", 1103],
  ["README.md", 1763],
  ["astro.config.mjs", 181],
  ["package.json", 361],
  ["pnpm-lock.yaml", 130577],
  ["src/components/ProductCard.astro", 1218],
  ["src/config.ts", 380],
  ["src/data/index.ts", 2145],
  ["src/env.d.ts", 85],
  ["src/layouts/Layout.astro", 2330],
  ["src/pages/index.astro", 1116],
  ["src/pages/product/[slug]/index.astro", 3242],
  ["tailwind.config.cjs", 178],
  ["tsconfig.json", 41],
]);

// codrops/OnScrollLayoutFormations at HEAD, with the sizes of three files raised to reach the
// 200 KB cap.
const BIG_TREE = gitTree([
  ["LICENSE", 1103],
  ["README.md", 837],
  ["css/base.css", 60000],
  ["index.html", 150000],
  ["js/ScrollTrigger.min.js", 43380],
  ["js/gsap.min.js", 72214],
  ["js/imagesloaded.pkgd.min.js", 5485],
  ["js/index.js", 30000],
  ["js/lenis.min.js", 13618],
  ["js/smoothscroll.js", 759],
  ["js/utils.js", 579],
]);

// codrops/codrops-sketches at HEAD, cut to its first four sketches (of 29): one folder each,
// and no index.html, css/ or js/ at the top.
const sketch = (name, css, img, html, js) => [
  [name],
  [`${name}/css/base.css`, css],
  [`${name}/img/1.jpg`, img],
  [`${name}/index.html`, html],
  [`${name}/js/index.js`, js],
];
const SKETCHES_TREE = gitTree([
  [".gitignore", 1610],
  ...sketch("001-repetition-hover-effect-round", 2029, 30374, 1827, 4699),
  ...sketch("002-repetition-hover-effect-square", 1983, 73809, 1936, 4699),
  ...sketch("003-repetition-hover-effect-rotated", 1999, 114056, 2006, 4699),
  ...sketch("004-repetition-hover-effect-filter", 2009, 108790, 1970, 4879),
  ["LICENSE", 1064],
  ["README.md", 4043],
]);

const TREES = {
  ElasticGridScroll: ELASTIC_TREE,
  GridLayoutAnimation: GRID_TREE,
  "astro-shop-view-transitions": ASTRO_TREE,
  OnScrollLayoutFormations: BIG_TREE,
  "codrops-sketches": SKETCHES_TREE,
};

function serve() {
  return mockFetch((url) => {
    const u = new URL(url);
    if (u.host === "api.github.com" && u.pathname === "/orgs/codrops/repos") {
      return { body: JSON.stringify(PAGES[Number(u.searchParams.get("page")) - 1] ?? []) };
    }
    const tree = /^\/repos\/codrops\/([^/]+)\/git\/trees\/HEAD$/.exec(u.pathname);
    if (u.host === "api.github.com" && tree?.[1] && TREES[tree[1]]) {
      return { body: JSON.stringify(TREES[tree[1]]) };
    }
    if (u.host === "raw.githubusercontent.com") return { body: `/* ${u.pathname} */` };
    return { status: 404 };
  });
}

const raw = (name, path) => `/* /codrops/${name}/HEAD/${path} */`;
const ids = async (args) => (await codrops.search(args)).map((r) => r.id);

describe("codrops: repo list and search", () => {
  it("lists only public, non-fork MIT repos, newest first, reading pages until a short one", async () => {
    const calls = serve();
    assert.deepEqual(await ids({ limit: 100 }), [
      "ElasticGridScroll",
      "RepeatingImageTransition",
      "OnScrollLayoutFormations",
      "astro-shop-view-transitions",
      "GridLayoutAnimation",
      "codrops-sketches",
    ]);
    assert.deepEqual(calls, [
      "https://api.github.com/orgs/codrops/repos?per_page=100&page=1",
      "https://api.github.com/orgs/codrops/repos?per_page=100&page=2",
    ]);
    await codrops.search({ query: "grid" });
    await codrops.listCategories();
    assert.equal(calls.length, 2, "the list is memoized");
  });

  it("matches name, description and topics, filters by year and links the article", async () => {
    serve();
    assert.deepEqual(await ids({ query: "grid scroll" }), ["ElasticGridScroll"]);
    assert.deepEqual(await ids({ query: "gsap" }), [
      "OnScrollLayoutFormations",
      "GridLayoutAnimation",
    ]);
    assert.deepEqual(await ids({ category: "2024" }), ["OnScrollLayoutFormations"]);
    assert.deepEqual(await ids({ limit: 2 }), ["ElasticGridScroll", "RepeatingImageTransition"]);

    const [formations] = await codrops.search({ query: "layout formations" });
    assert.deepEqual(formations, {
      source: "codrops",
      id: "OnScrollLayoutFormations",
      title: "OnScrollLayoutFormations",
      description: "Layout formations on scroll using GSAP",
      category: "2024",
      url: FORMATIONS.homepage,
      tags: ["gsap", "gsap-scrolltrigger"],
    });
    const [untitled] = await codrops.search({ query: "repeating image" });
    assert.equal(untitled.description, undefined);
    assert.equal(untitled.url, "https://github.com/codrops/RepeatingImageTransition");

    assert.deepEqual(await codrops.listCategories(), [
      { id: "2025", label: "2025", count: 2 },
      { id: "2024", label: "2024", count: 1 },
      { id: "2023", label: "2023", count: 1 },
      { id: "2022", label: "2022", count: 2 },
    ]);
  });
});

describe("codrops: getResource", () => {
  it("returns a repo's entry page, styles and scripts, at most 10 files, and lists the rest", async () => {
    const calls = serve();
    const d = await codrops.getResource("ElasticGridScroll");
    const picked = [
      "index.html",
      "css/base.css",
      "js/utils.js",
      "js/demo1/index.js",
      "js/demo2/index.js",
      "js/demo3/index.js",
      "js/demo4/index.js",
      "js/demo5/index.js",
      "js/demo6/ElasticColumns.js",
      "js/demo6/index.js",
    ];
    assert.deepEqual(Object.keys(d.code), picked);
    for (const p of picked) assert.equal(d.code[p], raw("ElasticGridScroll", p));
    // Vendored libraries (minified, or bigger than the whole cap) and non-web files are left out.
    assert.deepEqual(d.extra.files, [
      "js/demo7/AccordionFold.js",
      "js/demo7/index.js",
      "js/demo8/ElasticTwist.js",
      "js/demo8/index.js",
      "js/demo9/index.js",
      "js/demo9/Whirlpool.js",
      "index2.html",
      "index3.html",
      "index4.html",
      "index5.html",
      "index6.html",
      "index7.html",
      "index8.html",
      "index9.html",
    ]);
    for (const f of d.extra.files) assert.ok(idSchema.safeParse(`ElasticGridScroll/${f}`).success);
    assert.equal(d.extra.repo, "https://github.com/codrops/ElasticGridScroll");
    assert.equal(d.id, "ElasticGridScroll");
    assert.equal(d.category, "2025");
    assert.equal(d.license, "MIT");
    assert.equal(d.author, "Codrops");
    assert.ok(
      calls.includes(
        "https://api.github.com/repos/codrops/ElasticGridScroll/git/trees/HEAD?recursive=1",
      ),
    );
    assert.ok(
      calls.includes("https://raw.githubusercontent.com/codrops/ElasticGridScroll/HEAD/index.html"),
    );
  });

  it("stops at 200 KB but still adds smaller files that fit", async () => {
    serve();
    const d = await codrops.getResource("OnScrollLayoutFormations");
    assert.deepEqual(Object.keys(d.code), [
      "index.html",
      "js/index.js",
      "js/smoothscroll.js",
      "js/utils.js",
    ]);
    assert.deepEqual(d.extra.files, ["css/base.css"]);
  });

  it("skips build output and dependencies, and paths that are not valid ids", async () => {
    serve();
    const grid = await codrops.getResource("GridLayoutAnimation");
    assert.deepEqual(Object.keys(grid.code), [
      "src/index.html",
      "src/css/base.css",
      "src/js/index.js",
      "src/js/utils.js",
    ]);
    assert.deepEqual(grid.extra.files, []);

    const astro = await codrops.getResource("astro-shop-view-transitions");
    assert.deepEqual(Object.keys(astro.code), [
      "astro.config.mjs",
      "src/config.ts",
      "src/env.d.ts",
      "src/components/ProductCard.astro",
      "src/data/index.ts",
      "src/layouts/Layout.astro",
      "src/pages/index.astro",
    ]);
    assert.deepEqual(astro.extra.files, []);
    assert.equal(
      await codrops.getResource("astro-shop-view-transitions/src/pages/product/[slug]/index.astro"),
      null,
    );
  });

  it("keeps each folder together when a repo has no top-level demo", async () => {
    serve();
    const d = await codrops.getResource("codrops-sketches");
    const files = (n) => [`${n}/css/base.css`, `${n}/index.html`, `${n}/js/index.js`];
    const [first, second, third, fourth] = [
      "001-repetition-hover-effect-round",
      "002-repetition-hover-effect-square",
      "003-repetition-hover-effect-rotated",
      "004-repetition-hover-effect-filter",
    ].map(files);
    assert.deepEqual(Object.keys(d.code), [...first, ...second, ...third, fourth[0]]);
    assert.deepEqual(d.extra.files, fourth.slice(1));
  });

  it("returns one file as <repo>/<path>, only if the repo's listing has it", async () => {
    serve();
    const d = await codrops.getResource("ElasticGridScroll/js/demo7/AccordionFold.js");
    assert.equal(d.id, "ElasticGridScroll/js/demo7/AccordionFold.js");
    assert.equal(d.title, d.id);
    assert.deepEqual(d.code, {
      "js/demo7/AccordionFold.js": raw("ElasticGridScroll", "js/demo7/AccordionFold.js"),
    });
    assert.equal(d.extra.path, "js/demo7/AccordionFold.js");
    assert.equal(d.license, "MIT");
    for (const id of [
      "ElasticGridScroll/js/gsap.min.js", // vendored GSAP build, not Codrops' MIT code
      "ElasticGridScroll/js/three.core.js",
      "ElasticGridScroll/assets/1.webp",
      "ElasticGridScroll/js/missing.js",
      "ElasticGridScroll/",
      "GridLayoutAnimation/dist/index.html",
      "GridLayoutAnimation/node_modules/gsap/CSSPlugin.js",
    ]) {
      assert.equal(await codrops.getResource(id), null, id);
    }
  });

  it("never serves a repo that is unlicensed, not MIT, a fork or private", async () => {
    const calls = serve();
    for (const r of NOT_SERVED) {
      assert.equal(await codrops.getResource(r.name), null, r.name);
      assert.equal(await codrops.getResource(`${r.name}/index.html`), null, r.name);
      assert.ok(!calls.some((u) => u.includes(`/${r.name}/`)), `${r.name} was never fetched`);
    }
    assert.equal(await codrops.getResource("NoSuchDemo"), null);
  });
});
