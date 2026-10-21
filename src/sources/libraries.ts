// Library and design-token source trees (GitHub / jsDelivr). Every adapter in this array is
// registered by sources/index.ts, so adding one here is all it takes to expose it.
// Each `include` was checked against the repo's real tree; GitHub `categoryIndex` counts path
// segments after the leading "/", jsDelivr `categoryIndex` counts the empty first one too.
import type { SourceAdapter } from "../lib/types.js";
import { makeGithubSrcAdapter, makeJsdelivrSrcAdapter } from "./packages.js";

/** idFormat for file-path ids (packages.ts wording), with a real example path. */
const pathId = (example: string): string => `file path from search_resources, e.g. "${example}"`;

export const librarySources: SourceAdapter[] = [
  makeGithubSrcAdapter({
    id: "lenis",
    label: "Lenis",
    description:
      "Lenis — smooth-scroll library: the core engine (virtual scroll, easing, dimensions), React and Vue bindings, the snap add-on and the required lenis.css. Real source from the darkroomengineering/lenis repo.",
    homepage: "https://github.com/darkroomengineering/lenis",
    repo: "darkroomengineering/lenis",
    fallbackRef: "main",
    license: "MIT",
    include: /^\/packages\/(core|react|vue|snap)\/(src\/.*\.tsx?|lenis\.css)$/,
    categoryIndex: 1, // /packages/<core|react|vue|snap>/...
    stack: ["javascript", "animation", "react"],
    idFormat: pathId("/packages/core/src/lenis.ts"),
  }),
  makeGithubSrcAdapter({
    id: "animejs",
    label: "Anime.js",
    description:
      "Anime.js v4 — JavaScript animation engine (timelines, stagger, springs and easings, SVG draw/morph, text split, draggable, scroll observer, WAAPI) plus its runnable HTML/JS examples. Real source from the juliangarnier/anime repo.",
    homepage: "https://github.com/juliangarnier/anime",
    repo: "juliangarnier/anime",
    fallbackRef: "master",
    license: "MIT",
    include: /^\/(src\/.*\.js|examples\/.+\/index\.(html|js))$/,
    categoryIndex: 1, // /src/<module>/... or /examples/<example>/index.js
    stack: ["javascript", "animation"],
    idFormat: pathId("/src/animation/animation.js"),
  }),
  makeGithubSrcAdapter({
    id: "ogl",
    label: "OGL",
    description:
      "OGL — minimal WebGL library: renderer, program, geometry, math (Vec/Mat/Quat) and extras (GLTF loader, post-processing, GPGPU, text, orbit, raycast, shadows) plus ~50 single-file HTML examples. Real source from the oframe/ogl repo.",
    homepage: "https://github.com/oframe/ogl",
    repo: "oframe/ogl",
    fallbackRef: "master",
    license: "Unlicense (declared in package.json and the README; the repo has no LICENSE file)",
    include: /^\/(src\/.*\.js|examples\/[^/]+\.html)$/,
    categoryIndex: 1, // /src/<core|extras|math>/... ; flat examples: category = the file
    stack: ["3d", "javascript"],
    idFormat: pathId("/src/core/Renderer.js"),
  }),
  makeGithubSrcAdapter({
    id: "webgpusamples",
    label: "WebGPU Samples",
    description:
      "WebGPU Samples — the official WebGPU examples (compute boids, deferred rendering, shadow mapping, particles, Cornell box, ...): each sample's TypeScript, WGSL shaders and HTML page. Real source from the webgpu/webgpu-samples repo.",
    homepage: "https://github.com/webgpu/webgpu-samples",
    repo: "webgpu/webgpu-samples",
    fallbackRef: "main",
    license: "BSD-3-Clause",
    include: /^\/sample\/[^/]+\/[^/]+\.(ts|wgsl|html)$/,
    categoryIndex: 1, // /sample/<sample>/<file>
    stack: ["3d", "javascript"],
    idFormat: pathId("/sample/computeBoids/main.ts"),
  }),
  // ponytail: jsDelivr refuses pmndrs/uikit (HTTP 403, over its 150 MB repo limit), so this
  // source has no fallback while the GitHub API is rate limited; set GITHUB_TOKEN. Upgrade path:
  // fall back to @pmndrs/uikit on npm via jsDelivr, which ships only the compiled dist files.
  makeGithubSrcAdapter({
    id: "uikit",
    label: "uikit (pmndrs)",
    description:
      "uikit — flexbox UI for react-three-fiber / three.js (Yoga layout, text, input, scrolling, components) plus its default and horizon component kits. Real source from the pmndrs/uikit repo.",
    homepage: "https://github.com/pmndrs/uikit",
    repo: "pmndrs/uikit",
    fallbackRef: "main",
    license: "MIT",
    include: /^\/packages\/(uikit|react|kits\/[^/]+\/core)\/src\/.*\.tsx?$/,
    categoryIndex: 1, // /packages/<uikit|react|kits>/...
    stack: ["react", "3d"],
    idFormat: pathId("/packages/uikit/src/components/container.ts"),
  }),
  makeGithubSrcAdapter({
    id: "rapier",
    label: "react-three-rapier",
    description:
      "react-three-rapier — Rapier physics for React Three Fiber: Physics, RigidBody, colliders, joints, hooks, the attractor add-on and 30+ demo examples. Real source from the pmndrs/react-three-rapier repo.",
    homepage: "https://github.com/pmndrs/react-three-rapier",
    repo: "pmndrs/react-three-rapier",
    fallbackRef: "main",
    license: "MIT",
    include: /^\/(packages\/react-three-rapier(-addons)?\/src|demo\/src\/examples)\/.*\.tsx?$/,
    categoryIndex: 3, // /packages/<pkg>/src/<components|hooks|...>, /demo/src/examples/<example>
    stack: ["react", "3d"],
    idFormat: pathId("/packages/react-three-rapier/src/components/RigidBody.tsx"),
  }),
  makeGithubSrcAdapter({
    id: "leva",
    label: "leva",
    description:
      "leva — React-first GUI panel for tweaking values (useControls, folders, monitors, buttons) and its bezier, dates, plot and spring plugins. Real source from the pmndrs/leva repo.",
    homepage: "https://github.com/pmndrs/leva",
    repo: "pmndrs/leva",
    fallbackRef: "main",
    license: "MIT",
    include: /^\/packages\/(leva|plugin-[^/]+)\/src\/.*\.tsx?$/,
    categoryIndex: 1, // /packages/<leva|plugin-*>/src/...
    stack: ["react"],
    idFormat: pathId("/packages/leva/src/useControls.ts"),
  }),
  makeGithubSrcAdapter({
    id: "pmndrsmath",
    label: "math (pmndrs)",
    description:
      "math (pmndrs) — the playful web's math engine: vectors, matrices, quaternions, color, noise, seeded random, shapes and raycasts, FABRIK IK, springs and easing. Real source from the pmndrs/math repo (formerly pmndrs/maath).",
    homepage: "https://github.com/pmndrs/math",
    repo: "pmndrs/math",
    fallbackRef: "main",
    license: "MIT",
    include: /^\/src\/.*\.ts$/,
    categoryIndex: 1, // /src/<core|noise|shapes|...>/<file>
    stack: ["3d", "javascript"],
    idFormat: pathId("/src/core/vec3.ts"),
  }),
  makeGithubSrcAdapter({
    id: "daisyui",
    label: "daisyUI",
    description:
      "daisyUI — Tailwind CSS component library: each component's CSS (btn, card, modal, ...) and its docs page with the class-name reference and HTML examples (a `$$` before a class marks the optional class prefix; drop it). Real source from the saadeghi/daisyui repo.",
    homepage: "https://github.com/saadeghi/daisyui",
    repo: "saadeghi/daisyui",
    fallbackRef: "master",
    license: "MIT",
    include:
      /^\/packages\/(daisyui\/src\/components\/[^/]+\.css|docs\/src\/routes\/\(routes\)\/components\/[^/]+\/\+page\.md)$/,
    categoryIndex: 1, // /packages/daisyui/... (component CSS) or /packages/docs/... (docs pages)
    stack: ["css", "tailwind", "html"],
    idFormat:
      'file path from search_resources, e.g. "/packages/daisyui/src/components/button.css" (CSS) or "/packages/docs/src/routes/(routes)/components/button/+page.md" (docs)',
  }),
  makeGithubSrcAdapter({
    id: "flowbite",
    label: "Flowbite",
    description:
      "Flowbite — Tailwind CSS components, forms, typography and plugins (charts, datatables, datepicker, WYSIWYG) as Markdown docs pages with copy-paste HTML examples and JavaScript usage. Real source from the themesberg/flowbite repo.",
    homepage: "https://github.com/themesberg/flowbite",
    repo: "themesberg/flowbite",
    fallbackRef: "main",
    // content/getting-started/license.md: docs are CC BY 3.0, the released code is MIT.
    license: "CC-BY-3.0 (Flowbite documentation; the Flowbite library code is MIT)",
    include: /^\/content\/(components|forms|typography|plugins)\/[^/]+\.md$/,
    categoryIndex: 1, // /content/<components|forms|typography|plugins>/<file>
    stack: ["html", "tailwind", "javascript"],
    idFormat: pathId("/content/components/modal.md"),
  }),
  // ponytail: jsDelivr's file listing of mui/base-ui lags far behind the repo (it still shows
  // the docs' older folder layout), so while the GitHub API is rate limited this source lists
  // nothing; set GITHUB_TOKEN. Upgrade path: pin `ref` to a commit SHA, which jsDelivr lists
  // exactly.
  makeGithubSrcAdapter({
    id: "baseui",
    label: "Base UI",
    description:
      "Base UI — MUI's unstyled, accessible React components (accordion, combobox, dialog, menu, select, slider, toast, ...): every docs demo in its Tailwind variant. Real source from the mui/base-ui repo.",
    homepage: "https://base-ui.com/",
    repo: "mui/base-ui",
    fallbackRef: "master",
    license: "MIT",
    // Only the Tailwind variant: it is self-contained, while the CSS Modules one imports
    // stylesheets shared across demos.
    include:
      /^\/docs\/src\/app\/\(docs\)\/react\/components\/[^/]+\/demos\/[^/]+\/tailwind\/index\.tsx$/,
    categoryIndex: 6, // /docs/src/app/(docs)/react/components/<component>/demos/<demo>/tailwind/
    stack: ["react", "tailwind", "accessibility"],
    idFormat: pathId(
      "/docs/src/app/(docs)/react/components/accordion/demos/hero/tailwind/index.tsx",
    ),
  }),
  makeGithubSrcAdapter({
    id: "visx",
    label: "visx",
    description:
      "visx (Airbnb) — React + D3 visualization primitives: the ~50 runnable demo charts (bars, lines, areas, pies, heatmaps, networks, geo maps, brush, XYChart, ...) with their data helpers. Real source from the airbnb/visx repo.",
    homepage: "https://visx.airbnb.tech/",
    repo: "airbnb/visx",
    fallbackRef: "master",
    license: "MIT",
    // Each demo sandbox's Example and helpers; not its index.tsx render boilerplate or .d.ts.
    include: /^\/packages\/visx-demo\/src\/sandboxes\/visx-[^/]+\/(?!index\.)[^/]+(?<!\.d)\.tsx?$/,
    categoryIndex: 4, // /packages/visx-demo/src/sandboxes/<sandbox>/<file>
    stack: ["react", "javascript"],
    idFormat: pathId("/packages/visx-demo/src/sandboxes/visx-bars/Example.tsx"),
  }),
  makeGithubSrcAdapter({
    id: "reaviz",
    label: "REAVIZ",
    description:
      "REAVIZ — React data-visualization components (bar, line, area, pie, radial, sankey, heatmap, venn, funnel, gauges, ...) with their CSS modules, and Storybook stories as usage examples. Real source from the reaviz/reaviz repo.",
    homepage: "https://reaviz.dev/",
    repo: "reaviz/reaviz",
    fallbackRef: "master",
    license: "Apache-2.0",
    // Components, CSS modules and stories; not tests, typings or snapshots.
    include: /^\/src\/(?:[^/]+\/)*[^/.]+(?:\.story|\.module)?\.(?:tsx?|css)$/,
    categoryIndex: 1, // /src/<chart or common>/...
    stack: ["react"],
    idFormat: pathId("/src/BarChart/BarChart.tsx"),
  }),
  // ponytail: jsDelivr refuses tamagui/tamagui (HTTP 403, over its 50 MB limit), so this source
  // has no fallback while the GitHub API is rate limited; set GITHUB_TOKEN. Upgrade path: fall
  // back to the @tamagui/demos npm package, which ships only the demos.
  makeGithubSrcAdapter({
    id: "tamagui",
    label: "Tamagui",
    description:
      "Tamagui — universal React + React Native UI kit and style system: ~60 runnable component demos, Bento's copy-paste screens and components (sign-in layouts, paywall, date pickers, tables, chat list, OTP input), the styled component skins, the core, guides and intro docs (styled(), variants, tokens, themes, animations) and the official agent skills. Real source from the tamagui/tamagui repo.",
    homepage: "https://tamagui.dev/",
    repo: "tamagui/tamagui",
    fallbackRef: "main",
    license: "MIT",
    // Demos; Bento minus its generated icons and index barrels; the styled skins; the docs that
    // are not versioned (component docs are named by version, e.g. button/3.0.0.mdx); the skills.
    include:
      /^\/(code\/(demos\/src\/(?!index\.)[^/]+\.tsx|bento\/src\/(?!icons\/)[^/]+\/(?:[^/]+\/)*(?!index\.)[^/]+\.tsx?|ui\/tamagui\/src\/components\/[^/.]+\.tsx|tamagui\.dev\/data\/docs\/(core|guides|intro)\/[^/]+\.mdx)|skills\/[^/]+\/.+\.md)$/,
    categoryIndex: 1, // /code/<demos|bento|ui|tamagui.dev>/... ; /skills/<skill>/...
    stack: ["react", "animation", "guidance"],
    idFormat: pathId("/code/demos/src/ButtonDemo.tsx"),
    // The tree listing is about 2.3 MB, so search_all skips it unless named.
    heavy: true,
  }),
  // ponytail: jsDelivr reads the default branch name "v2" as a version range and answers 404, so
  // the fallback reads the latest release tag and lags the branch until fallbackRef is bumped.
  // Upgrade path: pin `ref` to a commit SHA.
  makeGithubSrcAdapter({
    id: "rekaui",
    label: "Reka UI",
    description:
      "Reka UI (formerly Radix Vue) — unstyled, accessible Vue 3 primitives (accordion, combobox, date pickers, dialog, menu, select, slider, toast, tree, ...): every docs demo in its Tailwind variant, composed examples (data table, command menu, ...), each component's docs page (anatomy, data attributes, keyboard interactions) and the component source. Real source from the unovue/reka-ui repo.",
    homepage: "https://reka-ui.com/",
    repo: "unovue/reka-ui",
    fallbackRef: "v2.11.0",
    license: "MIT",
    // Tailwind demo variants (the CSS ones import a separate styles.css), composed examples and
    // their data helpers, the component/guide/utility docs pages (not the generated props tables)
    // and the core component source (no tests, stories or index.ts barrels).
    include:
      /^\/(docs\/components\/(demo\/[^/]+\/tailwind|examples\/[^/]+)\/[^/.]+\.(vue|ts)|docs\/content\/docs\/(components|guides|utilities)\/[^/]+\.md|packages\/core\/src\/(?!test\/)[^/]+\/(?!index\.ts$)[^/.]+\.(vue|ts))$/,
    categoryIndex: 3, // /docs/components/<demo|examples>/<name>/, /packages/core/src/<component>/
    stack: ["javascript", "tailwind", "accessibility"],
    idFormat: pathId("/docs/components/demo/Accordion/tailwind/index.vue"),
  }),
  makeGithubSrcAdapter({
    id: "vuesticadmin",
    label: "Vuestic Admin",
    description:
      "Vuestic Admin — Vue 3 admin dashboard template on Vuestic UI and Tailwind CSS: the app shell (layouts, navbar, sidebar), dashboard cards with charts, and the auth, billing, payments, pricing, projects, users, settings and FAQ pages with their widgets and composables. Real source from the epicmaxco/vuestic-admin repo.",
    homepage: "https://admin.vuestic.dev/",
    repo: "epicmaxco/vuestic-admin",
    fallbackRef: "master",
    license: "MIT",
    // Pages, layouts and app-shell components with their composables and types; not the icon
    // SFCs, Storybook stories, mock data or locale JSON.
    include:
      /^\/src\/(?!components\/icons\/)(components|layouts|pages)\/(?:[^/]+\/)*[^/.]+\.(vue|ts)$/,
    categoryIndex: 2, // /src/pages/<page>/..., /src/components/<group>/... ; flat files: the file
    stack: ["javascript", "tailwind"],
    idFormat: pathId("/src/pages/admin/dashboard/Dashboard.vue"),
  }),
  makeGithubSrcAdapter({
    id: "semanticui",
    label: "Semantic UI",
    description:
      "Semantic UI — natural-language CSS framework (`ui primary button`): each component's LESS definition and jQuery module (button, menu, form, grid, card, dropdown, modal, popup, ...), the default theme's .variables and full-page HTML examples (homepage, login, grid, fixed menu, ...). Real source from the Semantic-Org/Semantic-UI repo.",
    homepage: "https://semantic-ui.com/",
    repo: "Semantic-Org/Semantic-UI",
    fallbackRef: "master",
    license: "MIT",
    // Definitions (LESS + JS), the default theme's .variables (its .overrides are mostly empty)
    // and the HTML examples; not dist/ build output, the other themes or the _site templates.
    include:
      /^\/(src\/(definitions\/[^/]+\/[^/]+\.(less|js)|themes\/default\/[^/]+\/[^/]+\.variables)|examples\/(components\/)?[^/]+\.html)$/,
    categoryIndex: 2, // /src/definitions/<elements|modules|...>/, theme: "default", pages: "misc"
    stack: ["css", "html", "javascript"],
    idFormat: pathId("/src/definitions/elements/button.less"),
  }),
  makeGithubSrcAdapter({
    id: "twelements",
    label: "TW Elements",
    description:
      "TW Elements — interactive Tailwind CSS components in vanilla JavaScript, driven by data-twe-* attributes (modal, dropdown, carousel, collapse, offcanvas, tooltip, popover, tabs, scrollspy, ripple, floating-label input), plus its Tailwind plugin; their HTML markup is in the tw-elements.com docs, not the repo. Real source from the mdbootstrap/TW-Elements repo.",
    homepage: "https://tw-elements.com/",
    repo: "mdbootstrap/TW-Elements",
    fallbackRef: "master",
    license: "MIT (TW Elements Free)",
    // The free components and the Tailwind plugin; the rest of the repo is minified bundles.
    include: /^\/(src\/js\/free\/[^/]+\/[^/]+\.js|plugin\.cjs)$/,
    categoryIndex: 3, // /src/js/free/<components|forms|methods|navigation>/<file>
    stack: ["tailwind", "javascript"],
    idFormat: pathId("/src/js/free/components/modal.js"),
  }),
  // ponytail: jsDelivr refuses ionic-team/ionic-framework (HTTP 403, over its 50 MB limit;
  // screenshot PNGs), so this source has no fallback while the GitHub API is rate limited; set
  // GITHUB_TOKEN. Upgrade path: fall back to @ionic/core on npm, which ships only compiled files.
  makeGithubSrcAdapter({
    id: "ionic",
    label: "Ionic Framework",
    description:
      "Ionic Framework — cross-platform UI web components (ion-button, ion-list, ion-modal, ion-datetime, ion-tabs, ...) with iOS and Material Design modes: each component's Stencil TSX source, SCSS (base, ios, md and their variables) and option interfaces, plus its demo pages (test/<case>/index.html) as markup examples (they load css/ionic.bundle.css and dist/ionic/ionic.esm.js, which the @ionic/core npm package serves). Real source from the ionic-team/ionic-framework repo.",
    homepage: "https://ionicframework.com/docs/components",
    repo: "ionic-team/ionic-framework",
    fallbackRef: "main",
    license: "MIT",
    // Per component: its .tsx, every .scss and *-interface(s).ts, plus each test/<case>/index.html
    // demo page; not the e2e/spec tests, screenshots, animations, gestures or utils.
    include:
      /^\/core\/src\/components\/[^/]+\/(test\/[^/]+\/index\.html|[^/]+\.(tsx|scss)|[^/]+-interfaces?\.ts)$/,
    categoryIndex: 3, // /core/src/components/<component>/...
    stack: ["html", "css", "javascript"],
    idFormat:
      'file path from search_resources, e.g. "/core/src/components/button/test/basic/index.html" (a demo page) or "/core/src/components/button/button.tsx" (source)',
    // The tree listing is about 3.7 MB, so search_all skips it unless named.
    heavy: true,
  }),
  makeGithubSrcAdapter({
    id: "shaders",
    label: "Shaders",
    description:
      "Shaders (shaders.com) — WebGPU effects as components for React, Vue, Svelte, Solid and vanilla JS: the definition of each of its 200 components (gradients, noise, glass, metal, light, distortions, blurs, transitions, cursor effects) with every prop's default, range and description and its GPU code, plus the official agent skill and component catalog. Real source from the shader-effects-inc/shaders repo.",
    homepage: "https://shaders.com/",
    repo: "shader-effects-inc/shaders",
    fallbackRef: "main",
    // The engine, components and bindings are MIT; the shaders.com editor, presets and Pro
    // sections have their own terms and are not in this repo.
    license: "MIT",
    // Each component's definition and the two skill docs; not the cover images, tests, framework
    // wrappers or the FilmStock LUT table.
    include: /^\/(packages\/core\/src\/shaders\/[^/]+\/index\.ts|skills\/shaders\/[^/]+\.md)$/,
    categoryIndex: 4, // /packages/core/src/shaders/<Component>/index.ts ; skill docs: "misc"
    stack: ["3d", "animation", "react", "javascript", "guidance"],
    idFormat: pathId("/packages/core/src/shaders/Aurora/index.ts"),
  }),
  // ponytail: jsDelivr refuses BabylonJS/Babylon.js (HTTP 403, over its 50 MB limit), so this
  // source has no fallback while the GitHub API is rate limited; set GITHUB_TOKEN. Upgrade path:
  // fall back to @babylonjs/core and @babylonjs/materials on npm, which inline the same shaders as
  // generated .js modules.
  makeGithubSrcAdapter({
    id: "babylonjs",
    label: "Babylon.js",
    description:
      "Babylon.js — the engine's shader library as .fx files, GLSL under Shaders/ and WGSL under ShadersWGSL/ (PBR and standard materials, bloom, depth of field, SSAO, screen-space reflections, motion blur, FXAA/TAA, tonemapping, particles, Gaussian splatting, plus the ShadersInclude chunks), and its materials, procedural-textures and post-processes add-ons (fire, lava, water, sky, fur, grid, cell, tri-planar; brick, cloud, marble, starfield, wood; ASCII art, digital rain) with the TypeScript classes that wire them up. Real source from the BabylonJS/Babylon.js repo.",
    homepage: "https://www.babylonjs.com/",
    repo: "BabylonJS/Babylon.js",
    fallbackRef: "master",
    license: "Apache-2.0",
    // Engine shaders (GLSL and WGSL, with their ShadersInclude chunks) and the three add-on
    // libraries' shaders, classes and readmes; not the engine's TypeScript, index.ts barrels,
    // legacy/ re-exports or test pages.
    include:
      /^\/packages\/dev\/(?:core\/src\/Shaders(?:WGSL)?\/(?:ShadersInclude\/)?[^/]+\.fx|(?:materials|proceduralTextures|postProcesses)\/src\/(?!legacy\/)[^/]+\/(?:wgsl\/)?(?!index\.)[^/]+\.(?:fx|ts|md))$/,
    categoryIndex: 4, // /packages/dev/<core|add-on>/src/<Shaders|ShadersWGSL|effect>/...
    stack: ["3d", "javascript"],
    idFormat: pathId("/packages/dev/core/src/Shaders/chromaticAberration.fragment.fx"),
    // The tree listing is about 2.9 MB, so search_all skips it unless named.
    heavy: true,
  }),
  // ponytail: jsDelivr refuses playcanvas/engine (HTTP 403, over its 50 MB limit; the examples'
  // assets alone are ~515 MB), so this source has no fallback while the GitHub API is rate
  // limited; set GITHUB_TOKEN. Upgrade path: conditional (ETag) tree requests; the playcanvas npm
  // package has no examples to fall back to.
  makeGithubSrcAdapter({
    id: "playcanvas",
    label: "PlayCanvas",
    description:
      "PlayCanvas — the engine's ~260 official examples, runnable ES-module scripts for WebGL2/WebGPU with their GLSL and WGSL shaders: Gaussian splatting, camera-frame post-processing (ambient occlusion, depth of field, TAA, HDR, lens flare, volumetric fog), materials (clear coat, anisotropy, refraction, parallax), custom shaders (burn, toon, hatch, wobble), lights and shadows, render targets, compute, physics, XR and in-world UI. Real source from the playcanvas/engine repo.",
    homepage: "https://playcanvas.github.io/",
    repo: "playcanvas/engine",
    fallbackRef: "main",
    license: "MIT",
    // Each example's script, helper modules and shaders; not its controls panel (.controls.jsx),
    // the hidden engine tests, the legacy splat demo, or the WGSL twins of .vert/.frag shaders
    // (*.wgsl.vert, *-wgsl.frag), which the extension would tag glsl.
    include:
      /^\/examples\/src\/examples\/(?!test\/|gaussian-splatting-legacy\/)[^/]+\/[^/]+(?:\.mjs|(?<!wgsl)\.(?:vert|frag)|\.wgsl)$/,
    categoryIndex: 3, // /examples/src/examples/<category>/<file>
    stack: ["3d", "javascript"],
    idFormat: pathId("/examples/src/examples/shaders/shader-burn.example.mjs"),
  }),
  // ponytail: jsDelivr's file listing of shuding/cobe lags the repo (it still shows the pre-2.0
  // layout), so while the GitHub API is rate limited this source lists only stale copies of two
  // files. Upgrade path: pin `ref` to a commit SHA, which jsDelivr lists exactly.
  makeGithubSrcAdapter({
    id: "cobe",
    label: "COBE",
    description:
      "COBE — ~5 KB zero-dependency WebGL globe (dotted world map, markers, arcs, rotation, DOM labels bound to markers): the library source with its GLSLX shaders, plus the website's React demos (recipes, markers and arcs, custom labels, IP globe, showcases). Real source from the shuding/cobe repo.",
    homepage: "https://cobe.vercel.app/",
    repo: "shuding/cobe",
    fallbackRef: "main",
    license: "MIT",
    // Library JS and GLSLX shaders, and the Next.js site's demo pages and components; not
    // index.d.ts, the texture PNG, layout.tsx or the components/index.ts barrel.
    include:
      /^\/(?:src\/(?:[^/.]+\.js|[^/]+\.glslx)|website\/app\/(?:[^/]+\/)?(?!layout\.|index\.)[^/.]+\.tsx?)$/,
    categoryIndex: 0, // /<src|website>/...: the library or its demo site
    stack: ["3d", "javascript", "react"],
    idFormat: pathId("/src/index.js"),
  }),
  makeJsdelivrSrcAdapter({
    id: "openprops",
    label: "Open Props",
    description:
      "Open Props — CSS custom-property design tokens (colors, sizes, shadows, easings, animations, gradients, fonts, ...) as JS modules and design-token JSON (W3C DTCG tokens and resolver, Style Dictionary, Figma). Real source from the open-props npm package.",
    homepage: "https://open-props.style/",
    pkg: "open-props",
    license: "MIT",
    include: /^\/(open-props\.[^/]+\.json|src\/props\.[^/]+\.js)$/,
    categoryIndex: 1, // /src/<file> ; token JSON at the root: category = the file
    stack: ["design-tokens", "css"],
    idFormat: pathId("/src/props.colors.js"),
  }),
  makeJsdelivrSrcAdapter({
    id: "radixcolors",
    label: "Radix Colors",
    description:
      "Radix Colors — the 31 accessible 12-step color scales (light, dark and alpha variants with Display-P3 values) plus black/white alpha, as CSS custom properties. Real source from the @radix-ui/colors npm package.",
    homepage: "https://www.radix-ui.com/colors",
    pkg: "@radix-ui/colors",
    license: "MIT",
    include: /^\/[^/]+\.css$/,
    categoryIndex: 1, // flat package: category = the file
    stack: ["design-tokens", "css"],
    idFormat: pathId("/blue-dark.css"),
  }),
  makeJsdelivrSrcAdapter({
    id: "radixthemes",
    label: "Radix Themes",
    description:
      "Radix Themes — WorkOS's pre-styled, accessible React components on Radix Primitives: each component's React source, CSS and prop definitions (sizes, variants, colors, radius), plus the theme's design-token CSS (color scales, spacing, radius, typography, shadows) and layout utilities. Real source from the @radix-ui/themes npm package.",
    homepage: "https://www.radix-ui.com/themes/docs/overview/getting-started",
    pkg: "@radix-ui/themes",
    license: "MIT",
    // The package ships its TypeScript and CSS source beside dist/; not helpers/ (internal prop
    // plumbing), the src/index.ts barrel or the bundled root stylesheets.
    include: /^\/src\/(components|styles|props)\/.*\.(tsx?|css)$/,
    categoryIndex: 2, // /src/<components|styles|props>/...
    stack: ["react", "css", "design-tokens", "accessibility"],
    idFormat: pathId("/src/components/button.tsx"),
  }),
];
