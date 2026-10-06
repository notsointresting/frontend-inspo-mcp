// web-features (https://github.com/web-platform-dx/web-features): the W3C WebDX Community
// Group's Baseline status for ~1,200 web-platform features, read from the data.json of the
// latest web-features npm release on jsDelivr. The file is ~5 MB, so it is parsed once and kept
// for a day, and the source is heavy.
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

const PACKAGE_URL = "https://data.jsdelivr.com/v1/package/npm/web-features";
const dataUrl = (version: string) =>
  `https://cdn.jsdelivr.net/npm/web-features@${version}/data.json`;
const pageUrl = (id: string) =>
  `https://web-platform-dx.github.io/web-features-explorer/features/${id}/`;
const DATA_TTL_MS = 24 * 60 * 60 * 1000;
/** baseline.json lists at most this many compat keys (the svg feature has hundreds). */
const MAX_COMPAT_KEYS = 50;

type Baseline = "high" | "low" | false;
interface Status {
  baseline?: Baseline;
  baseline_low_date?: string; // "2023-02-14", or "≤2020-03-24" when only a range is known
  baseline_high_date?: string;
  support?: Record<string, string>; // browser -> first version with full support
  by_compat_key?: Record<string, Status>;
}
interface Feature {
  kind?: "feature" | "moved" | "split";
  name?: string;
  description?: string;
  spec?: string[];
  group?: string[];
  caniuse?: string[];
  compat_features?: string[];
  status?: Status;
  discouraged?: {
    reason?: string;
    according_to?: string[];
    alternatives?: string[];
    removal_date?: string;
  };
  redirect_target?: string; // kind "moved"
  redirect_targets?: string[]; // kind "split"
}
interface Group {
  name?: string;
  parent?: string;
}
interface Listed {
  id: string;
  f: Feature;
  /** The feature's groups and all their ancestors, so "css" also finds "anchor-positioning". */
  groups: Set<string>;
}
interface Loaded {
  version: string;
  byId: Map<string, Feature>;
  groups: [string, Group][];
  list: Listed[];
}

/** Category ids for the three Baseline statuses; also each search result's one tag. */
const STATUSES: [string, string][] = [
  ["high", "Baseline: widely available"],
  ["low", "Baseline: newly available"],
  ["false", "Limited availability (not Baseline)"],
];
const statusOf = (f: Feature): string => String(f.status?.baseline ?? false);

const loadData = memoAsync(async (): Promise<Loaded> => {
  const pkg = await fetchJson<{ tags?: { latest?: string } }>(PACKAGE_URL);
  const version = pkg?.tags?.latest;
  if (!version) throw new Error("jsDelivr reports no latest version of web-features");
  const data = await fetchJson<{
    features?: Record<string, Feature>;
    groups?: Record<string, Group>;
  }>(dataUrl(version));
  const groups = new Map(Object.entries(data?.groups ?? {}));
  const lineage = (id: string): string[] => {
    const out: string[] = [];
    for (let g: string | undefined = id; g && !out.includes(g); g = groups.get(g)?.parent) {
      out.push(g);
    }
    return out;
  };
  const byId = new Map(Object.entries(data?.features ?? {}));
  const list = [...byId]
    .filter(([id, f]) => f?.kind === "feature" && idSchema.safeParse(id).success)
    .map(([id, f]) => ({ id, f, groups: new Set((f.group ?? []).flatMap(lineage)) }));
  return { version, byId, groups: [...groups], list };
}, DATA_TTL_MS);

function summaryOf(id: string, f: Feature): ResourceSummary {
  return {
    source: "webfeatures",
    id,
    title: f.name || id,
    description: f.description,
    category: f.group?.[0],
    url: pageUrl(id),
    tags: [statusOf(f)],
  };
}

/** "Baseline widely available since 2025-08-14", flagged when the feature is discouraged. */
function statusLine(f: Feature): string {
  const s = f.status;
  const since = (date?: string) => (date ? ` since ${date}` : "");
  const line =
    s?.baseline === "high"
      ? `Baseline widely available${since(s.baseline_high_date)}`
      : s?.baseline === "low"
        ? `Baseline newly available${since(s.baseline_low_date)}`
        : "Limited availability (not Baseline)";
  return f.discouraged ? `${line}, but discouraged (see baseline.json)` : line;
}

