// GitHub-hosted UI collections and agent-guidance repos. Every adapter in this array is
// registered by sources/index.ts, so adding one here is all it takes to expose it.
import type { SourceAdapter } from "../lib/types.js";
import { codrops } from "./codrops.js";
import { makeGithubSrcAdapter } from "./packages.js";

/** idFormat for file-path ids, with a real example path from the source. */
const pathId = (example: string): string => `file path from search_resources, e.g. "${example}"`;

// ponytail: search sees only paths (category, author, random slug), not the "Tags:" comment
// inside each file, so keyword search mostly hits categories. Upgrade path: an index of those
// tags, built from the repo.
export const uiverse = makeGithubSrcAdapter({
  id: "uiverse",
  label: "Uiverse",
  description:
    "Uiverse — 3,800+ community-made UI elements (buttons, cards, loaders, toggle switches, inputs, forms, checkboxes, radio buttons, patterns, tooltips, notifications). Each is one HTML file: markup plus a <style> block, or Tailwind classes. Files are named <author>_<random-slug>, so browse by category (list_categories) rather than by effect name. Real source from the uiverse-io/galaxy repo.",
  homepage: "https://uiverse.io/",
  repo: "uiverse-io/galaxy",
  fallbackRef: "main",
  license: "MIT",
  include: /^\/[^/]+\/[^/]+\.html$/,
  categoryIndex: 0, // /<Category>/<author>_<slug>.html
  stack: ["html", "css", "tailwind"],
  idFormat: pathId("/Buttons/0x-Sarthak_hungry-penguin-30.html"),
});

export const hyperui = makeGithubSrcAdapter({
  id: "hyperui",
  label: "HyperUI",
  description:
    "HyperUI — free Tailwind CSS v4 components for application UI, marketing pages and a neobrutalism set (accordions, tables, modals, charts, banners, pricing, footers, ...), each a standalone HTML example with light and -dark variants. Real source from the markmead/hyperui repo.",
  homepage: "https://hyperui.dev/",
  repo: "markmead/hyperui",
  fallbackRef: "main",
  license: "MIT",
  include: /^\/public\/examples\/[^/]+\/[^/]+\/\d+(?:-dark)?\.html$/,
  categoryIndex: 3, // /public/examples/<area>/<component>/<n>(-dark).html
  stack: ["html", "tailwind"],
  idFormat: pathId("/public/examples/application/accordions/1.html"),
});

export const merakiui = makeGithubSrcAdapter({
  id: "merakiui",
  label: "Meraki UI",
  description:
    "Meraki UI — Tailwind CSS components with RTL support and dark mode (heroes, navbars, cards, forms, sign-in, pricing, tables, footers, ...), each a standalone HTML page. Real source from the merakiuilabs/merakiui repo.",
  homepage: "https://merakiui.com/",
  repo: "merakiuilabs/merakiui",
  fallbackRef: "main",
  license: "MIT",
  include: /^\/components\/[^/]+\/[^/]+\.html$/,
  categoryIndex: 1, // /components/<category>/<Name>.html
  stack: ["html", "tailwind"],
  idFormat: pathId("/components/alerts/ErrorPop.html"),
});

export const pines = makeGithubSrcAdapter({
  id: "pines",
  label: "Pines",
  description:
    "Pines — Alpine.js + Tailwind CSS UI elements (modals, dropdowns, command palette, toasts, date picker, tabs, sliders, ...): each element's HTML snippet, plus its example variants under <name>-examples. Real source from the thedevdojo/pines repo.",
  homepage: "https://devdojo.com/pines",
  repo: "thedevdojo/pines",
  fallbackRef: "main",
  license: "MIT",
  include: /^\/elements\/(?:[^/]+-examples\/)?[^/]+\.html$/,
  categoryIndex: 1, // /elements/<name>.html or /elements/<name>-examples/example-NN.html
  stack: ["html", "tailwind", "javascript"],
  idFormat: pathId("/elements/accordion.html"),
});

