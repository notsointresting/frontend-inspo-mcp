// Adapter factory for shadcn-schema component registries.
// These sites expose a registry index (list of items) and per-item JSON that
// contains the actual component source in `files[].content`.
import { fetchJson } from "../lib/fetch.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
  SourceId,
} from "../lib/types.js";

interface RegistryFile {
  path?: string;
  name?: string;
  content?: string;
  type?: string;
}
interface RegistryItem {
  name: string;
  type?: string;
  title?: string;
  description?: string;
  files?: RegistryFile[];
  categories?: string[];
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

interface RegistryConfig {
  id: SourceId;
  label: string;
  description: string;
  homepage: string;
  base: string;
  indexUrl: string;
  // Given an index payload, return the array of items.
  indexItems: (payload: unknown) => RegistryItem[];
  // Build the per-item detail URL from an item name.
  itemUrl: (base: string, name: string) => string;
  license: string;
}

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

function itemToSummary(cfg: RegistryConfig, it: RegistryItem): ResourceSummary {
  return {
    source: cfg.id,
    id: it.name,
    title: it.title || it.name,
    description: it.description,
    category: it.categories?.[0] || it.type,
    url: `${cfg.homepage}`,
    tags: [it.type, ...(it.categories || [])].filter(Boolean) as string[],
  };
}

export function makeRegistryAdapter(cfg: RegistryConfig): SourceAdapter {
  let indexCache: RegistryItem[] | null = null;

  async function loadIndex(): Promise<RegistryItem[]> {
    if (indexCache) return indexCache;
    const payload = await fetchJson<unknown>(cfg.indexUrl);
    // Keep only real components: named, and not registry meta (style/theme/index).
    const META_TYPES = new Set([
      "registry:style",
      "registry:theme",
      "registry:file",
    ]);
    indexCache = cfg
      .indexItems(payload)
      .filter(
        (i) =>
          i &&
          i.name &&
          i.name !== "index" &&
          !META_TYPES.has(i.type || ""),
      );
    return indexCache;
  }

  return {
    id: cfg.id,
    label: cfg.label,
    description: cfg.description,
    homepage: cfg.homepage,
    hasInlineCode: true,

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
      const items = await loadIndex();
      const q = (args.query || "").toLowerCase();
      const cat = (args.category || "").toLowerCase();
      const results: ResourceSummary[] = [];
      for (const it of items) {
        if (
          cat &&
          !(it.categories || []).map((c) => c.toLowerCase()).includes(cat) &&
          (it.type || "").toLowerCase() !== cat
        ) {
          continue;
        }
        if (
          q &&
          !`${it.name} ${it.title ?? ""} ${it.description ?? ""}`
            .toLowerCase()
            .includes(q)
        ) {
          continue;
        }
        results.push(itemToSummary(cfg, it));
        if (results.length >= limit) break;
      }
      return results;
    },

    async getResource(id: string): Promise<ResourceDetail | null> {
      let item: RegistryItem;
      try {
        item = await fetchJson<RegistryItem>(cfg.itemUrl(cfg.base, id));
      } catch {
        return null;
      }
      if (!item || !item.name) return null;
      const code: Record<string, string> = {};
      for (const f of item.files || []) {
        if (f.content && f.path) {
          const lang = langFromPath(f.path);
          // If multiple files share a lang, suffix with the file path.
          code[code[lang] ? `${lang}:${f.path}` : lang] = f.content;
        }
      }
      return {
        source: cfg.id,
        id: item.name,
        title: item.title || item.name,
        description: item.description,
        category: item.categories?.[0] || item.type,
        url: cfg.homepage,
        tags: [item.type, ...(item.categories || [])].filter(Boolean) as string[],
        license: cfg.license,
        code: Object.keys(code).length ? code : undefined,
        extra: {
          dependencies: item.dependencies,
          registryDependencies: item.registryDependencies,
          files: (item.files || []).map((f) => f.path),
        },
      };
    },
  };
}

// --- Concrete registries ----------------------------------------------------

export const shadcn = makeRegistryAdapter({
  id: "shadcn",
  label: "shadcn/ui",
  description:
    "shadcn/ui — copy-paste React + Tailwind components (Radix-based). Returns real .tsx source.",
  homepage: "https://ui.shadcn.com/",
  base: "https://ui.shadcn.com",
  indexUrl: "https://ui.shadcn.com/r/index.json",
  indexItems: (p) => (Array.isArray(p) ? (p as RegistryItem[]) : []),
  itemUrl: (base, name) => `${base}/r/styles/new-york/${name}.json`,
  license: "MIT",
});

export const magicui = makeRegistryAdapter({
  id: "magicui",
  label: "Magic UI",
  description:
    "Magic UI — animated React + Tailwind + Framer Motion components. Returns real source.",
  homepage: "https://magicui.design/",
  base: "https://magicui.design",
  indexUrl: "https://magicui.design/r/registry.json",
  indexItems: (p) => ((p as { items?: RegistryItem[] })?.items ?? []),
  itemUrl: (base, name) => `${base}/r/${name}.json`,
  license: "MIT",
});

export const aceternity = makeRegistryAdapter({
  id: "aceternity",
  label: "Aceternity UI",
  description:
    "Aceternity UI — bold animated React + Tailwind + Framer Motion components. Returns real source.",
  homepage: "https://ui.aceternity.com/",
  base: "https://ui.aceternity.com",
  indexUrl: "https://ui.aceternity.com/registry.json",
  indexItems: (p) => ((p as { items?: RegistryItem[] })?.items ?? []),
  itemUrl: (base, name) => `${base}/registry/${name}.json`,
  license: "See ui.aceternity.com (free components are MIT)",
});

export const reactbits = makeRegistryAdapter({
  id: "reactbits",
  label: "React Bits",
  description:
    "React Bits — animated React components (JS/TS, CSS/Tailwind variants). Returns real source.",
  homepage: "https://reactbits.dev/",
  base: "https://reactbits.dev",
  indexUrl: "https://reactbits.dev/r/registry.json",
  indexItems: (p) => ((p as { items?: RegistryItem[] })?.items ?? []),
  itemUrl: (base, name) => `${base}/r/${name}.json`,
  license: "MIT",
});

export const fancy = makeRegistryAdapter({
  id: "fancy",
  label: "Fancy Components",
  description:
    "Fancy Components — motion, scroll, text-physics and 2D effect React components (Framer Motion / Tailwind). Returns real source.",
  homepage: "https://fancycomponents.dev/",
  base: "https://fancycomponents.dev",
  indexUrl: "https://fancycomponents.dev/r/registry.json",
  indexItems: (p) => ((p as { items?: RegistryItem[] })?.items ?? []),
  itemUrl: (base, name) => `${base}/r/${name}.json`,
  license: "MIT",
});
