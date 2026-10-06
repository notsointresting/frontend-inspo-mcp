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

/** Parse the snippet cards on a single collection page. */
function parseCards(html: string, collection: string): ResourceDetail[] {
  const $ = cheerio.load(html);
  const out: ResourceDetail[] = [];

  $("article.snippet-card").each((_, el) => {
    const $el = $(el);
    const title = $el.find(".card-title").first().text().replace(/\s+/g, " ").trim();
    if (!title) return;

    // The preview/code popover is a *sibling* of the card, keyed by this id.
    const popoverId =
      $el.find(".card-media-wrapper").attr("popovertarget") ||
      $el.find("button.btn-card-demo-cta").attr("popovertarget") ||
      "";
    const id = popoverId || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const popover = popoverId ? $(`[id="${popoverId}"]`) : $();

    const image = $el.find(".card-media-wrapper > img").attr("src");
    const description = $el.find(".card-description p").first().text().trim();

    const tags: string[] = [];
    $el.find(".meta-tech").each((_, t) => {
      const v = $(t).text().trim();
      if (v) tags.push(v);
    });
    $el.find(".readout-row").each((_, row) => {
      if (/Features/i.test($(row).find("dt").text())) {
        for (const v of $(row).find("dd").text().split("·")) {
          if (v.trim()) tags.push(v.trim());
        }
      }
    });

    const author = $el.find(".author-link").first().text().trim();

    // Inline code: decode every <pre data-original> in the popover. Only some
    // cards ship it; the rest are CodePen embeds with no inline source.
    const code: Record<string, string> = {};
    popover.find("pre.code-editor[data-original]").each((_, pre) => {
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

    const aiPrompt = popoverId ? $(`textarea[id="prompt-${popoverId}"]`).first().text().trim() : "";

    out.push({
      source: "freefrontend",
      id,
      title,
      description: description || undefined,
      category: collection,
      url: `${BASE}/${collection}/`,
      image: image ? (image.startsWith("http") ? image : `${BASE}${image}`) : undefined,
      tags: tags.length ? tags : undefined,
      author: author || undefined,
      code: Object.keys(code).length ? code : undefined,
      aiPrompt: aiPrompt || undefined,
    });
  });
  return out;
}

/** Fetch cards across pages until `limit` reached or a page repeats/empties. */
async function fetchCollection(collection: string, limit: number): Promise<ResourceDetail[]> {
  const all: ResourceDetail[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 25 && all.length < limit; page++) {
    const url = page === 1 ? `${BASE}/${collection}/` : `${BASE}/${collection}/page/${page}/`;
    let html: string;
    try {
      html = await fetchText(url);
    } catch (e) {
      if (page === 1) throw e; // a failing first page is an error, not "0 results"
      break; // later pages: 404 means no more pages
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
          // Resolve against BASE and compare the parsed host; a substring test would
          // also accept e.g. https://evil.example/freefrontend.com.
          let u: URL;
          try {
            u = new URL(href, BASE);
          } catch {
            return;
          }
          if (u.hostname !== "freefrontend.com" && u.hostname !== "www.freefrontend.com") return;
          if (u.hash) return;
          const slug = u.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
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
          !`${c.title} ${c.description ?? ""} ${(c.tags ?? []).join(" ")}`.toLowerCase().includes(q)
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
    // Preferred form: "collection::snippetId" (exact + fast).
    if (id.includes("::")) {
      const [collection, snippetId] = id.split("::");
      if (!collection) return null;
      const cards = await fetchCollection(collection, 100);
      return cards.find((c) => c.id === snippetId) ?? null;
    }

    // id-only resolution: the snippet id encodes descriptive words
    // (e.g. "2026-07-23-diagonal-illusion-pattern-in-pure-css"), so infer a
    // short list of likely collections from those words, then scan them.
    const slug = id.replace(/^\d{4}-\d{2}-\d{2}-/, ""); // drop date prefix
    const candidates = new Set<string>();
    // tech-based defaults
    if (/tailwind/.test(slug)) candidates.add("tailwind-buttons");
    if (/bootstrap/.test(slug)) candidates.add("bootstrap-cards");
    // feature-word -> collection guesses (cheap, high hit-rate)
    const wordMap: Record<string, string> = {
      hover: "css-hover-effects",
      glow: "css-glow-effects",
      neon: "css-neon-effects",
      glitch: "css-glitch-effects",
      button: "css-buttons",
      card: "css-cards",
      loader: "css-loaders",
      spinner: "css-loaders",
      accordion: "css-accordions",
      gallery: "css-galleries",
      grid: "css-grid-layouts",
      animation: "css-animations",
      illusion: "css-optical-illusions",
      gradient: "css-gradients",
      form: "css-forms",
    };
    for (const [word, col] of Object.entries(wordMap)) {
      if (slug.includes(word)) candidates.add(col);
    }
    // always include the most populated general collections as a safety net
    candidates.add("css-hover-effects");
    candidates.add("css-animations");

    for (const collection of candidates) {
      try {
        const cards = await fetchCollection(collection, 100);
        const hit = cards.find((c) => c.id === id);
        if (hit) return hit;
      } catch {
        /* skip a collection that 404s */
      }
    }
    return null;
  },
};
