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
  tweakcn,
  shadcndirectory,
];
