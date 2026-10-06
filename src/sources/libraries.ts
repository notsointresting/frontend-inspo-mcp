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
];
