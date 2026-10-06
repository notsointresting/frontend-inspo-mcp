// Adapter factory for shadcn-schema component registries.
// These sites expose a registry index (list of items) and per-item JSON that
// contains the actual component source in `files[].content`.
import { fetchJson, isTransient } from "../lib/fetch.js";
import { memoAsync } from "../lib/memo.js";
import { rankByQuery } from "../lib/search.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
  SourceId,
  Stack,
} from "../lib/types.js";
import { idSchema } from "../lib/validate.js";

export interface RegistryFile {
  path?: string;
  name?: string;
  content?: string;
  type?: string;
}
export interface RegistryItem {
  name: string;
  type?: string;
  title?: string;
  description?: string;
  files?: RegistryFile[];
  categories?: string[];
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RegistryConfig {
  id: SourceId;
  label: string;
  description: string;
  homepage: string;
  base: string;
  indexUrl: string;
  // Given an index payload, return the array of items.
  indexItems: (payload: unknown) => RegistryItem[];
  // Build the per-item JSON URL from a resource id (an item name, unless the config accepts more).
  itemUrl: (base: string, id: string) => string;
  license: string;
  /** Per-item docs/preview page for a resource id and its item. Undefined means the homepage. */
  docsUrl?: (id: string, item: RegistryItem) => string | undefined;
  /** Defaults to ["react", "tailwind"]. */
  stack?: readonly Stack[];
  /** Defaults to a registry-item-name description. */
  idFormat?: string;
  heavy?: boolean;
}

/** The index is re-downloaded after an hour, so a long session sees new items. */
const INDEX_TTL_MS = 60 * 60 * 1000;
/** Registry meta rather than components: styles, themes, fonts and bare files. */
const META_TYPES = new Set(["registry:style", "registry:theme", "registry:font", "registry:file"]);

const langFromPath = (p: string): string => {
  const ext = p.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    tsx: "tsx",
    ts: "ts",
    jsx: "jsx",
    js: "js",
    css: "css",
    html: "html",
    json: "json",
  };
  return map[ext] || ext || "code";
};

/** A registry item, or null if it is missing or malformed. Rate limits and network errors throw. */
export async function fetchRegistryItem(url: string): Promise<RegistryItem | null> {
  try {
    const item = await fetchJson<RegistryItem>(url);
    return item?.name ? item : null;
  } catch (e) {
    if (isTransient(e)) throw e; // keep rate limits/network errors visible
    return null;
  }
}

/** What a registry item adds to a ResourceDetail: its files as code, keyed by language (a second
 *  file of the same language gets "<lang>:<path>"), plus the install hints. */
export function registryDetail(
  registryUrl: string,
  item: RegistryItem,
): Pick<ResourceDetail, "code" | "extra"> {
  const code: Record<string, string> = {};
  for (const f of item.files || []) {
    if (f.content && f.path) {
      const lang = langFromPath(f.path);
      code[code[lang] ? `${lang}:${f.path}` : lang] = f.content;
    }
  }
  return {
    code: Object.keys(code).length ? code : undefined,
    extra: {
      install: `npx shadcn@latest add ${registryUrl}`,
      registryUrl,
      dependencies: item.dependencies,
      registryDependencies: item.registryDependencies,
      files: (item.files || []).map((f) => f.path),
    },
  };
}

function itemToSummary(cfg: RegistryConfig, it: RegistryItem): ResourceSummary {
  return {
    source: cfg.id,
    id: it.name,
    title: it.title || it.name,
    description: it.description,
    category: it.categories?.[0] || it.type,
    url: cfg.docsUrl?.(it.name, it) ?? cfg.homepage,
    tags: [it.type, ...(it.categories || [])].filter(Boolean) as string[],
  };
}

