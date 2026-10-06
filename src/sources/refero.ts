// Refero styles adapter. Reads the public, server-rendered pages of
// styles.refero.design (gallery `/` and `/?sort=popular|newest`, detail `/style/<id>`),
// which embed the design-system data in their Next.js flight payload, and synthesizes
// DESIGN.md, Tailwind theme, CSS variables, and design tokens from it.
// ponytail: /api/* is disallowed by robots.txt and bot-protected (Vercel BotID),
// so we deliberately do not use it. Upgrade path if the page layout changes:
// the extractors below throw a "payload not found" error that the smoke test
// reports as a HARD failure.
import { FetchError, fetchText } from "../lib/fetch.js";
import { rankByQuery } from "../lib/search.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";
import { idSchema } from "../lib/validate.js";

const BASE = "https://styles.refero.design";

interface ReferoListItem {
  id: string;
  url: string;
  siteName?: string;
  screenshotUrl?: string;
  thumbnailUrl?: string;
  colorScheme?: string;
  industry?: string;
  northStar?: string;
}
interface ColorTok {
  hex: string;
  name?: string;
  role?: string;
  group?: string;
}
interface TypographyTok {
  role?: string;
  family?: string;
  sizes?: string;
  weight?: string;
  lineHeight?: string;
  substitute?: string;
  letterSpacing?: string;
}
interface SurfaceTok {
  hex: string;
  name?: string;
  level?: number;
  purpose?: string;
}
interface ComponentTok {
  name: string;
  role?: string;
  description?: string;
}
interface DesignSystem {
  theme?: string;
  description?: string;
  northStar?: string;
  layout?: string;
  imagery?: string;
  industry?: string;
  colors?: ColorTok[];
  surfaces?: SurfaceTok[];
  typography?: TypographyTok[];
  typeScale?: { role?: string; size?: number; lineHeight?: number; letterSpacing?: number }[];
  components?: ComponentTok[];
  spacing?: {
    radius?: Record<string, string>;
    elementGap?: string;
    sectionGap?: string;
    cardPadding?: string;
    pageMaxWidth?: string;
  };
  dos?: string[];
  donts?: string[];
}
// --- Flight-payload extraction ----------------------------------------------

/** Concatenate the Next.js RSC chunks (`self.__next_f.push([1,"..."])`) of a page. */
function flightData(html: string): string {
  let out = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    out += JSON.parse(m[1] ?? '""') as string;
  }
  return out;
}

