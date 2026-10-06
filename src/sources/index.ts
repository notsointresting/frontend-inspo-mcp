// The one list of sources. server.ts generates every tool's `source` enum from it and
// smoke.ts checks every entry, so a new source only has to be added here (directly, or to
// one of the group arrays imported below).
import type { SourceAdapter } from "../lib/types.js";
import { collectionSources } from "./collections.js";
import { communityRegistries } from "./community-registries.js";
import { designApiSources } from "./design-apis.js";
import { freefrontend } from "./freefrontend.js";
import { librarySources } from "./libraries.js";
import { lsgraphics } from "./lsgraphics.js";
import { openDataSources } from "./open-data.js";
import {
  detectgpu,
  drei,
  glyph,
  gsap,
  img2threejs,
  liquidglass,
  liquidlogo,
  postprocessing,
  reactspring,
  scrollama,
  shadergradient,
  threejs,
  twojs,
  zustand,
} from "./packages.js";
import { r3f } from "./r3f.js";
import { refero } from "./refero.js";
import {
  aceternity,
  canvasui,
  fancy,
  magicui,
  reactbits,
  shadcn,
  vengeanceui,
} from "./registry.js";
import { threeui } from "./threeui.js";
import { watermelon } from "./watermelon.js";

/** Every source, in the order list_sources reports them. */
export const ADAPTER_LIST: readonly SourceAdapter[] = [
  freefrontend,
  watermelon,
  lsgraphics,
  shadcn,
  magicui,
  aceternity,
  reactbits,
  refero,
  threejs,
  drei,
  fancy,
  twojs,
  scrollama,
  r3f,
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
  vengeanceui,
  threeui,
  canvasui,
  ...communityRegistries,
  ...collectionSources,
  ...librarySources,
  ...designApiSources,
  ...openDataSources,
];

const byId = new Map<string, SourceAdapter>();
for (const a of ADAPTER_LIST) {
  if (byId.has(a.id)) throw new Error(`Duplicate source id: ${a.id}`);
  byId.set(a.id, a);
}

/** All source ids, in list order. */
export const SOURCE_IDS: string[] = [...byId.keys()];

/** The adapter for a source id (tool input is validated against SOURCE_IDS first). */
export function getAdapter(id: string): SourceAdapter {
  const a = byId.get(id);
  if (!a) throw new Error(`Unknown source: ${id}`);
  return a;
}
