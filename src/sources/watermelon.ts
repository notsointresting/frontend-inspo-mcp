// Watermelon UI adapter — uses the official public JSON API.
// API: https://ui.watermelon.sh/openapi.json
import { fetchJson } from "../lib/fetch.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";

const BASE = "https://ui.watermelon.sh";
const KINDS = [
  "animated-components",
  "blocks",
  "dashboards",
  "templates",
  "showcases",
] as const;
type Kind = (typeof KINDS)[number];

interface ApiEntry {
  kind: Kind;
  title: string;
  slug: string;
  description: string;
  category?: string;
  image?: string;
  path: string;
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
    url: e.path.startsWith("http") ? e.path : `${BASE}${e.path}`,
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
    "Open-source React components, animated components, blocks, dashboards, and templates (official JSON API).",
  homepage: "https://ui.watermelon.sh/home",
  hasInlineCode: false,

  async listCategories(): Promise<Category[]> {
    const summary = await fetchJson<SummaryResp>(
      `${BASE}/api/v1/catalog/summary`,
    );
    return KINDS.map((k) => ({
      id: k,
      label: k
        .split("-")
        .map((w) => w[0].toUpperCase() + w.slice(1))
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
      results.push(...resp.entries.map(toSummary));
      if (results.length >= limit && !searchAll) break;
    }
    return results.slice(0, limit);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const [kind, ...rest] = id.split("/");
    const slug = rest.join("/");
    if (!KINDS.includes(kind as Kind) || !slug) return null;
    const resp = await fetchJson<EntryResp>(
      `${BASE}/api/v1/catalog/entries/${kind}/${encodeURIComponent(slug)}`,
    );
    if (!resp.found || !resp.entry) return null;
    const s = toSummary(resp.entry);
    return {
      ...s,
      license: "See Watermelon UI repository license",
      extra: { note: "Source code lives on the linked page / repository." },
    };
  },
};
