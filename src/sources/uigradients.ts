// uiGradients (https://uigradients.com): ~380 named CSS linear gradients, read from the
// gradients.json at the root of the ghosh/uiGradients repo (MIT, © 2017 Indrashish Ghosh). The
// file is ~32 KB, parsed once and kept for a day; search ranks it locally by name and colors.
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

const DATA_URL = "https://raw.githubusercontent.com/ghosh/uiGradients/main/gradients.json";
const DATA_TTL_MS = 24 * 60 * 60 * 1000;
/** Only hex colors go into the generated CSS, so upstream text cannot break out of it. */
const HEX = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;

interface Gradient {
  id: string;
  name: string;
  colors: string[];
}

/** "Ed's Sunset Gradient" -> "eds-sunset-gradient", "Black Rosé" -> "black-rose" */
const slugOf = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const loadGradients = memoAsync(async (): Promise<Gradient[]> => {
  const data = await fetchJson<{ name?: unknown; colors?: unknown }[]>(DATA_URL);
  if (!Array.isArray(data)) throw new Error("uiGradients returned no gradient list");
  const seen = new Set<string>();
  const out: Gradient[] = [];
  for (const g of data) {
    if (typeof g?.name !== "string" || !Array.isArray(g.colors)) continue;
    const colors = g.colors.filter((c): c is string => typeof c === "string" && HEX.test(c));
    const id = slugOf(g.name);
    // Skip nameless and duplicate slugs, and gradients with a color that is not plain hex.
    if (!id || seen.has(id) || colors.length < 2 || colors.length !== g.colors.length) continue;
    seen.add(id);
    out.push({ id, name: g.name.trim(), colors });
  }
  return out;
}, DATA_TTL_MS);

function summaryOf(g: Gradient): ResourceSummary {
  return {
    source: "uigradients",
    id: g.id,
    title: g.name,
    description: g.colors.join(" → "),
    // The site selects a gradient by its name without whitespace in the URL hash.
    url: `https://uigradients.com/#${g.name.replace(/\s/g, "")}`,
  };
}

export const uigradients: SourceAdapter = {
  id: "uigradients",
  label: "uiGradients",
  description:
    'uiGradients — ~380 named CSS linear gradients (two to six hex colors each) for backgrounds, heroes and buttons. Search matches gradient names and hex colors (e.g. "sunset", "#2F80ED"); there are no categories. get_resource returns a ready-to-paste `background: linear-gradient(to right, ...)` declaration (colors in the order the site shows them) and the gradient\'s name and colors as JSON. Read from the uiGradients GitHub repository.',
  homepage: "https://uigradients.com/",
  hasInlineCode: true,
  stack: ["design-tokens", "css"],
  idFormat: 'gradient slug, e.g. "purple-bliss"',

  async listCategories(): Promise<Category[]> {
    return [];
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    if (args.category) return []; // the data has no categories
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    // The slug too, so ASCII queries find accented names: "rose" finds "Black Rosé".
    const fields = (g: Gradient) => [g.name, g.id, g.colors.join(" ")];
    return rankByQuery(await loadGradients(), args.query, fields, limit).map(summaryOf);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const g = (await loadGradients()).find((x) => x.id === id);
    if (!g) return null;
    return {
      ...summaryOf(g),
      license: "MIT",
      author: "Indrashish Ghosh (uiGradients)",
      code: {
        css: `background: linear-gradient(to right, ${g.colors.join(", ")});\n`,
        json: `${JSON.stringify({ name: g.name, colors: g.colors }, null, 2)}\n`,
      },
    };
  },
};
