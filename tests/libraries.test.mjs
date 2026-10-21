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
  baseui: {
    repo: "mui/base-ui",
    ref: "master",
    license: "MIT",
    stack: ["react", "tailwind", "accessibility"],
    hits: [
      [
        "/docs/src/app/(docs)/react/components/accordion/demos/hero/tailwind/index.tsx",
        "accordion",
        "tsx",
      ],
      [
        "/docs/src/app/(docs)/react/components/popover/demos/hero/tailwind/index.tsx",
        "popover",
        "tsx",
      ],
      [
        "/docs/src/app/(docs)/react/components/toggle-group/demos/multiple/tailwind/index.tsx",
        "toggle-group",
        "tsx",
      ],
    ],
    noise: [
      "/docs/src/app/(docs)/react/components/accordion/demos/hero/css-modules/index.tsx",
      "/docs/src/app/(docs)/react/components/accordion/demos/hero/index.ts",
      "/docs/src/app/(docs)/react/components/accordion/demos/_index.module.css",
      "/docs/src/app/(docs)/react/components/accordion/page.mdx",
      "/packages/react/src/accordion/header/AccordionHeader.tsx",
    ],
  },
  visx: {
    repo: "airbnb/visx",
    ref: "master",
    license: "MIT",
    stack: ["react", "javascript"],
    hits: [
      ["/packages/visx-demo/src/sandboxes/visx-bars/Example.tsx", "visx-bars", "tsx"],
      ["/packages/visx-demo/src/sandboxes/visx-xychart/ExampleControls.tsx", "visx-xychart", "tsx"],
      ["/packages/visx-demo/src/sandboxes/visx-xychart/customTheme.ts", "visx-xychart", "ts"],
    ],
    noise: [
      "/packages/visx-demo/src/sandboxes/visx-bars/index.tsx",
      "/packages/visx-demo/src/sandboxes/visx-bars/sandbox-styles.css",
      "/packages/visx-demo/src/sandboxes/visx-geo-albers-usa/usa-topo.d.ts",
      "/packages/visx-demo/src/sandboxes/template/Example.tsx",
      "/packages/visx-demo/src/sandboxes/exampleToVisxDependencyLookup.ts",
      "/packages/visx-shape/src/shapes/Bar.tsx",
    ],
  },
  reaviz: {
    repo: "reaviz/reaviz",
    ref: "master",
    license: "Apache-2.0",
    stack: ["react"],
    hits: [
      ["/src/BarChart/BarChart.tsx", "BarChart", "tsx"],
      ["/src/BarChart/BarChart.module.css", "BarChart", "css"],
      ["/src/PieChart/DonutChart.story.tsx", "PieChart", "tsx"],
      ["/src/common/utils/ticks.ts", "common", "ts"],
      ["/src/index.ts", "index.ts", "ts"],
    ],
    noise: [
      "/src/BarChart/BarChart.module.css.d.ts",
      "/src/common/utils/ticks.test.ts",
      "/src/PieChart/__snapshots__/PieChart.story.tsx.snap",
      "/src/typings.d.ts",
      "/blocks/AreaChartBlocksDarkLarge.story.tsx",
    ],
  },
  tamagui: {
    repo: "tamagui/tamagui",
    ref: "main",
    license: "MIT",
    stack: ["react", "animation", "guidance"],
    heavy: true,
    hits: [
      ["/code/demos/src/ButtonDemo.tsx", "demos", "tsx"],
      ["/code/bento/src/forms/layouts/SignInRightImage.tsx", "bento", "tsx"],
      ["/code/ui/tamagui/src/components/Button.tsx", "ui", "tsx"],
      ["/code/tamagui.dev/data/docs/core/styled.mdx", "tamagui.dev", "mdx"],
      ["/skills/tamagui/SKILL.md", "tamagui", "md"],
    ],
    noise: [
      "/code/demos/src/index.tsx",
      "/code/demos/types/ButtonDemo.d.ts",
      "/code/bento/src/icons/Bell.tsx",
      "/code/bento/src/forms/inputs/index.tsx",
      "/code/ui/tamagui/src/components/Button.manifest.ts",
      "/code/tamagui.dev/data/docs/components/button/3.0.0.mdx",
    ],
  },
  rekaui: {
    repo: "unovue/reka-ui",
    ref: "v2.11.0", // the fallback's release tag: jsDelivr cannot read the "v2" branch
    license: "MIT",
    stack: ["javascript", "tailwind", "accessibility"],
    hits: [
      ["/docs/components/demo/Accordion/tailwind/index.vue", "Accordion", "vue"],
      ["/docs/components/examples/DataTable/data.ts", "DataTable", "ts"],
      ["/docs/content/docs/components/accordion.md", "components", "md"],
      ["/packages/core/src/Accordion/AccordionRoot.vue", "Accordion", "vue"],
      ["/packages/core/src/shared/useTypeahead.ts", "shared", "ts"],
    ],
    noise: [
      "/docs/components/demo/Accordion/tailwind/tailwind.config.js",
      "/docs/components/demo/Accordion/css/index.vue",
      "/docs/content/meta/AccordionRoot.md",
      "/packages/core/src/Accordion/Accordion.test.ts",
      "/packages/core/src/Accordion/story/AccordionSingle.story.vue",
      "/packages/core/src/Accordion/index.ts",
    ],
  },
  vuesticadmin: {
    repo: "epicmaxco/vuestic-admin",
    ref: "master",
    license: "MIT",
    stack: ["javascript", "tailwind"],
    hits: [
      ["/src/pages/admin/dashboard/Dashboard.vue", "admin", "vue"],
      ["/src/pages/auth/Login.vue", "auth", "vue"],
      ["/src/pages/projects/composables/useProjects.ts", "projects", "ts"],
      ["/src/components/navbar/AppNavbar.vue", "navbar", "vue"],
      ["/src/layouts/AppLayout.vue", "AppLayout.vue", "vue"],
    ],
    noise: [
      "/src/components/icons/VaIconVue.vue",
      "/src/pages/payments/payment-system/PaymentSystem.stories.ts",
      "/src/pages/payments/payment-system/visa.png",
      "/src/pages/faq/data/navigationLinks.json",
      "/src/data/charts/lineChartData.ts",
      "/src/App.vue",
    ],
  },
  semanticui: {
    repo: "Semantic-Org/Semantic-UI",
    ref: "master",
    license: "MIT",
    stack: ["css", "html", "javascript"],
    hits: [
      ["/src/definitions/elements/button.less", "elements", "less"],
      ["/src/definitions/modules/dropdown.js", "modules", "js"],
      ["/src/themes/default/globals/site.variables", "default", "variables"],
      ["/examples/homepage.html", "misc", "html"],
      ["/examples/components/card.html", "card.html", "html"],
    ],
    noise: [
      "/dist/components/button.css",
      "/src/themes/default/elements/button.overrides",
      "/src/themes/material/elements/button.variables",
      "/src/_site/elements/button.variables",
      "/src/theme.config.example",
      "/examples/assets/show-examples.js",
    ],
  },
  twelements: {
    repo: "mdbootstrap/TW-Elements",
    ref: "master",
    license: "MIT (TW Elements Free)",
    stack: ["tailwind", "javascript"],
    hits: [
      ["/src/js/free/components/modal.js", "components", "js"],
      ["/src/js/free/navigation/tab.js", "navigation", "js"],
      ["/src/js/free/forms/input.js", "forms", "js"],
      ["/src/js/free/methods/ripple.js", "methods", "js"],
      ["/plugin.cjs", "misc", "cjs"],
    ],
    noise: [
      "/js/tw-elements.umd.min.js",
      "/src/js/base-component.js",
      "/src/js/util/focusTrap.js",
      "/src/js/tw-elements.free.es.js",
      "/types/tw-elements.d.ts",
      "/index.html",
    ],
  },
  ionic: {
    repo: "ionic-team/ionic-framework",
    ref: "main",
    license: "MIT",
    stack: ["html", "css", "javascript"],
    heavy: true,
    hits: [
      ["/core/src/components/button/test/basic/index.html", "button", "html"],
      ["/core/src/components/button/button.tsx", "button", "tsx"],
      ["/core/src/components/button/button.ios.scss", "button", "scss"],
      ["/core/src/components/button/button.md.vars.scss", "button", "scss"],
      ["/core/src/components/alert/alert-interface.ts", "alert", "ts"],
    ],
    noise: [
      "/core/src/components/button/test/basic/button.e2e.ts",
      "/core/src/components/button/test/basic/button.e2e.ts-snapshots/button-diff-ios-ltr-Mobile-Chrome-linux.png",
      "/core/src/components/alert/test/alert-id.spec.tsx",
      "/core/src/components/alert/animations/ios.enter.ts",
      "/core/src/components/modal/utils.ts",
      "/core/src/utils/animation/test/basic/index.html",
    ],
  },
  shaders: {
    repo: "shader-effects-inc/shaders",
    ref: "main",
    license: "MIT",
    stack: ["3d", "animation", "react", "javascript", "guidance"],
    hits: [
      ["/packages/core/src/shaders/Aurora/index.ts", "Aurora", "ts"],
      ["/packages/core/src/shaders/LinearGradient/index.ts", "LinearGradient", "ts"],
      ["/packages/core/src/shaders/Glass/index.ts", "Glass", "ts"],
      ["/skills/shaders/SKILL.md", "misc", "md"],
      ["/skills/shaders/components.md", "misc", "md"],
    ],
    noise: [
      "/packages/core/src/shaders/Aurora/cover.jpg",
      "/packages/core/src/shaders/FilmStock/stockLuts.ts",
      "/packages/core/src/shaders/HTMLInCanvas/docs.md",
      "/packages/core/src/__tests__/gpu/shader-Aurora.test.ts",
      "/packages/core/docs/std/noise.md",
      "/packages/react/src/engine/Shader.tsx",
    ],
  },
  babylonjs: {
    repo: "BabylonJS/Babylon.js",
    ref: "master",
    license: "Apache-2.0",
    stack: ["3d", "javascript"],
    heavy: true,
    hits: [
      ["/packages/dev/core/src/Shaders/chromaticAberration.fragment.fx", "Shaders", "fx"],
      ["/packages/dev/core/src/Shaders/ShadersInclude/pbrBRDFFunctions.fx", "Shaders", "fx"],
      ["/packages/dev/core/src/ShadersWGSL/chromaticAberration.fragment.fx", "ShadersWGSL", "fx"],
      ["/packages/dev/materials/src/water/waterMaterial.ts", "water", "ts"],
      [
        "/packages/dev/proceduralTextures/src/starfield/starfieldProceduralTexture.fragment.fx",
        "starfield",
        "fx",
      ],
    ],
    noise: [
      "/packages/dev/core/src/PostProcesses/chromaticAberrationPostProcess.ts",
      "/packages/dev/materials/src/water/index.ts",
      "/packages/dev/materials/src/legacy/legacy-water.ts",
      "/packages/dev/materials/test/addwater.js",
      "/packages/dev/materials/test/unit/sky/skyMaterial.test.ts",
      "/packages/dev/proceduralTextures/index.html",
    ],
  },
  playcanvas: {
    repo: "playcanvas/engine",
    ref: "main",
    license: "MIT",
    stack: ["3d", "javascript"],
    hits: [
      ["/examples/src/examples/shaders/shader-burn.example.mjs", "shaders", "mjs"],
      ["/examples/src/examples/shaders/shader-burn.shader.glsl.frag", "shaders", "glsl"],
      ["/examples/src/examples/camera-frame/depth-of-field.example.mjs", "camera-frame", "mjs"],
      ["/examples/src/examples/gaussian-splatting/reveal.example.mjs", "gaussian-splatting", "mjs"],
      ["/examples/src/examples/compute/particles.shader-simulation.wgsl", "compute", "wgsl"],
    ],
    noise: [
      "/examples/src/examples/shaders/shader-burn.shader.wgsl.frag",
      "/examples/src/examples/camera-frame/depth-of-field.controls.jsx",
      "/examples/src/examples/test/dual-source-blending.example.mjs",
      "/examples/src/examples/gaussian-splatting-legacy/picking.example.mjs",
      "/examples/src/examples/xr/xr-ui.ui.html",
      "/scripts/esm/water.mjs",
    ],
  },
  cobe: {
    repo: "shuding/cobe",
    ref: "main",
    license: "MIT",
    stack: ["3d", "javascript", "react"],
    hits: [
      ["/src/index.js", "src", "js"],
      ["/src/globe.frag.glslx", "src", "glslx"],
      ["/website/app/components/Recipes.tsx", "website", "tsx"],
      ["/website/app/showcases-data.ts", "website", "ts"],
      ["/website/app/ip/IpGlobe.tsx", "website", "tsx"],
    ],
    noise: [
      "/src/index.d.ts",
      "/src/texture.png",
      "/website/app/layout.tsx",
      "/website/app/components/index.ts",
      "/website/app/globals.css",
      "/scripts/build.js",
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
  radixthemes: {
    pkg: "@radix-ui/themes",
    license: "MIT",
    stack: ["react", "css", "design-tokens", "accessibility"],
    hits: [
      ["/src/components/button.tsx", "components", "tsx"],
      ["/src/components/_internal/base-button.css", "components", "css"],
      ["/src/styles/tokens/colors/indigo.css", "styles", "css"],
      ["/src/props/color.prop.ts", "props", "ts"],
    ],
    noise: [
      "/src/helpers/extract-props.ts",
      "/src/index.ts",
      "/dist/esm/components/button.js",
      "/tokens/colors/indigo.css",
      "/components.css",
    ],
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
      // A multi-MB tree listing makes a source heavy; the rest are one memoized listing per hour,
      // cheap enough for search_all.
      assert.equal(a.heavy === true, c.heavy === true, "heavy");
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
