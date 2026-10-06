// Fontsource (https://fontsource.org): ~2,100 self-hostable open-source fonts (Google Fonts and
// others) from the public Fontsource API (https://api.fontsource.org; docs:
// https://fontsource.org/docs/api/introduction; read-only, no key, fair use). Search ranks the
// font list (~540 KB, kept for a day) locally; get_resource reads one font's /v1/fonts/<id> and
// turns its files into @font-face rules plus the npm install and import lines.
import { FetchError, fetchJson } from "../lib/fetch.js";
import { memoAsync } from "../lib/memo.js";
import { rankByQuery } from "../lib/search.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";

const API = "https://api.fontsource.org/v1/fonts";
const LIST_TTL_MS = 24 * 60 * 60 * 1000;
/** Fontsource ids: lowercase words joined by single hyphens, e.g. "inter", "fira-code". */
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Upstream values that go into the generated CSS must not be able to break out of it. */
const SAFE_URL = /^https:\/\/[^\s"'()\\]+$/;
const SAFE_RANGE = /^[\sU+0-9A-F?,-]+$/i;
const STYLES = ["normal", "italic"] as const;
/** CSS generic family to fall back on, by Fontsource category (everything else: sans-serif). */
const GENERIC: Record<string, string> = {
  serif: "serif",
  monospace: "monospace",
  handwriting: "cursive",
};

interface Font {
  id: string;
  family: string;
  subsets?: string[];
  weights?: number[];
  styles?: string[];
  defSubset?: string;
  variable?: boolean;
  category?: string;
  license?: string;
}
type Files = { url?: { woff2?: string } };
interface FontDetail extends Font {
  npmVersion?: string;
  unicodeRange?: Record<string, string>;
  /** weight -> style -> subset -> file URLs */
  variants?: Record<string, Partial<Record<string, Record<string, Files>>>>;
}

const loadList = memoAsync(async (): Promise<Font[]> => {
  const list = await fetchJson<Font[]>(API);
  if (!Array.isArray(list)) throw new Error("Fontsource returned no font list");
  return list.filter(
    (f) => typeof f?.id === "string" && ID_RE.test(f.id) && typeof f.family === "string",
  );
}, LIST_TTL_MS);

/** "sans-serif" -> "Sans Serif" */
const labelOf = (category: string) =>
  category.replace(/-/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());

function summaryOf(f: Font): ResourceSummary {
  const facts = [
    f.category,
    f.weights?.length ? `weights ${f.weights.join(", ")}` : undefined,
    f.styles?.join(" and "),
    f.variable ? "variable" : undefined,
  ];
  return {
    source: "fontsource",
    id: f.id,
    title: f.family,
    description: facts.filter(Boolean).join("; "),
    category: f.category,
    url: `https://fontsource.org/fonts/${f.id}`,
    tags: f.subsets,
  };
}

/** One @font-face rule per weight and style of the default subset, woff2 from Fontsource's CDN. */
function cssOf(f: FontDetail, subset: string): string {
  const range = f.unicodeRange?.[subset];
  // Integer-like keys enumerate in ascending order, so the weights come out sorted.
  return Object.entries(f.variants ?? {})
    .flatMap(([weight, styles]) =>
      STYLES.flatMap((style) => {
        const woff2 = styles?.[style]?.[subset]?.url?.woff2;
        if (!/^\d+$/.test(weight) || !woff2 || !SAFE_URL.test(woff2)) return [];
        return [
          [
            `/* ${f.id}-${subset}-${weight}-${style} */`,
            "@font-face {",
            `  font-family: ${JSON.stringify(f.family)};`,
            `  font-style: ${style};`,
            "  font-display: swap;",
            `  font-weight: ${weight};`,
            `  src: url("${woff2}") format("woff2");`,
            ...(range && SAFE_RANGE.test(range) ? [`  unicode-range: ${range};`] : []),
            "}",
          ].join("\n"),
        ];
      }),
    )
    .join("\n\n");
}

/** npm install plus import lines: the variable package when there is one with a normal style,
 *  else one static CSS file per weight and style (italic-only fonts have no default import). */
function installMd(f: FontDetail): { md: string; pkg: string } {
  const variable = !!f.variable && !!f.styles?.includes("normal");
  const pkg = `${variable ? "@fontsource-variable" : "@fontsource"}/${f.id}`;
  const imports = variable
    ? [`import "${pkg}";`]
    : Object.entries(f.variants ?? {}).flatMap(([weight, styles]) =>
        STYLES.filter((s) => styles?.[s]).map(
          (s) => `import "${pkg}/${weight}${s === "italic" ? "-italic" : ""}.css";`,
        ),
      );
  const family = JSON.stringify(variable ? `${f.family} Variable` : f.family);
  const generic = GENERIC[f.category ?? ""] ?? "sans-serif";
  const md = [
    `# ${f.family} (Fontsource)`,
    "",
    "```sh",
    `npm install ${pkg}`,
    "```",
    "",
    "```js",
    ...imports,
    "```",
    "",
    "```css",
    "body {",
    `  font-family: ${family}, ${generic};`,
    "}",
    "```",
    "",
  ].join("\n");
  return { md, pkg };
}

export const fontsource: SourceAdapter = {
  id: "fontsource",
  label: "Fontsource",
  description:
    "Fontsource — ~2,100 open-source fonts (Google Fonts and more) packaged for self-hosting. Categories are sans-serif, serif, display, handwriting, monospace, icons and other; search matches family, id, category and subsets (latin, cyrillic, japanese, ...). get_resource returns @font-face CSS for every weight and style of the default subset (woff2 from Fontsource's CDN, font-display: swap), install.md with the npm package (@fontsource-variable/<id> for variable fonts, else @fontsource/<id>), import lines and font-family, and the font's license. Read from the public Fontsource API.",
  homepage: "https://fontsource.org/",
  hasInlineCode: true,
  stack: ["fonts"],
  idFormat: 'fontsource id, e.g. "inter"',

  async listCategories(): Promise<Category[]> {
    const counts = new Map<string, number>();
    for (const f of await loadList()) {
      if (f.category) counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
    }
    return [...counts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([id, count]) => ({ id, label: labelOf(id), count }));
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const cat = (args.category ?? "").toLowerCase();
    const fonts = (await loadList()).filter((f) => !cat || f.category === cat);
    const fields = (f: Font) => [f.family, f.id, f.category, f.subsets?.join(" ")];
    return rankByQuery(fonts, args.query, fields, limit).map(summaryOf);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    if (!ID_RE.test(id)) return null;
    let f: FontDetail;
    try {
      f = await fetchJson<FontDetail>(`${API}/${id}`);
    } catch (e) {
      if (e instanceof FetchError && e.status === 404) return null; // no font with that id
      throw e;
    }
    if (f?.id !== id || typeof f.family !== "string") return null;
    const subset = f.defSubset ?? "latin";
    const css = cssOf(f, subset);
    const { md, pkg } = installMd(f);
    return {
      ...summaryOf(f),
      license: f.license,
      code: { ...(css ? { css: `${css}\n` } : {}), "install.md": md },
      extra: {
        weights: f.weights,
        styles: f.styles,
        subsets: f.subsets,
        defaultSubset: subset,
        variable: !!f.variable,
        npmPackage: pkg,
        npmVersion: f.npmVersion,
      },
    };
  },
};
