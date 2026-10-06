// tweakcn theme presets (https://tweakcn.com): shadcn/ui themes published as registry:style
// items. They carry cssVars {theme, light, dark} and a few css rules instead of files, so the
// registry factory (which drops styles and reads files) does not fit. getResource turns a theme
// into the stylesheet a Tailwind v4 shadcn project uses, plus the raw tokens as JSON.
import { fetchJson, isTransient } from "../lib/fetch.js";
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

const HOMEPAGE = "https://tweakcn.com/";
const INDEX_URL = "https://tweakcn.com/r/registry.json";
const themeUrl = (name: string) => `https://tweakcn.com/r/themes/${name}.json`;
/** Re-read the preset list hourly, like the registry indexes. */
const INDEX_TTL_MS = 60 * 60 * 1000;

/** Nested CSS as the registry schema writes it: "property": "value" or "selector": {...}. */
interface CssTree {
  [key: string]: string | CssTree;
}
type Vars = Record<string, string>;
interface Theme {
  name: string;
  title?: string;
  description?: string;
  css?: CssTree;
  cssVars?: { theme?: Vars; light?: Vars; dark?: Vars };
}

const loadIndex = memoAsync(async (): Promise<Theme[]> => {
  const payload = await fetchJson<{ items?: Theme[] }>(INDEX_URL);
  return (payload?.items ?? []).filter((t) => idSchema.safeParse(t?.name).success);
}, INDEX_TTL_MS);

/** CSS text for a tree: strings become declarations, objects blocks (empty ones are left out). */
function cssText(tree: CssTree, indent = ""): string {
  return Object.entries(tree)
    .filter(([, v]) => typeof v === "string" || Object.keys(v).length > 0)
    .map(([k, v]) =>
      typeof v === "string"
        ? `${indent}${k}: ${v};`
        : `${indent}${k} {\n${cssText(v, `${indent}  `)}\n${indent}}`,
    )
    .join(indent ? "\n" : "\n\n");
}

/** {background: "x"} -> {"--background": "x"} */
const customProps = (vars: Vars = {}): CssTree =>
  Object.fromEntries(Object.entries(vars).map(([k, v]) => [`--${k}`, v]));

/** The theme as Tailwind v4 CSS laid out like shadcn's globals.css: the light variables on :root,
 *  the dark ones on .dark, the theme variables in @theme inline, then the theme's own rules.
 *  ponytail: @theme inline gets only the theme's own variables, not the
 *  --color-<name>: var(--<name>) mappings that `shadcn init` already writes; add them here if
 *  themes have to work in projects without shadcn's base CSS. */
function themeCss(t: Theme): string {
  const v = t.cssVars ?? {};
  const vars = cssText({
    ":root": customProps(v.light),
    ".dark": customProps(v.dark),
    "@theme inline": customProps(v.theme),
  });
  return `${[vars, cssText(t.css ?? {})].filter(Boolean).join("\n\n")}\n`;
}

function summaryOf(t: Theme): ResourceSummary {
  return {
    source: "tweakcn",
    id: t.name,
    title: t.title || t.name,
    description: t.description,
    category: "theme",
    url: HOMEPAGE,
    tags: ["registry:style"],
  };
}

export const tweakcn: SourceAdapter = {
  id: "tweakcn",
  label: "tweakcn",
  description:
    "shadcn/ui theme presets (OKLCH colors, fonts, radius, shadows) as Tailwind v4 CSS variables plus a tokens JSON. Returns real CSS from tweakcn.com.",
  homepage: HOMEPAGE,
  hasInlineCode: true,
  stack: ["design-tokens", "tailwind"],
  idFormat: 'theme name from search_resources, e.g. "modern-minimal"',

  async listCategories(): Promise<Category[]> {
    return [{ id: "theme", label: "theme", count: (await loadIndex()).length }];
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    if (args.category && args.category.toLowerCase() !== "theme") return [];
    const fields = (t: Theme) => [t.title || t.name, t.name, t.description];
    return rankByQuery(await loadIndex(), args.query, fields, limit).map(summaryOf);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const registryUrl = themeUrl(id);
    let theme: Theme;
    try {
      theme = await fetchJson<Theme>(registryUrl);
    } catch (e) {
      if (isTransient(e)) throw e; // keep rate limits/network errors visible
      return null; // tweakcn answers an unknown theme with HTTP 500
    }
    if (!theme?.cssVars) return null;
    // The theme file has no title or description; the index has them.
    const listed = (await loadIndex().catch((): Theme[] => [])).find((t) => t.name === id);
    return {
      ...summaryOf(listed ?? { name: id }),
      license: "Apache-2.0",
      code: {
        css: themeCss(theme),
        "tokens.json": `${JSON.stringify(theme.cssVars, null, 2)}\n`,
      },
      extra: { install: `npx shadcn@latest add ${registryUrl}`, registryUrl },
    };
  },
};