/** The feature's Baseline data; compat keys trimmed to their own status, at most 50 of them. */
function baselineJson(id: string, f: Feature): string {
  const s = f.status ?? {};
  const keys = f.compat_features ?? [];
  const d = f.discouraged;
  const data = {
    id,
    name: f.name,
    description: f.description,
    baseline: s.baseline ?? false,
    baseline_low_date: s.baseline_low_date,
    baseline_high_date: s.baseline_high_date,
    support: s.support,
    spec: f.spec,
    caniuse: f.caniuse,
    group: f.group,
    discouraged: d && {
      reason: d.reason,
      according_to: d.according_to,
      alternatives: d.alternatives,
      removal_date: d.removal_date,
    },
    compat_features: Object.fromEntries(
      keys.slice(0, MAX_COMPAT_KEYS).map((k) => [k, s.by_compat_key?.[k]?.baseline ?? null]),
    ),
    compat_features_omitted:
      keys.length > MAX_COMPAT_KEYS ? keys.length - MAX_COMPAT_KEYS : undefined,
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}

export const webfeatures: SourceAdapter = {
  id: "webfeatures",
  label: "web-features (Baseline)",
  description:
    "web-features — Baseline browser-support status for ~1,200 web-platform features (CSS, HTML, JavaScript, Web APIs) from the W3C WebDX Community Group: whether a feature is Baseline widely or newly available and since when, the first browser versions that support it, spec and caniuse links, discouraged features, and the status of each of its browser-compat-data keys. Categories are the feature groups (css, html, javascript, ...) and the statuses high, low and false. Read from the web-features npm package via jsDelivr.",
  homepage: "https://web-platform-dx.github.io/web-features/",
  hasInlineCode: true,
  stack: ["compat"],
  idFormat: 'web-features id, e.g. "container-queries"',
  heavy: true, // one ~5 MB data.json

  async listCategories(): Promise<Category[]> {
    const { groups, list } = await loadData();
    const count = (match: (x: Listed) => boolean) => list.filter(match).length;
    return [
      ...STATUSES.map(([id, label]) => ({ id, label, count: count((x) => statusOf(x.f) === id) })),
      ...groups.map(([id, g]) => ({
        id,
        label: g?.name || id,
        count: count((x) => x.groups.has(id)),
        parent: g?.parent,
      })),
    ];
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const { list } = await loadData();
    const cat = (args.category ?? "").toLowerCase();
    const isStatus = STATUSES.some(([id]) => id === cat);
    const pool = cat
      ? list.filter((x) => (isStatus ? statusOf(x.f) === cat : x.groups.has(cat)))
      : list;
    // The id first: "container queries" should find container-queries before the features that
    // only mention it.
    const fields = (x: Listed) => [
      x.id,
      x.f.name,
      x.f.description,
      x.f.caniuse?.join(" "),
      x.f.compat_features?.join(" "),
    ];
    return rankByQuery(pool, args.query, fields, limit).map((x) => summaryOf(x.id, x.f));
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const { version, byId } = await loadData();
    const asked = byId.get(id);
    if (asked?.kind === "split") {
      const targets = asked.redirect_targets ?? [];
      return {
        source: "webfeatures",
        id,
        title: id,
        description: `Split into ${targets.join(", ")}: get_resource each of them`,
        url: pageUrl(id),
        license: "Apache-2.0",
        extra: { splitInto: targets, dataVersion: version },
      };
    }
    // A moved feature lives on under its new id.
    const target = asked?.kind === "moved" ? asked.redirect_target : undefined;
    const fid = target ?? id;
    const f = target ? byId.get(target) : asked;
    if (f?.kind !== "feature") return null;
    return {
      ...summaryOf(fid, f),
      description: statusLine(f),
      license: "Apache-2.0",
      code: { "baseline.json": baselineJson(fid, f) },
      extra: { dataVersion: version, ...(target ? { movedFrom: id } : {}) },
    };
  },
};
