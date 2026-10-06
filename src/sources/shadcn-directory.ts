// shadcn/ui Registry Directory (https://ui.shadcn.com/docs/directory): the community registries
// the shadcn CLI knows by namespace, with the health ui.shadcn.com monitors for each one.
// Discovery only: the directory records no license, so this source never downloads code from
// the registries it lists. It says where a registry is and how to install from it.
import { fetchJson } from "../lib/fetch.js";
import { memoAsync } from "../lib/memo.js";
import { rankByQuery } from "../lib/search.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";
import { idSchema } from "../lib/validate.js";

const HOMEPAGE = "https://ui.shadcn.com/docs/directory";
const DIRECTORY_URL = "https://ui.shadcn.com/r/registries.json";
const DIRECTORY_TTL_MS = 6 * 60 * 60 * 1000;

interface Registry {
  name: string; // namespace, e.g. "@kokonutui"
  homepage?: string;
  url: string; // item URL template, e.g. "https://kokonutui.com/r/{name}.json"
  description?: string;
  health?: {
    status?: string;
    statusReason?: { message?: string };
    score?: number;
    checkedAt?: string;
  };
  ranking?: { score?: number; itemCount?: number };
}

/** "@kokonutui" -> "kokonutui": tool ids cannot start with "@". */
const idOf = (r: Registry) => r.name.replace(/^@/, "");
const statusOf = (r: Registry) => r.health?.status ?? "unknown";
/** Best first, close to the directory's own order (docs/registry/health): by ranking score,
 *  then registries without one, then unavailable ones; alphabetical within ties. */
const rankOf = (r: Registry) => (statusOf(r) === "unavailable" ? -2 : (r.ranking?.score ?? -1));

const loadDirectory = memoAsync(
  async (): Promise<Registry[]> =>
    // The API keeps its own (alphabetical) order; the health ranking is left to clients.
    (await fetchJson<Registry[]>(DIRECTORY_URL))
      .filter(
        (r) =>
          typeof r?.name === "string" &&
          idSchema.safeParse(idOf(r)).success &&
          // The install hint must not send anyone to plain HTTP.
          typeof r.url === "string" &&
          r.url.startsWith("https://"),
      )
      .sort((a, b) => rankOf(b) - rankOf(a) || a.name.localeCompare(b.name)),
  DIRECTORY_TTL_MS,
);

function summaryOf(r: Registry): ResourceSummary {
  return {
    source: "shadcndirectory",
    id: idOf(r),
    title: r.name,
    description: r.description,
    category: statusOf(r),
    url: r.homepage?.startsWith("https://") ? r.homepage : HOMEPAGE,
  };
}

export const shadcndirectory: SourceAdapter = {
  id: "shadcndirectory",
  label: "shadcn Registry Directory",
  description:
    "The shadcn/ui Registry Directory: hundreds of community component registries with health status, item counts, URL templates and install commands. Metadata only: the directory records no licenses, so no code is fetched from the registries.",
  homepage: HOMEPAGE,
  hasInlineCode: false,
  stack: ["react", "tailwind"],
  idFormat: 'registry namespace without the "@", from search_resources, e.g. "kokonutui"',

  async listCategories(): Promise<Category[]> {
    const counts = new Map<string, number>();
    for (const r of await loadDirectory()) {
      counts.set(statusOf(r), (counts.get(statusOf(r)) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, label: id, count }));
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const cat = (args.category ?? "").toLowerCase();
    const list = (await loadDirectory()).filter((r) => !cat || statusOf(r) === cat);
    const fields = (r: Registry) => [idOf(r), r.description, r.homepage];
    return rankByQuery(list, args.query, fields, limit).map(summaryOf);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const r = (await loadDirectory()).find((x) => idOf(x) === id);
    if (!r) return null;
    const itemUrl = r.url.replaceAll("{name}", "<item>").replaceAll("{style}", "<style>");
    return {
      ...summaryOf(r),
      license:
        "Not recorded by the directory: check the registry's own license before reusing code",
      extra: {
        namespace: r.name,
        urlTemplate: r.url,
        install: `npx shadcn@latest add ${itemUrl}`,
        listItems: `npx shadcn@latest search ${r.name}`,
        itemCount: r.ranking?.itemCount,
        rankingScore: r.ranking?.score,
        health: r.health && {
          status: statusOf(r),
          reason: r.health.statusReason?.message,
          score: r.health.score,
          checkedAt: r.health.checkedAt,
        },
      },
    };
  },
};
