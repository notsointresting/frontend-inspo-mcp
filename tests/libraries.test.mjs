// Library sources (Lenis, Anime.js, OGL, daisyUI, Open Props, ...): each adapter gets its own
// fake repo tree or npm listing, built from paths captured from the live trees: the files it
// must list (with category and language) and near misses it must leave out.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { idSchema } from "../dist/lib/validate.js";
import { librarySources } from "../dist/sources/libraries.js";
import { mockFetch } from "./helpers.mjs";

// hits: [path, category, language]; the first hit is the idFormat example.
// ref: the repo's default branch, which the jsDelivr fallback must read.
const GITHUB = {
  lenis: {
    repo: "darkroomengineering/lenis",
    ref: "main",
    license: "MIT",
    stack: ["javascript", "animation", "react"],
    hits: [
      ["/packages/core/src/lenis.ts", "core", "ts"],
      ["/packages/react/src/provider.tsx", "react", "tsx"],
      ["/packages/snap/src/snap.ts", "snap", "ts"],
      ["/packages/vue/src/use-lenis.ts", "vue", "ts"],
      ["/packages/core/lenis.css", "core", "css"],
    ],
    noise: [
      "/packages/core/index.ts",
      "/packages/core/package.json",
      "/packages/vue/nuxt/module.ts",
      "/playground/react/app.tsx",
    ],
  },
  animejs: {
    repo: "juliangarnier/anime",
    ref: "master",
    license: "MIT",
    stack: ["javascript", "animation"],
    hits: [
      ["/src/animation/animation.js", "animation", "js"],
      ["/src/easings/spring/index.js", "easings", "js"],
      ["/src/index.js", "index.js", "js"],
      ["/examples/stagger/index.js", "stagger", "js"],
      ["/examples/auto-layout/cards/index.html", "auto-layout", "html"],
    ],
    noise: [
      "/dist/bundles/anime.esm.js",
      "/examples/assets/css/styles.css",
      "/examples/onscroll-sticky/card.svg",
      "/examples/tsconfig.json",
    ],
  },
  ogl: {
    repo: "oframe/ogl",
    ref: "master",
    license: "Unlicense (declared in package.json and the README; the repo has no LICENSE file)",
    stack: ["3d", "javascript"],
    hits: [
      ["/src/core/Renderer.js", "core", "js"],
      ["/src/extras/helpers/AxesHelper.js", "extras", "js"],
      ["/src/index.js", "index.js", "js"],
      ["/examples/post-bloom.html", "post-bloom.html", "html"],
    ],
    noise: ["/types/core/Camera.d.ts", "/examples/assets/acorn.json", "/package.json"],
  },
  webgpusamples: {
    repo: "webgpu/webgpu-samples",
    ref: "main",
    license: "BSD-3-Clause",
    stack: ["3d", "javascript"],
    hits: [
      ["/sample/computeBoids/main.ts", "computeBoids", "ts"],
      ["/sample/computeBoids/updateSprites.wgsl", "computeBoids", "wgsl"],
      ["/sample/cornell/index.html", "cornell", "html"],
    ],
    noise: [
      "/sample/resizeCanvas/animatedCanvasSize.module.css",
      "/sample/tsconfig.json",
      "/shaders/basic.vert.wgsl",
      "/src/main.ts",
    ],
  },
  uikit: {
    repo: "pmndrs/uikit",
    ref: "main",
    license: "MIT",
    stack: ["react", "3d"],
    hits: [
      ["/packages/uikit/src/components/container.ts", "uikit", "ts"],
      ["/packages/react/src/index.tsx", "react", "tsx"],
      ["/packages/kits/default/core/src/button/index.ts", "kits", "ts"],
      ["/packages/kits/horizon/core/src/avatar/index.ts", "kits", "ts"],
    ],
    noise: [
      "/packages/kits/default/react/generate.ts",
      "/packages/kits/default/react/src/.gitkeep",
      "/packages/uikit/tests/clipping.spec.ts",
      "/packages/msdfonts/src/firaCode.ts",
      "/examples/auth/src/App.tsx",
    ],
  },
  rapier: {
    repo: "pmndrs/react-three-rapier",
    ref: "main",
    license: "MIT",
    stack: ["react", "3d"],
    hits: [
      ["/packages/react-three-rapier/src/components/RigidBody.tsx", "components", "tsx"],
      ["/packages/react-three-rapier/src/hooks/joints.ts", "hooks", "ts"],
      ["/packages/react-three-rapier-addons/src/addons/attractor/Attractor.tsx", "addons", "tsx"],
      ["/demo/src/examples/car/CarExample.tsx", "car", "tsx"],
    ],
    noise: [
      "/packages/react-three-rapier/tests/physics.test.tsx",
      "/demo/src/App.tsx",
      "/demo/src/examples/damping/green.png",
      "/demo/src/models/bendy.glb",
    ],
  },
  leva: {
    repo: "pmndrs/leva",
    ref: "main",
    license: "MIT",
    stack: ["react"],
    hits: [
      ["/packages/leva/src/useControls.ts", "leva", "ts"],
      ["/packages/leva/src/components/Button/Button.tsx", "leva", "tsx"],
      ["/packages/plugin-bezier/src/Bezier.tsx", "plugin-bezier", "tsx"],
    ],
    noise: [
      "/packages/plugin-bezier/src/Bezier.stories.css",
      "/packages/leva/src/headless/README.md",
      "/packages/leva/stories/Folder.stories.tsx",
      "/demo/src/App.jsx",
    ],
  },
  pmndrsmath: {
    repo: "pmndrs/math",
    ref: "main",
    license: "MIT",
    stack: ["3d", "javascript"],
    hits: [
      ["/src/core/vec3.ts", "core", "ts"],
      ["/src/noise/simplex2d.ts", "noise", "ts"],
      ["/src/index.ts", "index.ts", "ts"],
    ],
    noise: [
      "/benches/core/vec3.bench.ts",
      "/examples/src/example-spring.ts",
      "/tst/unit/color/color.test.ts",
    ],
  },
  daisyui: {
    repo: "saadeghi/daisyui",
    ref: "master",
    license: "MIT",
    stack: ["css", "tailwind", "html"],
    hits: [
      ["/packages/daisyui/src/components/button.css", "daisyui", "css"],
      ["/packages/docs/src/routes/(routes)/components/button/+page.md", "docs", "md"],
    ],
    noise: [
      "/packages/daisyui/src/themes/dark.css",
      "/packages/daisyui/functions/variables.css",
      "/packages/docs/src/routes/(routes)/components/button/accessibility/+page.md",
      "/packages/docs/src/routes/(routes)/components/+page.svelte",
    ],
  },
  flowbite: {
    repo: "themesberg/flowbite",
    ref: "main",
    license: "CC-BY-3.0 (Flowbite documentation; the Flowbite library code is MIT)",
    stack: ["html", "tailwind", "javascript"],
    hits: [
      ["/content/components/modal.md", "components", "md"],
      ["/content/forms/checkbox.md", "forms", "md"],
      ["/content/typography/headings.md", "typography", "md"],
      ["/content/plugins/charts.md", "plugins", "md"],
    ],
    noise: [
      "/content/getting-started/license.md",
      "/content/customize/colors.md",
      "/content/_index.html",
      "/src/components/modal/index.ts",
    ],
  },
};

