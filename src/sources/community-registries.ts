// Community shadcn-schema registries. Every adapter in this array is registered by
// sources/index.ts, so adding one here is all it takes to expose it.
import type { SourceAdapter } from "../lib/types.js";
import { makeRegistryAdapter, type RegistryItem } from "./registry.js";
import { shadcndirectory } from "./shadcn-directory.js";
import { tweakcn } from "./tweakcn.js";

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

/**
 * The index items worth listing, from either index shape ({items: [...]} or a bare array): those
 * with at least one file that is not a test, each name once. That drops bundles, deprecated
 * aliases and font entries without files (coss ui, Cult UI), test-only entries (SmoothUI's
 * "cli") and repeated names (SVGL lists a few logos twice).
 */
export function codeItems(payload: unknown): RegistryItem[] {
  const list = Array.isArray(payload) ? payload : (payload as { items?: unknown } | null)?.items;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  return (list as RegistryItem[]).filter((it) => {
    const keep =
      typeof it?.name === "string" &&
      !seen.has(it.name) &&
      Array.isArray(it.files) &&
      it.files.some((f) => !TEST_FILE.test(f?.path ?? ""));
    if (keep) seen.add(it.name);
    return keep;
  });
}

/** All of these serve <base>/registry.json and one <base>/<name>.json per item. */
const itemJson = (base: string, name: string) => `${base}/${name}.json`;

