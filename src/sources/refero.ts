// Refero styles adapter — reads the PUBLIC styles.refero.design API (no subscription
// needed) and synthesizes DESIGN.md, Tailwind theme, CSS variables, and design tokens
// from the returned design-system data. This mirrors what the Refero UI shows behind its
// "Connect via MCP" panel, built from openly served JSON.
import { fetchJson } from "../lib/fetch.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";

const BASE = "https://styles.refero.design";

interface ReferoListItem {
  id: string;
  url: string;
  siteName: string;
  screenshotUrl?: string;
  thumbnailUrl?: string;
  colorScheme?: string;
  industry?: string;
  northStar?: string;
}
interface ColorTok { hex: string; name?: string; role?: string; group?: string }
interface TypographyTok {
  role?: string; family?: string; sizes?: string; weight?: string;
  lineHeight?: string; substitute?: string; letterSpacing?: string;
}
interface SurfaceTok { hex: string; name?: string; level?: number; purpose?: string }
interface ComponentTok { name: string; role?: string; description?: string }
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
    elementGap?: string; sectionGap?: string; cardPadding?: string; pageMaxWidth?: string;
  };
  dos?: string[];
  donts?: string[];
}
interface StyleDetail {
  style: ReferoListItem & { fullResult?: { designSystem?: DesignSystem } };
  similar?: ReferoListItem[];
}

const slugName = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function toSummary(it: ReferoListItem): ResourceSummary {
  return {
    source: "refero",
    id: it.id,
    title: it.siteName || it.url,
    description: it.northStar,
    category: it.industry,
    url: `${BASE}/styles/${slugName(it.siteName)}`,
    image: it.thumbnailUrl || it.screenshotUrl,
    tags: [it.colorScheme, it.industry].filter(Boolean) as string[],
  };
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
  if (ds.description) { L.push(ds.description); L.push(""); }

  if (ds.colors?.length) {
    L.push("## Colors");
    L.push("| Name | Value | Role |");
    L.push("|------|-------|------|");
    for (const c of ds.colors) L.push(`| ${c.name ?? ""} | \`${c.hex}\` | ${c.role ?? ""} |`);
    L.push("");
  }
  if (ds.surfaces?.length) {
    L.push("## Surfaces");
    for (const s of ds.surfaces) L.push(`- \`${s.hex}\` **${s.name ?? "surface"}** (level ${s.level ?? 0}) — ${s.purpose ?? ""}`);
    L.push("");
  }
  if (ds.typography?.length) {
    L.push("## Typography");
    for (const t of ds.typography) {
      L.push(`### ${t.family ?? "Font"}${t.role ? " — " + t.role : ""}`);
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
  if (ds.layout) { L.push("## Layout"); L.push(ds.layout); L.push(""); }
  if (ds.imagery) { L.push("## Imagery"); L.push(ds.imagery); L.push(""); }
  if (ds.components?.length) {
    L.push("## Components");
    for (const c of ds.components) L.push(`- **${c.name}**${c.role ? " (" + c.role + ")" : ""}: ${c.description ?? ""}`);
    L.push("");
  }
  if (ds.dos?.length) { L.push("## Do"); ds.dos.forEach((d) => L.push(`- ${d}`)); L.push(""); }
  if (ds.donts?.length) { L.push("## Don't"); ds.donts.forEach((d) => L.push(`- ${d}`)); L.push(""); }
  return L.join("\n");
}

function cssVarName(name: string, fallback: string): string {
  const base = slugName(name || fallback);
  return `--color-${base || fallback}`;
}

function buildCssVariables(ds: DesignSystem): string {
  const lines = [":root {"];
  for (const c of ds.colors ?? []) lines.push(`  ${cssVarName(c.name ?? "", "brand")}: ${c.hex};`);
  for (const s of ds.surfaces ?? []) lines.push(`  --surface-${slugName(s.name ?? "surface")}: ${s.hex};`);
  if (ds.spacing?.sectionGap) lines.push(`  --section-gap: ${ds.spacing.sectionGap};`);
  if (ds.spacing?.elementGap) lines.push(`  --element-gap: ${ds.spacing.elementGap};`);
  if (ds.spacing?.cardPadding) lines.push(`  --card-padding: ${ds.spacing.cardPadding};`);
  for (const [k, v] of Object.entries(ds.spacing?.radius ?? {})) lines.push(`  --radius-${k}: ${v};`);
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
    color: Object.fromEntries((ds.colors ?? []).map((c) => [slugName(c.name ?? "brand"), { value: c.hex, role: c.role }])),
    surface: Object.fromEntries((ds.surfaces ?? []).map((s) => [slugName(s.name ?? "surface"), { value: s.hex }])),
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
    "Design-system references extracted from real websites — DESIGN.md, Tailwind config, CSS variables, and design tokens. Uses Refero's public API (no subscription required).",
  homepage: "https://styles.refero.design/",
  hasInlineCode: true,

  async listCategories(): Promise<Category[]> {
    // The public feed supports sort variants; expose those as "categories".
    return [
      { id: "featured", label: "Featured" },
      { id: "popular", label: "Popular" },
      { id: "newest", label: "Newest" },
    ];
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const sort = args.category === "popular" || args.category === "newest" ? args.category : "";
    const url = sort ? `${BASE}/api/styles?sort=${sort}` : `${BASE}/api/styles`;
    const payload = await fetchJson<ReferoListItem[] | { styles?: ReferoListItem[] }>(url);
    const items = Array.isArray(payload) ? payload : payload.styles ?? [];
    const q = (args.query || "").toLowerCase();
    const filtered = q
      ? items.filter((i) => `${i.siteName} ${i.url} ${i.industry ?? ""} ${i.northStar ?? ""}`.toLowerCase().includes(q))
      : items;
    return filtered.slice(0, limit).map(toSummary);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    let data: StyleDetail;
    try {
      data = await fetchJson<StyleDetail>(`${BASE}/api/styles/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
    const st = data?.style;
    const ds = st?.fullResult?.designSystem;
    if (!st || !ds) return null;
    const name = st.siteName || st.url;
    const summary = toSummary(st);
    return {
      ...summary,
      license:
        "Design-system data extracted from a public website via Refero. Reference/inspiration only — the source site owns its brand and assets.",
      code: {
        "design.md": buildDesignMd(name, st.url, ds),
        "css": buildCssVariables(ds),
        "tailwind.js": buildTailwind(ds),
        "tokens.json": buildTokens(ds),
      },
      extra: {
        sourceUrl: st.url,
        theme: ds.theme,
        industry: ds.industry,
        similar: (data.similar ?? []).slice(0, 8).map((s) => ({ id: s.id, siteName: s.siteName })),
      },
    };
  },
};
