// freefrontend.com adapter — server-rendered HTML, parsed with cheerio.
// Each collection page lists <article class="snippet-card"> items, 20/page,
// paginated at /<collection>/page/N/. Inline code lives base64-encoded in
// <pre ... data-original="..." data-lang="css|html|js"> elements.
import * as cheerio from "cheerio";
import { decodeBase64, fetchText } from "../lib/fetch.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";

const BASE = "https://freefrontend.com";

// Top-level categories (stable). Sub-collections are discovered from these pages.
const TOP_CATEGORIES: Category[] = [
  { id: "html-code-examples", label: "HTML" },
  { id: "css-code-examples", label: "CSS" },
  { id: "javascript-code-examples", label: "JavaScript" },
  { id: "bootstrap-code-examples", label: "Bootstrap" },
  { id: "tailwind-code-examples", label: "Tailwind CSS" },
];

const collectionSlug = (url: string): string =>
  url.replace(BASE, "").replace(/^\/+|\/+$/g, "").split("/")[0];

/** Parse the snippet cards on a single collection page. */
function parseCards(html: string, collection: string): ResourceDetail[] {
  const $ = cheerio.load(html);
  const out: ResourceDetail[] = [];

  $("article.snippet-card").each((_, el) => {
    const $el = $(el);
    const title = $el.find(".card-header h3").first().text().trim();
    if (!title) return;

    const popoverId = $el.find("button.demo").attr("popovertarget") || "";
    const id = popoverId || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const image = $el.find("> img").attr("src");
    const description = $el.find(".card-content p").first().text().trim();

    const tags: string[] = [];
    $el.find(".meta-row").each((_, row) => {
      const label = $(row).find(".meta-label").text().trim();
      if (/Technologies|Features/i.test(label)) {
        $(row)
          .find(".meta-value")
          .each((_, v) => {
            const t = $(v).text().trim();
            if (t) tags.push(t);
          });
      }
    });

    const license = $el
      .find(".meta-row:contains('License') .meta-value")
      .first()
      .text()
      .trim();
    const author = $el
      .find(".meta-row:contains('Code by') .author-name-link")
      .first()
      .text()
      .trim();

    // Inline code: decode every <pre data-original> in this card.
    const code: Record<string, string> = {};
    $el.find("pre.code-editor[data-original]").each((_, pre) => {
      const b64 = $(pre).attr("data-original");
      const lang = ($(pre).attr("data-lang") || "code").toLowerCase();
      if (b64) {
        try {
          code[lang] = decodeBase64(b64);
        } catch {
          /* skip undecodable */
        }
      }
    });

    const aiPrompt = $el
      .find("textarea[id^='prompt-']")
      .first()
      .text()
      .trim();

    out.push({
      source: "freefrontend",
      id,
      title,
      description: description || undefined,
      category: collection,
      url: `${BASE}/${collection}/`,
      image: image ? (image.startsWith("http") ? image : `${BASE}${image}`) : undefined,
      tags: tags.length ? tags : undefined,
      license: license || undefined,
      author: author || undefined,
      code: Object.keys(code).length ? code : undefined,
      aiPrompt: aiPrompt || undefined,
    });
  });

  return out;
}

/** Fetch cards across pages until `limit` reached or a page repeats/empties. */
async function fetchCollection(
  collection: string,
  limit: number,
): Promise<ResourceDetail[]> {
  const all: ResourceDetail[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 25 && all.length < limit; page++) {
    const url =
      page === 1
        ? `${BASE}/${collection}/`
        : `${BASE}/${collection}/page/${page}/`;
    let html: string;
    try {
      html = await fetchText(url);
    } catch {
      break; // 404 / network — no more pages
    }
    const cards = parseCards(html, collection);
    if (cards.length === 0) break;
    let added = 0;
    for (const c of cards) {
      if (seen.has(c.id)) continue; // dedupe across pages
      seen.add(c.id);
      all.push(c);
      added++;
    }
    if (added === 0) break; // page repeated content — stop
  }
  return all.slice(0, limit);
}

export const freefrontend: SourceAdapter = {
  id: "freefrontend",
  label: "FreeFrontend",
  description:
    "Free HTML, CSS, JavaScript, Bootstrap, and Tailwind code snippets with inline source and per-item licenses.",
  homepage: "https://freefrontend.com/",
  hasInlineCode: true,

  async listCategories(): Promise<Category[]> {
    // Discover sub-collections from each top category page.
    const cats: Category[] = [...TOP_CATEGORIES];
    for (const top of TOP_CATEGORIES) {
      try {
        const html = await fetchText(`${BASE}/${top.id}/`);
        const $ = cheerio.load(html);
        const seen = new Set<string>();
        $("main a[href]").each((_, a) => {
          const href = $(a).attr("href") || "";
          if (!href.includes("freefrontend.com") && !href.startsWith("/")) return;
          const abs = href.startsWith("http") ? href : `${BASE}${href}`;
          if (abs.includes("#")) return;
          const slug = collectionSlug(abs);
          // sub-collections look like /css-hover-effects/, /js-... etc.
          if (!slug || TOP_CATEGORIES.some((t) => t.id === slug)) return;
          if (!/-/.test(slug)) return;
          if (seen.has(slug)) return;
          seen.add(slug);
          cats.push({
            id: slug,
            label: $(a).text().trim() || slug,
            parent: top.id,
          });
        });
      } catch {
        /* skip a failing top category */
      }
    }
    return cats;
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    // Determine which collection(s) to read.
    let collections: string[];
    if (args.category) {
      collections = [args.category];
    } else if (args.tech) {
      const t = args.tech.toLowerCase();
      // Map a tech hint to a representative *listing* collection (not the
      // top-level landing pages, which only link out to sub-collections).
      const map: Record<string, string> = {
        html: "html-dialog",
        css: "css-hover-effects",
        js: "javascript-animations",
        javascript: "javascript-animations",
        bootstrap: "bootstrap-cards",
        tailwind: "tailwind-buttons",
      };
      collections = [map[t] ?? "css-hover-effects"];
    } else {
      collections = ["css-hover-effects"]; // sensible default listing
    }

    const q = (args.query || "").toLowerCase();
    const results: ResourceSummary[] = [];
    for (const col of collections) {
      const cards = await fetchCollection(col, q ? limit * 3 : limit);
      for (const c of cards) {
        if (
          q &&
          !`${c.title} ${c.description ?? ""} ${(c.tags ?? []).join(" ")}`
            .toLowerCase()
            .includes(q)
        ) {
          continue;
        }
        // strip heavy fields from summary
        const { code, aiPrompt, ...summary } = c;
        results.push(summary);
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }
    return results;
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    // id is a snippet popover id, e.g. 2026-07-23-diagonal-illusion-...
    // The date prefix isn't enough to locate its collection, so callers should
    // pass "collection::id". Support both forms.
    let collection = "css-hover-effects";
    let snippetId = id;
    if (id.includes("::")) {
      [collection, snippetId] = id.split("::");
    }
    const cards = await fetchCollection(collection, 100);
    return cards.find((c) => c.id === snippetId) ?? null;
  },
};