/** Parse the JSON value (object/array) that starts right after `marker`. */
function jsonAfter<T>(data: string, marker: string): T {
  const at = data.indexOf(marker);
  if (at < 0) throw new Error(`refero: payload "${marker}" not found (page format changed?)`);
  const start = at + marker.length;
  let depth = 0,
    inStr = false,
    esc = false;
  for (let i = start; i < data.length; i++) {
    const c = data[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{" || c === "[") depth++;
    else if ((c === "}" || c === "]") && --depth === 0) {
      return JSON.parse(data.slice(start, i + 1)) as T;
    }
  }
  throw new Error(`refero: payload "${marker}" is truncated`);
}
const slugName = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function toSummary(it: ReferoListItem): ResourceSummary {
  return {
    source: "refero",
    id: it.id,
    title: it.siteName || it.url,
    description: it.northStar,
    category: it.industry,
    url: `${BASE}/style/${it.id}`,
    image: it.thumbnailUrl || it.screenshotUrl,
    tags: [it.colorScheme, it.industry].filter(Boolean) as string[],
  };
}

// --- Gallery pages and the index of styles seen -------------------------------

/** The gallery's sort orders; "" is its default sort, Trending. */
const SORTS = ["", "popular", "newest"];

// ponytail: the gallery server-renders only the first 20 styles of each sort and reads no
// paging or filter parameter besides ?sort= (?page=, ?q=, ?search=, ?industry=, ... are
// ignored or rendered client-side from the disallowed /api/). So a search sees up to 60
// styles (trending, popular, newest) plus every style seen earlier in this process, not
// the ~1.3k of /sitemaps/styles.xml. The index is bounded by that catalog. Upgrade path:
// the curated /design-styles/<slug> pages (about 20 styles each) as categories.
const seen = new Map<string, ReferoListItem>();

/** The styles one gallery sort server-renders (ids the tools accept only), now also in `seen`. */
async function galleryPage(sort: string): Promise<ReferoListItem[]> {
  const html = await fetchText(sort ? `${BASE}/?sort=${sort}` : `${BASE}/`);
  const items = jsonAfter<ReferoListItem[]>(flightData(html), '"initialPage":{"styles":').filter(
    (it) => idSchema.safeParse(it?.id).success,
  );
  for (const it of items) seen.set(it.id, it);
  return items;
}

// --- Synthesizers: build the artifacts the Refero UI exposes ----------------

function buildDesignMd(name: string, url: string, ds: DesignSystem): string {
  const L: string[] = [];
  L.push(`# ${name} — Style Reference`);
  if (ds.northStar) L.push(`> ${ds.northStar}`);
  L.push("");
  if (ds.theme) L.push(`**Theme:** ${ds.theme}`);
  L.push(`**Source:** ${url}`);
  L.push("");
  if (ds.description) {
    L.push(ds.description);
    L.push("");
  }

  if (ds.colors?.length) {
    L.push("## Colors");
    L.push("| Name | Value | Role |");
    L.push("|------|-------|------|");
    for (const c of ds.colors) L.push(`| ${c.name ?? ""} | \`${c.hex}\` | ${c.role ?? ""} |`);
    L.push("");
  }
  if (ds.surfaces?.length) {
    L.push("## Surfaces");
    for (const s of ds.surfaces)
      L.push(
        `- \`${s.hex}\` **${s.name ?? "surface"}** (level ${s.level ?? 0}) — ${s.purpose ?? ""}`,
      );
    L.push("");
  }
  if (ds.typography?.length) {
    L.push("## Typography");
    for (const t of ds.typography) {
      L.push(`### ${t.family ?? "Font"}${t.role ? ` — ${t.role}` : ""}`);
      if (t.substitute) L.push(`- **Fallback:** ${t.substitute}`);
      if (t.weight) L.push(`- **Weights:** ${t.weight}`);
      if (t.sizes) L.push(`- **Sizes:** ${t.sizes}`);
      if (t.lineHeight) L.push(`- **Line height:** ${t.lineHeight}`);
      if (t.letterSpacing) L.push(`- **Letter spacing:** ${t.letterSpacing}`);
      L.push("");
    }
  }
  if (ds.spacing) {
    L.push("## Spacing & Radius");
    const sp = ds.spacing;
    if (sp.sectionGap) L.push(`- Section gap: ${sp.sectionGap}`);
    if (sp.elementGap) L.push(`- Element gap: ${sp.elementGap}`);
    if (sp.cardPadding) L.push(`- Card padding: ${sp.cardPadding}`);
    if (sp.pageMaxWidth) L.push(`- Page max width: ${sp.pageMaxWidth}`);
    if (sp.radius) for (const [k, v] of Object.entries(sp.radius)) L.push(`- Radius (${k}): ${v}`);
    L.push("");
  }
  if (ds.layout) {
    L.push("## Layout");
    L.push(ds.layout);
    L.push("");
  }
  if (ds.imagery) {
    L.push("## Imagery");
    L.push(ds.imagery);
    L.push("");
  }
  if (ds.components?.length) {
    L.push("## Components");
    for (const c of ds.components)
      L.push(`- **${c.name}**${c.role ? ` (${c.role})` : ""}: ${c.description ?? ""}`);
    L.push("");
  }
  if (ds.dos?.length) {
    L.push("## Do");
    for (const d of ds.dos) L.push(`- ${d}`);
    L.push("");
  }
  if (ds.donts?.length) {
    L.push("## Don't");
    for (const d of ds.donts) L.push(`- ${d}`);
    L.push("");
  }
  return L.join("\n");
}

function cssVarName(name: string, fallback: string): string {
  const base = slugName(name || fallback);
  return `--color-${base || fallback}`;
}

function buildCssVariables(ds: DesignSystem): string {
  const lines = [":root {"];
  for (const c of ds.colors ?? []) lines.push(`  ${cssVarName(c.name ?? "", "brand")}: ${c.hex};`);
  for (const s of ds.surfaces ?? [])
    lines.push(`  --surface-${slugName(s.name ?? "surface")}: ${s.hex};`);
  if (ds.spacing?.sectionGap) lines.push(`  --section-gap: ${ds.spacing.sectionGap};`);
  if (ds.spacing?.elementGap) lines.push(`  --element-gap: ${ds.spacing.elementGap};`);
  if (ds.spacing?.cardPadding) lines.push(`  --card-padding: ${ds.spacing.cardPadding};`);
  for (const [k, v] of Object.entries(ds.spacing?.radius ?? {}))
    lines.push(`  --radius-${k}: ${v};`);
  lines.push("}");
  return lines.join("\n");
}

function buildTailwind(ds: DesignSystem): string {
  const colors: Record<string, string> = {};
  for (const c of ds.colors ?? []) colors[slugName(c.name ?? "brand")] = c.hex;
  for (const s of ds.surfaces ?? []) colors[`surface-${slugName(s.name ?? "surface")}`] = s.hex;
  const radius: Record<string, string> = { ...(ds.spacing?.radius ?? {}) };
  const fonts = (ds.typography ?? []).map((t) => t.family).filter(Boolean);
  const cfg = {
    theme: {
      extend: {
        colors,
        borderRadius: radius,
        fontFamily: fonts.length ? { sans: fonts } : undefined,
      },
    },
  };
  return `// tailwind.config.js (v4 — @theme also works)\nexport default ${JSON.stringify(cfg, null, 2)}`;
}

function buildTokens(ds: DesignSystem): string {
  const tokens = {
    color: Object.fromEntries(
      (ds.colors ?? []).map((c) => [slugName(c.name ?? "brand"), { value: c.hex, role: c.role }]),
    ),
    surface: Object.fromEntries(
      (ds.surfaces ?? []).map((s) => [slugName(s.name ?? "surface"), { value: s.hex }]),
    ),
    radius: ds.spacing?.radius ?? {},
    spacing: {
      section: ds.spacing?.sectionGap,
      element: ds.spacing?.elementGap,
      cardPadding: ds.spacing?.cardPadding,
    },
    typeScale: ds.typeScale ?? [],
  };
  return JSON.stringify(tokens, null, 2);
}

export const refero: SourceAdapter = {
  id: "refero",
  label: "Refero Styles",
  description:
    "Design-system references extracted from real websites — DESIGN.md, Tailwind config, CSS variables, and design tokens. Reads Refero's public, server-rendered pages (robots.txt disallows its API); no subscription required. Search covers the 20 trending, 20 popular and 20 newest styles of the gallery plus every style seen earlier in the session, not the whole ~1.3k catalog.",
  homepage: "https://styles.refero.design/",
  hasInlineCode: true,
  stack: ["design-tokens"],
  idFormat: "style id (uuid) from search_resources",

  async listCategories(): Promise<Category[]> {
    // The gallery's sort orders, as "categories". "featured" (kept as the id) is its default
    // sort, which the site calls Trending.
    return [
      { id: "featured", label: "Trending" },
      { id: "popular", label: "Popular" },
      { id: "newest", label: "Newest" },
    ];
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const sort = args.category === "popular" || args.category === "newest" ? args.category : "";
    // A category is one sort page; otherwise every sort page, then every style seen before.
    const items = args.category
      ? await galleryPage(sort)
      : [...(await Promise.all(SORTS.map(galleryPage))).flat(), ...seen.values()];
    const unique = new Map<string, ReferoListItem>();
    for (const it of items) if (!unique.has(it.id)) unique.set(it.id, it);
    const fields = (i: ReferoListItem) => [
      i.siteName,
      i.url,
      i.industry,
      i.northStar,
      i.colorScheme,
    ];
    return rankByQuery([...unique.values()], args.query, fields, limit).map(toSummary);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    let html: string;
    try {
      html = await fetchText(`${BASE}/style/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e instanceof FetchError && e.status === 404) return null; // unknown id
      throw e;
    }
    const data = flightData(html);
    if (!data.includes('"designSystem":')) return null; // unknown id renders a 200 "not found" shell
    const meta = jsonAfter<{ url: string; siteName?: string }>(data, '"result":{"meta":');
    const ds = jsonAfter<DesignSystem>(data, '"designSystem":');
    const name = meta.siteName || meta.url;
    if (!seen.has(id)) {
      seen.set(id, {
        id,
        url: meta.url,
        siteName: meta.siteName,
        colorScheme: ds.theme,
        industry: ds.industry,
        northStar: ds.northStar,
      });
    }
    return {
      source: "refero",
      id,
      title: name,
      description: ds.northStar,
      category: ds.industry,
      url: `${BASE}/style/${id}`,
      tags: [ds.theme, ds.industry].filter(Boolean) as string[],
      license:
        "Design-system data extracted from a public website via Refero. Reference/inspiration only — the source site owns its brand and assets.",
      code: {
        "design.md": buildDesignMd(name, meta.url, ds),
        css: buildCssVariables(ds),
        "tailwind.js": buildTailwind(ds),
        "tokens.json": buildTokens(ds),
      },
      extra: {
        sourceUrl: meta.url,
        theme: ds.theme,
        industry: ds.industry,
      },
    };
  },
};