const NPM = {
  openprops: {
    pkg: "open-props",
    license: "MIT",
    stack: ["design-tokens", "css"],
    hits: [
      ["/src/props.colors.js", "src", "js"],
      ["/open-props.tokens.json", "open-props.tokens.json", "json"],
    ],
    noise: [
      "/src/props.colors.css",
      "/src/props.colors.d.ts",
      "/open-props.min.css",
      "/package.json",
    ],
  },
  radixcolors: {
    pkg: "@radix-ui/colors",
    license: "MIT",
    stack: ["design-tokens", "css"],
    hits: [
      ["/blue-dark.css", "blue-dark.css", "css"],
      ["/blue.css", "blue.css", "css"],
      ["/black-alpha.css", "black-alpha.css", "css"],
    ],
    noise: ["/index.mjs", "/types/light.d.ts", "/colors.png", "/package.json"],
  },
};

const CASES = { ...GITHUB, ...NPM };
const VERSION = "9.9.9";
const byName = new Map(Object.values(CASES).map((c) => [c.repo ?? c.pkg, c]));
const adapter = (id) => librarySources.find((a) => a.id === id);
const pathsOf = (c) => [...c.hits.map(([p]) => p), ...c.noise];

// The name after a jsDelivr/GitHub prefix, without the "@version" suffix.
const nameAt = (pathname, prefix) => {
  const rest = pathname.slice(prefix.length);
  const at = rest.lastIndexOf("@");
  return at > 0 ? rest.slice(0, at) : rest;
};