export function makeRegistryAdapter(cfg: RegistryConfig): SourceAdapter {
  // Keep only real components: named with an id the tools accept, and not registry meta.
  const loadIndex = memoAsync(async (): Promise<RegistryItem[]> => {
    const payload = await fetchJson<unknown>(cfg.indexUrl);
    return cfg
      .indexItems(payload)
      .filter(
        (i) =>
          idSchema.safeParse(i?.name).success &&
          i.name !== "index" &&
          !META_TYPES.has(i.type || ""),
      );
  }, INDEX_TTL_MS);

  return {
    id: cfg.id,
    label: cfg.label,
    description: cfg.description,
    homepage: cfg.homepage,
    hasInlineCode: true,
    stack: cfg.stack ?? ["react", "tailwind"],
    idFormat: cfg.idFormat ?? 'registry item name from search_resources, e.g. "button"',
    heavy: cfg.heavy,

    async listCategories(): Promise<Category[]> {
      const items = await loadIndex();
      const counts = new Map<string, number>();
      for (const it of items) {
        const cats = it.categories?.length ? it.categories : [it.type || "component"];
        for (const c of cats) counts.set(c, (counts.get(c) || 0) + 1);
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({ id, label: id, count }));
    },

    async search(args: SearchArgs): Promise<ResourceSummary[]> {
      const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
      const cat = (args.category || "").toLowerCase();
      const items = (await loadIndex()).filter(
        (it) =>
          !cat ||
          (it.categories || []).map((c) => c.toLowerCase()).includes(cat) ||
          (it.type || "").toLowerCase() === cat,
      );
      // An untitled item is shown by its name, so its name also ranks as the title.
      const fields = (it: RegistryItem) => [
        it.title || it.name,
        it.name,
        it.description,
        ...(it.categories || []),
      ];
      return rankByQuery(items, args.query, fields, limit).map((it) => itemToSummary(cfg, it));
    },

    async getResource(id: string): Promise<ResourceDetail | null> {
      const registryUrl = cfg.itemUrl(cfg.base, id);
      const item = await fetchRegistryItem(registryUrl);
      if (!item) return null;
      return {
        source: cfg.id,
        id,
        title: item.title || item.name,
        description: item.description,
        category: item.categories?.[0] || item.type,
        url: cfg.docsUrl?.(id, item) ?? cfg.homepage,
        tags: [item.type, ...(item.categories || [])].filter(Boolean) as string[],
        license: cfg.license,
        ...registryDetail(registryUrl, item),
      };
    },
  };
}

// --- Concrete registries ----------------------------------------------------

/** Registry indexes come as a bare array or as {items: [...]}; read both. */
const itemsOf = (p: unknown): RegistryItem[] =>
  Array.isArray(p) ? (p as RegistryItem[]) : ((p as { items?: RegistryItem[] })?.items ?? []);

const SHADCN = "https://ui.shadcn.com";
/** Tailwind v4 styles the site serves: new-york-v4 (the default) and every primitives-look pair
 *  of the v4 style picker, each verified live.
 *  ponytail: hard-coded, since only the legacy v3 styles have an index (/r/styles/index.json);
 *  a new look has to be added here. */
const SHADCN_STYLES = new Set([
  "new-york-v4",
  ...["radix", "base", "aria"].flatMap((p) =>
    ["vega", "nova", "maia", "lyra", "mira", "luma", "sera", "rhea"].map((s) => `${p}-${s}`),
  ),
]);

/** "button" -> ["new-york-v4", "button"]; "base-nova::button" -> ["base-nova", "button"]. */
function shadcnStyle(id: string): [style: string, name: string] {
  const sep = id.indexOf("::");
  return sep < 0 ? ["new-york-v4", id] : [id.slice(0, sep), id.slice(sep + 2)];
}

export const shadcn = makeRegistryAdapter({
  id: "shadcn",
  label: "shadcn/ui",
  description:
    "shadcn/ui — copy-paste React + Tailwind v4 components, blocks and charts (Radix-based new-york-v4 style by default). Returns real .tsx source.",
  homepage: "https://ui.shadcn.com/",
  base: SHADCN,
  // Not /r/index.json: that lists only the ui primitives, two of them gone from this style.
  indexUrl: `${SHADCN}/r/styles/new-york-v4/registry.json`,
  indexItems: itemsOf,
  itemUrl: (base, id) => {
    const [style, name] = shadcnStyle(id);
    if (!SHADCN_STYLES.has(style)) {
      throw new Error(`Unknown shadcn style "${style}". Styles: ${[...SHADCN_STYLES].join(", ")}`);
    }
    return `${base}/r/styles/${style}/${name}.json`;
  },
  docsUrl: (id, item) => {
    const [style, name] = shadcnStyle(id);
    if (item.type === "registry:ui") {
      return `${SHADCN}/docs/components/${/^(base|aria)-/.exec(style)?.[1] ?? "radix"}/${name}`;
    }
    // Block and example previews exist for the default style only.
    if (item.type === "registry:block" || item.type === "registry:example") {
      return `${SHADCN}/view/new-york-v4/${name}`;
    }
    return undefined;
  },
  license: "MIT",
  stack: ["react", "tailwind"],
  idFormat:
    'registry item name from search_resources, e.g. "button" or "dashboard-01" (new-york-v4 style). For another Tailwind v4 style write "<style>::<name>", e.g. "base-nova::button"; styles are radix-, base- or aria- followed by vega, nova, maia, lyra, mira, luma, sera or rhea.',
});

export const magicui = makeRegistryAdapter({
  id: "magicui",
  label: "Magic UI",
  description:
    "Magic UI — animated React + Tailwind + Framer Motion components. Returns real source.",
  homepage: "https://magicui.design/",
  base: "https://magicui.design",
  indexUrl: "https://magicui.design/r/registry.json",
  indexItems: itemsOf,
  itemUrl: (base, name) => `${base}/r/${name}.json`,
  // ui items have a docs page (all but the client-tweet-card variant); demos do not.
  docsUrl: (name, item) =>
    item.type === "registry:ui" ? `https://magicui.design/docs/components/${name}` : undefined,
  license: "MIT",
  stack: ["react", "tailwind", "animation"],
  idFormat: 'registry item name from search_resources, e.g. "marquee"',
});