export const communityRegistries: SourceAdapter[] = [
  makeRegistryAdapter({
    id: "cultui",
    label: "Cult UI",
    description:
      "Animated shadcn-style React + Tailwind components (Framer Motion), each with a demo. Returns real source from www.cult-ui.com.",
    homepage: "https://www.cult-ui.com/",
    base: "https://www.cult-ui.com/r",
    indexUrl: "https://www.cult-ui.com/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    // No docsUrl: /docs/components/<name> misses a few components and every demo.
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
  }),
  makeRegistryAdapter({
    id: "motionprimitives",
    label: "Motion Primitives",
    description:
      "Animated React + Tailwind UI primitives built on Motion: text effects, morphing dialogs, carousels, docks, spotlights. Returns real source from motion-primitives.com.",
    homepage: "https://motion-primitives.com/",
    base: "https://motion-primitives.com/c",
    indexUrl: "https://motion-primitives.com/c/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    docsUrl: (name) => `https://motion-primitives.com/docs/${name}`,
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
  }),
  makeRegistryAdapter({
    id: "kiboui",
    label: "Kibo UI",
    description:
      "Composable shadcn/ui extensions for React + Tailwind: kanban, gantt, color picker, code block, dropzone, editor. Returns real source from www.kibo-ui.com.",
    homepage: "https://www.kibo-ui.com/",
    base: "https://www.kibo-ui.com/r",
    indexUrl: "https://www.kibo-ui.com/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    docsUrl: (name) => `https://www.kibo-ui.com/components/${name}`,
    license: "MIT",
    stack: ["react", "tailwind"],
  }),
  makeRegistryAdapter({
    id: "cossui",
    label: "coss ui",
    description:
      "Cal.com's coss ui: accessible React + Tailwind components on Base UI, plus hundreds of usage examples (particles). Returns real source from coss.com.",
    homepage: "https://coss.com/ui",
    base: "https://coss.com/ui/r",
    indexUrl: "https://coss.com/ui/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    // No docsUrl: the particles (most items) have no page of their own.
    license:
      "MIT (apps/ui of cosscom/coss, per its LICENSING.md; the rest of that repo is AGPL-3.0)",
    stack: ["react", "tailwind"],
  }),
  makeRegistryAdapter({
    id: "kokonutui",
    label: "Kokonut UI",
    description:
      "Animated React + Tailwind components (AI prompt inputs, cards, buttons, text effects) and hooks. Returns real source from kokonutui.com.",
    homepage: "https://kokonutui.com/",
    base: "https://kokonutui.com/r",
    indexUrl: "https://kokonutui.com/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    // No docsUrl: page paths need a category (/docs/cards/<name>) the registry does not carry.
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
  }),
  makeRegistryAdapter({
    id: "eldoraui",
    label: "Eldora UI",
    description:
      "Animated React + Tailwind components, device mockups and landing-page blocks, with demos. Returns real source from www.eldoraui.site.",
    homepage: "https://www.eldoraui.site/",
    base: "https://www.eldoraui.site/r",
    indexUrl: "https://www.eldoraui.site/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    // No docsUrl: the demos, the blocks and some components have no page.
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
  }),
  makeRegistryAdapter({
    id: "uilayouts",
    label: "UI Layouts",
    description:
      "Animated React + Tailwind components (buttons, image masks, carousels, drawers, globes) and landing-page blocks. Returns real source from www.ui-layouts.com.",
    homepage: "https://www.ui-layouts.com/",
    base: "https://www.ui-layouts.com/r",
    indexUrl: "https://www.ui-layouts.com/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    // No docsUrl: fewer than half of the items have a page of their own.
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
  }),
  makeRegistryAdapter({
    id: "smoothui",
    label: "SmoothUI",
    description:
      "Animated React + Tailwind components (Motion) and page blocks: hero, pricing, FAQ, CTA, footer. Returns real source from smoothui.dev.",
    homepage: "https://smoothui.dev/",
    base: "https://smoothui.dev/r",
    indexUrl: "https://smoothui.dev/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    // No docsUrl: the blocks and a few components have no page.
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
    // The index inlines every file (about 2.4 MB), so search_all skips it unless named.
    heavy: true,
  }),
  makeRegistryAdapter({
    id: "aielements",
    label: "AI Elements",
    description:
      "Vercel AI Elements: React + Tailwind components for AI apps (conversation, prompt input, reasoning, tool calls, artifacts) with examples. Returns real source from elements.ai-sdk.dev.",
    homepage: "https://elements.ai-sdk.dev/",
    base: "https://elements.ai-sdk.dev/api/registry",
    indexUrl: "https://elements.ai-sdk.dev/api/registry/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    // Components have a docs page; their examples (registry:block) do not.
    docsUrl: (name, item) =>
      item.type === "registry:component"
        ? `https://elements.ai-sdk.dev/components/${name}`
        : undefined,
    license: "Apache-2.0",
    stack: ["react", "tailwind"],
  }),
  makeRegistryAdapter({
    id: "svgl",
    label: "SVGL",
    description:
      "Brand and technology logos from SVGL as React SVG components. Returns real source from svgl.app.",
    homepage: "https://svgl.app/",
    base: "https://svgl.app/r",
    indexUrl: "https://svgl.app/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    // No docsUrl: a logo has no page of its own.
    license:
      "MIT for the SVGL code; each logo is a trademark of its owner, so follow the brand's usage guidelines",
    stack: ["react", "icons"],
  }),
  // No docsUrl from here on: these registries' page paths were not checked item by item.
  makeRegistryAdapter({
    id: "hextaui",
    label: "HextaUI",
    description:
      "HextaUI: shadcn-style React + Tailwind components on Base UI, hooks and AI chat blocks, plus hundreds of examples covering loading, error and empty states. Returns real source from hextaui.com.",
    homepage: "https://hextaui.com/",
    base: "https://hextaui.com/r",
    indexUrl: "https://hextaui.com/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    license: "MIT",
    stack: ["react", "tailwind"],
  }),
  makeRegistryAdapter({
    id: "reui",
    label: "ReUI",
    description:
      "ReUI by Keenthemes: React + Tailwind components for shadcn projects (data grid, event calendar, gantt, kanban, filters, stepper, tree) plus 1,000+ usage patterns, Base UI build. Returns real source from reui.io; its paid blocks are left out.",
    homepage: "https://reui.io/",
    base: "https://reui.io/r/styles/base-nova",
    indexUrl: "https://reui.io/r/styles/base-nova/registry.json",
    // ponytail: the index also lists ReUI's paid blocks (they answer 401) and flags none of
    // them, but the free usage patterns are all named "c-<component>-<n>", so any other block
    // is dropped by name. Upgrade path: filter on a paid flag if the index gains one.
    indexItems: (payload) =>
      codeItems(payload).filter((it) => it.type !== "registry:block" || it.name.startsWith("c-")),
    itemUrl: itemJson,
    license: "MIT",
    stack: ["react", "tailwind"],
    idFormat:
      'registry item name from search_resources, e.g. "alert" (a component) or "c-alert-1" (a usage pattern)',
    // The index is about 2.4 MB, so search_all skips it unless named.
    heavy: true,
  }),
  makeRegistryAdapter({
    id: "cnippetui",
    label: "Cnippet UI",
    description:
      "Cnippet UI: accessible React + Tailwind components on Base UI, about a thousand ready-made variants of them and motion text effects (reveal, scramble, typewriter). Returns real source from ui.cnippet.dev.",
    homepage: "https://ui.cnippet.dev/",
    base: "https://ui.cnippet.dev/r",
    // robots.txt allows every agent except named AI-training crawlers (ai-train=no); this
    // server reads items on request and trains nothing.
    indexUrl: "https://ui.cnippet.dev/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
  }),
  makeRegistryAdapter({
    id: "systalikoui",
    label: "Systaliko UI",
    description:
      "Systaliko UI: animated React + Tailwind components and blocks on Motion: text staggers, scroll animations, card stacks, cursors, carousels, pricing. Returns real source from systaliko-ui.vercel.app.",
    homepage: "https://systaliko-ui.vercel.app/",
    base: "https://systaliko-ui.vercel.app/r",
    indexUrl: "https://systaliko-ui.vercel.app/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
  }),
  makeRegistryAdapter({
    id: "uitripled",
    label: "UI TripleD",
    description:
      "UI TripleD: animated React + Tailwind components, blocks and full pages on Framer Motion, in a shadcn/ui (Radix) build and many also in a Base UI build. Returns real source from ui.tripled.work.",
    homepage: "https://ui.tripled.work/",
    base: "https://ui.tripled.work/r",
    indexUrl: "https://ui.tripled.work/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
    idFormat:
      'registry item name from search_resources, e.g. "ai-glow-input-shadcnui"; the suffix names the build (-shadcnui for Radix, -baseui for Base UI)',
  }),
  makeRegistryAdapter({
    id: "ruixenui",
    label: "Ruixen UI",
    description:
      "Ruixen UI: animated React + Tailwind components for marketing pages (scroll effects, carousels, docks, text effects, layouts), each with a demo. Returns real source from ruixen.com.",
    homepage: "https://ruixen.com/",
    base: "https://ruixen.com/r",
    // The index sits at the site root, the items under /r/.
    indexUrl: "https://ruixen.com/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
  }),
  makeRegistryAdapter({
    id: "uselayouts",
    label: "useLayouts",
    description:
      "useLayouts: animated React + Tailwind components and micro-interactions on Motion (3D book, gooey navbar, wheel carousel, polaroid stack, multi-step form). Returns real source from uselayouts.com.",
    homepage: "https://uselayouts.com/",
    base: "https://uselayouts.com/r",
    indexUrl: "https://uselayouts.com/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
  }),
  makeRegistryAdapter({
    id: "spellui",
    label: "Spell UI",
    description:
      "Spell UI: polished React + Tailwind components for landing pages: blur reveal, text marquee, tilt card, light rays, animated gradient, logo carousel. Returns real source from spell.sh.",
    homepage: "https://spell.sh/",
    base: "https://spell.sh/r",
    indexUrl: "https://spell.sh/r/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    license: "MIT",
    stack: ["react", "tailwind", "animation"],
  }),
  makeRegistryAdapter({
    id: "jollyui",
    label: "Jolly UI",
    description:
      "Jolly UI: shadcn/ui-style React + Tailwind components built on React Aria Components, with full keyboard, focus and screen-reader support. Returns real source from www.jollyui.dev.",
    homepage: "https://www.jollyui.dev/",
    base: "https://www.jollyui.dev/r/styles/default",
    // A legacy (shadcn v2) registry: a bare-array index, then one folder per style.
    indexUrl: "https://www.jollyui.dev/r/index.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    license: "MIT",
    stack: ["react", "tailwind", "accessibility"],
  }),
  makeRegistryAdapter({
    id: "assistantui",
    label: "assistant-ui",
    description:
      "assistant-ui: React + Tailwind components for AI chat on Radix (thread, composer, attachments, markdown, reasoning, tool calls, thread list), 100+ agent UI elements (tool timelines, citations, approval cards, code diffs, voice) and AI SDK backend routes. Returns real source from r.assistant-ui.com.",
    homepage: "https://www.assistant-ui.com/",
    base: "https://r.assistant-ui.com",
    indexUrl: "https://r.assistant-ui.com/registry.json",
    indexItems: codeItems,
    itemUrl: itemJson,
    license: "MIT",
    stack: ["react", "tailwind"],
    idFormat:
      'registry item name from search_resources, e.g. "thread" (the chat UI) or "elements-tool-call" (an agent UI element)',
  }),
  tweakcn,
  shadcndirectory,
];