/** Serves each repo's tree and each package's listing; `githubUp: false` rate-limits GitHub. */
function serve({ githubUp = true } = {}) {
  return mockFetch((url) => {
    const u = new URL(url);
    if (u.host === "api.github.com") {
      if (!githubUp) return githubRateLimited();
      // /repos/<owner>/<repo>/git/trees/HEAD
      const c = byName.get(u.pathname.split("/").slice(2, 4).join("/"));
      if (!c) return { status: 404 };
      const tree = [
        { path: "src", mode: "040000", type: "tree" }, // directories are skipped
        ...pathsOf(c).map((p) => ({ path: p.slice(1), mode: "100644", type: "blob", size: 95 })),
      ];
      return { body: JSON.stringify({ tree, truncated: false }) };
    }
    if (u.host === "data.jsdelivr.com") {
      if (u.pathname.startsWith("/v1/package/npm/")) {
        return { body: JSON.stringify({ tags: { latest: VERSION }, versions: [VERSION] }) };
      }
      const kind = u.pathname.startsWith("/v1/packages/gh/") ? "gh" : "npm";
      const c = byName.get(nameAt(u.pathname, `/v1/packages/${kind}/`));
      if (!c) return { status: 404 };
      return { body: JSON.stringify({ files: pathsOf(c).map((name) => ({ name, size: 95 })) }) };
    }
    return { body: `// contents of ${u.pathname}` };
  });
}

// GitHub's reply once the API quota is spent; the reset is far enough ahead that fetch.ts fails
// fast and the adapter falls back to jsDelivr.
const githubRateLimited = () => ({
  status: 403,
  headers: {
    "x-ratelimit-limit": "60",
    "x-ratelimit-remaining": "0",
    "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
  },
  body: JSON.stringify({ message: "API rate limit exceeded for 203.0.113.7." }),
});

const rawUrl = (c, path) =>
  c.repo
    ? `https://raw.githubusercontent.com/${c.repo}/HEAD${path}`
    : `https://cdn.jsdelivr.net/npm/${c.pkg}@${VERSION}${path}`;

describe("library sources", () => {
  it("registers every library adapter, in order", () => {
    assert.deepEqual(
      librarySources.map((a) => a.id),
      Object.keys(CASES),
    );
  });

  for (const [id, c] of Object.entries(CASES)) {
    it(`${id}: metadata`, () => {
      const a = adapter(id);
      assert.deepEqual(a.stack, c.stack);
      assert.ok(a.homepage.startsWith("https://"));
      assert.ok(a.hasInlineCode);
      assert.ok(!a.heavy, "one memoized listing per hour: cheap enough for search_all");
      assert.ok(a.idFormat.includes(`"${c.hits[0][0]}"`), "idFormat shows a listed path");
      assert.ok(a.description.includes(`Real source from the ${c.repo ?? c.pkg}`));
    });

    it(`${id}: lists exactly the included files and serves them`, async () => {
      const calls = serve();
      const a = adapter(id);
      const res = await a.search({ limit: 100 });
      assert.deepEqual(res.map((r) => r.id).sort(), c.hits.map(([p]) => p).sort());
      const cats = await a.listCategories();
      for (const [path, category, lang] of c.hits) {
        const hit = res.find((r) => r.id === path);
        assert.equal(hit.category, category, path);
        assert.deepEqual(hit.tags, [category, lang]);
        assert.ok(idSchema.safeParse(path).success, `${path} passes idSchema`);
        assert.ok(
          cats.some((x) => x.id === category && x.count >= 1),
          category,
        );
      }

      const [path, category, lang] = c.hits[0];
      const d = await a.getResource(path);
      assert.equal(d.id, path);
      assert.equal(d.category, category);
      assert.equal(d.license, c.license);
      assert.match(d.code[lang], /^\/\/ contents of \//);
      assert.ok(calls.includes(rawUrl(c, path)), `expected a request to ${rawUrl(c, path)}`);
    });
  }
});

// memoAsync and fetch.ts read Date.now(); moving it forward expires the listing memo (1 h).
let clockOffset = 0;
function advanceClock(ms) {
  if (!clockOffset) {
    const realNow = Date.now;
    Date.now = () => realNow() + clockOffset;
  }
  clockOffset += ms;
}

describe("library sources: jsDelivr fallback", () => {
  for (const [id, c] of Object.entries(GITHUB)) {
    it(`${id}: reads the default branch (${c.ref}) while GitHub is rate limited`, async () => {
      advanceClock(61 * 60_000);
      const calls = serve({ githubUp: false });
      const a = adapter(id);
      const res = await a.search({ limit: 100 });
      assert.deepEqual(res.map((r) => r.id).sort(), c.hits.map(([p]) => p).sort());
      const [path, , lang] = c.hits[0];
      const d = await a.getResource(path);
      assert.match(d.code[lang], /contents of/);
      for (const url of [
        `https://data.jsdelivr.com/v1/packages/gh/${c.repo}@${c.ref}?structure=flat`,
        `https://cdn.jsdelivr.net/gh/${c.repo}@${c.ref}${path}`,
      ]) {
        assert.ok(calls.includes(url), `expected a request to ${url}`);
      }
    });
  }
});