export const aceternity = makeRegistryAdapter({
  id: "aceternity",
  label: "Aceternity UI",
  description:
    "Aceternity UI — bold animated React + Tailwind + Framer Motion components. Returns real source.",
  homepage: "https://ui.aceternity.com/",
  base: "https://ui.aceternity.com",
  indexUrl: "https://ui.aceternity.com/registry.json",
  indexItems: itemsOf,
  itemUrl: (base, name) => `${base}/registry/${name}.json`,
  // No docsUrl: /components/<name> misses a tenth of the components (3d-card, lamp, globe, ...).
  license: "See ui.aceternity.com (free components are MIT)",
  stack: ["react", "tailwind", "animation"],
  idFormat: 'registry item name from search_resources, e.g. "3d-card"',
});

export const reactbits = makeRegistryAdapter({
  id: "reactbits",
  label: "React Bits",
  description:
    "React Bits — animated React components (JS/TS, CSS/Tailwind variants). Returns real source.",
  homepage: "https://reactbits.dev/",
  base: "https://reactbits.dev",
  indexUrl: "https://reactbits.dev/r/registry.json",
  indexItems: itemsOf,
  itemUrl: (base, name) => `${base}/r/${name}.json`,
  // No docsUrl: page paths need a category the registry does not carry.
  license: "MIT",
  stack: ["react", "tailwind", "css", "animation"],
  idFormat:
    'registry item name from search_resources: component, language and styling, e.g. "SplitText-TS-TW" (JS or TS, CSS or TW)',
});

export const vengeanceui = makeRegistryAdapter({
  id: "vengeanceui",
  label: "VengeanceUI",
  description:
    "VengeanceUI — animated React + Tailwind + Framer Motion components (shadcn-schema). Real .tsx source served from the Ashutoshx7/VengeanceUI repo.",
  homepage: "https://github.com/Ashutoshx7/VengeanceUI",
  base: "https://raw.githubusercontent.com/Ashutoshx7/VengeanceUI/main/public/r",
  indexUrl: "https://raw.githubusercontent.com/Ashutoshx7/VengeanceUI/main/public/r/registry.json",
  indexItems: itemsOf,
  itemUrl: (base, name) => `${base}/${name}.json`,
  // No docsUrl: vengenceui.com answers 200 with a generic page for names it has no page for.
  license: "MIT",
  stack: ["react", "tailwind", "animation"],
  idFormat: 'registry item name from search_resources, e.g. "animated-rays"',
});

/** Canvas UI's framework-build suffix: "cloth-react-webgpu" is a build of "cloth".
 *  ponytail: the framework list is hard-coded; a build for a new framework links to a 404 page
 *  until its suffix is added here. */
const CANVASUI_BUILD = /-(react|vue|svelte|solid|preact|vanilla)(-webgpu)?$/;

export const canvasui = makeRegistryAdapter({
  id: "canvasui",
  label: "Canvas UI",
  description:
    "Canvas UI — WebGL/WebGPU canvas & animated components for React, Vue, Svelte, Solid, Preact and vanilla TS (shadcn-schema). Returns real source from canvasui.dev.",
  homepage: "https://canvasui.dev/",
  base: "https://canvasui.dev",
  indexUrl: "https://canvasui.dev/r/registry.json",
  indexItems: itemsOf,
  itemUrl: (base, name) => `${base}/r/${name}.json`,
  // One docs page per component, shared by all of its framework builds.
  docsUrl: (name) => `https://canvasui.dev/docs/components/${name.replace(CANVASUI_BUILD, "")}`,
  license: "MIT",
  stack: ["react", "javascript", "3d", "animation"],
  idFormat:
    'registry item name from search_resources: component plus framework, e.g. "cloth-react" (-react, -vue, -svelte, -solid, -preact or -vanilla, plus -webgpu for the WebGPU build)',
});

export const fancy = makeRegistryAdapter({
  id: "fancy",
  label: "Fancy Components",
  description:
    "Fancy Components — motion, scroll, text-physics and 2D effect React components (Framer Motion / Tailwind). Returns real source.",
  homepage: "https://fancycomponents.dev/",
  base: "https://fancycomponents.dev",
  indexUrl: "https://fancycomponents.dev/r/registry.json",
  indexItems: itemsOf,
  itemUrl: (base, name) => `${base}/r/${name}.json`,
  // No docsUrl: a quarter of the components (variants such as letter-swap-forward-anim) have none.
  license: "MIT",
  stack: ["react", "tailwind", "animation"],
  idFormat: 'registry item name from search_resources, e.g. "typewriter"',
});