export const apg = makeGithubSrcAdapter({
  id: "apg",
  label: "WAI-ARIA Authoring Practices (APG)",
  description:
    "W3C WAI-ARIA Authoring Practices Guide — accessible widget patterns (accordion, combobox, dialog, menu, tabs, treeview, ...) with each pattern's keyboard and ARIA rules, working example pages with their JS and CSS, and the practice guides (keyboard interface, accessible names, landmarks). Real source from the w3c/aria-practices repo.",
  homepage: "https://www.w3.org/WAI/ARIA/apg/",
  repo: "w3c/aria-practices",
  fallbackRef: "main",
  license: "W3C Software and Document License",
  // Leaves out the vendored Bootstrap/jQuery files of the landmarks examples (not W3C's).
  include:
    /^(?!.*(?:\.min\.|\/bootstrap))\/content\/(?:patterns|practices)\/[^/]+\/(?:[^/]+\.html|examples\/(?:[^/]+\.html|js\/[^/]+\.js|css\/[^/]+\.css))$/,
  categoryIndex: 2, // /content/<patterns|practices>/<name>/...
  stack: ["accessibility", "html", "javascript"],
  idFormat: pathId("/content/patterns/tabs/examples/tabs-automatic.html"),
});

export const designmd = makeGithubSrcAdapter({
  id: "designmd",
  label: "awesome-design-md",
  description:
    "DESIGN.md files for 70+ brand websites (Stripe, Linear, Vercel, Apple, Notion, ...): color roles, typography, components, layout, elevation, do's and don'ts and agent prompts. Unofficial, brand-inspired interpretations written by VoltAgent contributors, not the brands' own design systems; the brands own their names and marks. Read from a pinned snapshot of the VoltAgent/awesome-design-md repo.",
  homepage: "https://github.com/VoltAgent/awesome-design-md",
  repo: "VoltAgent/awesome-design-md",
  // Pinned: the files are moving to getdesign.md, so HEAD may lose them. The jsDelivr fallback
  // reads this same commit.
  ref: "13be5c05c63be24b57581162364167028020f043",
  license: "MIT (unofficial, brand-inspired interpretations; the brands own their names and marks)",
  include: /^\/design-md\/[^/]+\/DESIGN\.md$/,
  categoryIndex: 1, // /design-md/<brand>/DESIGN.md
  stack: ["design-tokens", "guidance"],
  idFormat: pathId("/design-md/stripe/DESIGN.md"),
});

export const anthropicskills = makeGithubSrcAdapter({
  id: "anthropicskills",
  label: "Anthropic Agent Skills (design)",
  description:
    "Anthropic's Apache-2.0 Agent Skills for visual work: frontend-design (distinctive, non-generic UI), theme-factory (10 ready color and font themes), web-artifacts-builder (multi-component React + Tailwind + shadcn/ui artifacts bundled into one HTML file) and canvas-design (posters and visual art). The SKILL.md guidance and theme files from the anthropics/skills repo; the source-available document skills are not included.",
  homepage: "https://github.com/anthropics/skills",
  repo: "anthropics/skills",
  fallbackRef: "main",
  license: "Apache-2.0",
  include:
    /^\/skills\/(?:frontend-design|theme-factory|web-artifacts-builder|canvas-design)\/.*\.md$/,
  categoryIndex: 1, // /skills/<skill>/...
  stack: ["guidance"],
  idFormat: pathId("/skills/frontend-design/SKILL.md"),
});

export const webguidelines = makeGithubSrcAdapter({
  id: "webguidelines",
  label: "Vercel Web Interface Guidelines",
  description:
    "Vercel's Web Interface Guidelines — rules for accessible, fast, polished interfaces: keyboard and focus, forms, animation, layout, typography, content, performance, dark mode and copy. The full guide (README.md), the concise MUST/SHOULD/NEVER rules for agents (AGENTS.md) and a review checklist (command.md) from the vercel-labs/web-interface-guidelines repo.",
  homepage: "https://vercel.com/design/guidelines",
  repo: "vercel-labs/web-interface-guidelines",
  fallbackRef: "main",
  license: "MIT",
  include: /^\/[^/]+\.md$/,
  categoryIndex: 0, // flat repo: category = the file itself
  stack: ["guidance", "accessibility"],
  idFormat: pathId("/AGENTS.md"),
});

export const collectionSources: SourceAdapter[] = [
  uiverse,
  hyperui,
  merakiui,
  pines,
  apg,
  designmd,
  anthropicskills,
  webguidelines,
  codrops,
];
