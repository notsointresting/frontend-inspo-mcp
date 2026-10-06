// Watermelon UI adapter — the official public JSON API for search, and each entry's shadcn
// registry item for the code. API: https://ui.watermelon.sh/openapi.json
import { fetchJson, isTransient } from "../lib/fetch.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";
import { idSchema } from "../lib/validate.js";
import { fetchRegistryItem, registryDetail } from "./registry.js";

const BASE = "https://ui.watermelon.sh";
// Must match the API's `hint` list: it 400s on unknown kinds ("showcases" was removed upstream).
const KINDS = ["components", "animated-components", "blocks", "dashboards", "templates"] as const;
type Kind = (typeof KINDS)[number];
/** The only registry item URLs we fetch. An entry's `registryUrl` is upstream data that also ends
 *  up in the `extra.install` shell command, so it is used only if it has exactly this shape. */
const REGISTRY_URL = /^https:\/\/(?:ui|registry)\.watermelon\.sh\/r\/[\w.-]+\.json$/;

interface ApiEntry {
  kind: Kind;
  title: string;
  slug: string;
  description: string;
  category?: string;
  image?: string;
  path: string; // a file path in Watermelon's repo, not a page
  // Undocumented, but on live entries (templates have no registryUrl):
  previewUrl?: string;
  registryUrl?: string;
}
interface SummaryResp {
  totalEntries: number;
  counts: Record<string, number>;
}
interface EntriesResp {
  entries: ApiEntry[];
}
interface EntryResp {
  found: boolean;
  entry?: ApiEntry;
}

// Resource id encodes kind so getResource can route: "kind/slug".
function toSummary(e: ApiEntry): ResourceSummary {
  return {
    source: "watermelon",
    id: `${e.kind}/${e.slug}`,
    title: e.title,
    description: e.description,
    category: e.category,
    url: e.previewUrl?.startsWith(`${BASE}/`) ? e.previewUrl : `${BASE}/home`,
    image: e.image,
    tags: [e.kind, e.category].filter(Boolean) as string[],
  };
}

function pickKind(args: SearchArgs): Kind {
  // Map a `tech`/`category` hint to a kind, else default to blocks.
  const hint = (args.tech || args.category || "").toLowerCase();
  const match = KINDS.find((k) => hint.includes(k) || k.includes(hint));
  return match ?? "blocks";
}

export const watermelon: SourceAdapter = {
  id: "watermelon",
  label: "Watermelon UI",
  description:
    "Open-source React + Tailwind components, animated components, blocks, dashboards, and templates (official JSON API). Returns real .tsx source from its shadcn registry.",
  homepage: "https://ui.watermelon.sh/home",
  hasInlineCode: true,
  stack: ["react", "tailwind", "animation"],
  idFormat:
    'kind/slug from search_resources, e.g. "blocks/announcement-1" (kinds: components, animated-components, blocks, dashboards, templates)',

  async listCategories(): Promise<Category[]> {
    const summary = await fetchJson<SummaryResp>(`${BASE}/api/v1/catalog/summary`);
    return KINDS.map((k) => ({
      id: k,
      label: k
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      count: summary.counts?.[k],
    }));
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    // If category matches a kind, query that kind; otherwise search across all kinds.
    const catIsKind = KINDS.includes(args.category as Kind);
    const kinds: Kind[] = catIsKind ? [args.category as Kind] : [pickKind(args)];
    // When no strong hint, broaden to all kinds and merge.
    const searchAll = !catIsKind && !args.tech && !args.category;
    const targets = searchAll ? [...KINDS] : kinds;

    const results: ResourceSummary[] = [];
    for (const kind of targets) {
      const params = new URLSearchParams({ kind, limit: String(limit) });
      if (catIsKind === false && args.category) {
        params.set("category", args.category);
      }
      if (args.query) params.set("query", args.query);
      const resp = await fetchJson<EntriesResp>(
        `${BASE}/api/v1/catalog/entries?${params.toString()}`,
      );
      // Skip entries whose id the tools would reject.
      results.push(...resp.entries.map(toSummary).filter((r) => idSchema.safeParse(r.id).success));
      if (results.length >= limit && !searchAll) break;
    }
    return results.slice(0, limit);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const [kind, ...rest] = id.split("/");
    const slug = rest.join("/");
    if (!KINDS.includes(kind as Kind) || !slug) return null;
    let resp: EntryResp;
    try {
      resp = await fetchJson<EntryResp>(
        `${BASE}/api/v1/catalog/entries/${kind}/${encodeURIComponent(slug)}`,
      );
    } catch (e) {
      if (isTransient(e)) throw e;
      return null; // the API answers 404 for an unknown slug
    }
    if (!resp.found || !resp.entry) return null;
    const e = resp.entry;
    // The entry's own registryUrl if it is trustworthy, else the registry's naming convention.
    const registryUrl = [e.registryUrl, `https://registry.watermelon.sh/r/${e.slug}.json`].find(
      (u) => typeof u === "string" && REGISTRY_URL.test(u),
    );
    const item = registryUrl ? await fetchRegistryItem(registryUrl) : null;
    return {
      ...toSummary(e),
      license: "MIT",
      ...(registryUrl && item
        ? registryDetail(registryUrl, item)
        : {
            extra: { note: "No registry item for this entry; the source is on the linked page." },
          }),
    };
  },
};
