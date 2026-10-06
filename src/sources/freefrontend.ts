// freefrontend.com adapter — server-rendered HTML, parsed with cheerio.
// Each collection page lists <article class="snippet-card"> items, 20/page,
// paginated at /<collection>/page/N/. Inline code lives base64-encoded in
// <pre ... data-original="..." data-lang="css|html|js"> elements.
// Collections are discovered from /sitemap.xml: its one-segment pages are collections
// (/css-hover-effects/, /gsap-js/, ...), except the top categories (/css-code-examples/:
// landing pages without cards) and a few info pages; item pages live under /code/<slug>/.
// robots.txt disallows every URL with a query string, so none is ever built.
import * as cheerio from "cheerio";
import { decodeBase64, fetchText } from "../lib/fetch.js";
import { memoAsync } from "../lib/memo.js";
import { matchScore, queryTokens, rankByQuery } from "../lib/search.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";
import { idSchema } from "../lib/validate.js";

const BASE = "https://freefrontend.com";

// Top-level categories (stable). Sub-collections are discovered from the sitemap.
const TOP_CATEGORIES: Category[] = [
  { id: "html-code-examples", label: "HTML" },
  { id: "css-code-examples", label: "CSS" },
  { id: "javascript-code-examples", label: "JavaScript" },
  { id: "bootstrap-code-examples", label: "Bootstrap" },
  { id: "tailwind-code-examples", label: "Tailwind CSS" },
];

/** A representative listing collection per tech hint, read when the query names none. */
const DEFAULT_COLLECTION = new Map([
  ["html", "html-dialog"],
  ["css", "css-hover-effects"],
  ["js", "javascript-animations"],
  ["javascript", "javascript-animations"],
  ["bootstrap", "bootstrap-cards"],
  ["tailwind", "tailwind-buttons"],
]);

/** One-segment sitemap pages that are neither collections nor top categories. */
const INFO_PAGES = new Set(["about-me", "privacy-policy", "cookies-policy"]);
/** The sitemap is re-read after 6 hours, so a long session sees new collections. */
const SITEMAP_TTL_MS = 6 * 60 * 60 * 1000;

/** Collection slugs from the sitemap, in sitemap order. Throws if it lists none. */
const collectionSlugs = memoAsync(async (): Promise<string[]> => {
  const xml = await fetchText(`${BASE}/sitemap.xml`);
  const slugs = new Set<string>();
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    let u: URL;
    try {
      u = new URL(m[1] ?? "");
    } catch {
      continue;
    }
    if (u.hostname !== "freefrontend.com" && u.hostname !== "www.freefrontend.com") continue;
    const slug = /^\/([^/]+)\/?$/.exec(u.pathname)?.[1];
    if (!slug || slug.endsWith("-code-examples") || INFO_PAGES.has(slug)) continue;
    if (idSchema.safeParse(slug).success) slugs.add(slug); // also a valid "<slug>::<id>" prefix
  }
  if (!slugs.size) {
    throw new Error("freefrontend: no collections in sitemap.xml (format changed?)");
  }
  return [...slugs];
}, SITEMAP_TTL_MS);

/** "css-hover-effects" -> "css-code-examples": the top category its prefix names, if any. */
const parentOf = (slug: string): string | undefined =>
  TOP_CATEGORIES.find((t) => slug.startsWith(t.id.replace(/code-examples$/, "")))?.id;

/**
 * Up to 3 collections whose slug words best match the query: most query words matched, then
 * whole words, then the most general collection (fewest words). With a tech hint its own
 * collections (css-, javascript-/js-, html-, bootstrap-, tailwind-, ...) come first. Without
 * a query, or when no slug matches, the tech's default listing.
 * ponytail: slug words only, so a synonym misses ("navbar" finds tailwind-navbars but not
 * css-menu), and a search reads at most 3 collections. Upgrade path: a small synonym map.
 */
async function pickCollections(query: string | undefined, tech: string | undefined) {
  const fallback = [DEFAULT_COLLECTION.get(tech ?? "") ?? "css-hover-effects"];
  const tokens = queryTokens(query);
  if (!tokens.length) return fallback;
  const js = tech === "js" || tech === "javascript";
  const prefixes = js ? ["javascript-", "js-"] : tech ? [`${tech}-`] : [];
  const ranked = (await collectionSlugs())
    .map((slug, i) => {
      const words = queryTokens(slug).join(" "); // plural-stripped like the query words
      const scores = tokens.map((t) => matchScore(t, [words]));
      return {
        slug,
        i,
        preferred: prefixes.some((p) => slug.startsWith(p)) ? 1 : 0,
        hits: scores.filter((s) => s > 0).length,
        score: scores.reduce((a, b) => a + b, 0),
        size: words.split(" ").length,
      };
    })
    .filter((c) => c.hits > 0)
    .sort(
      (a, b) =>
        b.preferred - a.preferred ||
        b.hits - a.hits ||
        b.score - a.score ||
        a.size - b.size ||
        a.i - b.i,
    );
  return ranked.length ? ranked.slice(0, 3).map((c) => c.slug) : fallback;
}

/** Parse the snippet cards on a single collection page. */
function parseCards(html: string, collection: string): ResourceDetail[] {
  const $ = cheerio.load(html);
  const out: ResourceDetail[] = [];

  $("article.snippet-card").each((_, el) => {
    const $el = $(el);
    const title = $el.find(".card-title").first().text().replace(/\s+/g, " ").trim();
    if (!title) return;

    // The preview/code popover is a *sibling* of the card, keyed by this id.
    const rawPopover =
      $el.find(".card-media-wrapper").attr("popovertarget") ||
      $el.find("button.btn-card-demo-cta").attr("popovertarget") ||
      "";
    // Guard: this id is interpolated into a cheerio selector below. A stray quote in the
    // upstream HTML would throw and fail the whole collection, so only accept id chars.
    const popoverId = /^[\w:-]+$/.test(rawPopover) ? rawPopover : "";
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
    "Free HTML, CSS, JavaScript, Bootstrap, and Tailwind code snippets with inline source and per-item licenses. A query reads the (up to) 3 of its ~900 collections whose names match it best; a category reads just that collection.",
  homepage: "https://freefrontend.com/",
  hasInlineCode: true,
  stack: ["html", "css", "javascript", "tailwind"],
  idFormat: "collection::snippetId from search_resources (preferred), or the bare snippetId",

  async listCategories(): Promise<Category[]> {
    const slugs = await collectionSlugs();
    return [
      ...TOP_CATEGORIES,
      ...slugs.map((id) => ({ id, label: id.replace(/-/g, " "), parent: parentOf(id) })),
    ];
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    // A top category is a landing page without cards: read it as the tech hint it names.
    const top = TOP_CATEGORIES.find((t) => t.id === args.category);
    const tech = (top?.id.replace(/-code-examples$/, "") ?? args.tech)?.toLowerCase();
    const collections =
      args.category && !top ? [args.category] : await pickCollections(args.query, tech);
    const want = queryTokens(args.query).length ? limit * 3 : limit;
    // A collection that fails is skipped, unless every one does.
    const settled = await Promise.allSettled(collections.map((c) => fetchCollection(c, want)));
    const failure = settled.find((s) => s.status === "rejected");
    if (failure && settled.every((s) => s.status === "rejected")) throw failure.reason;
    // A snippet can sit in several collections: keep its first (best-matching) one.
    const unique = new Map<string, ResourceDetail>();
    for (const c of settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []))) {
      if (!unique.has(c.id)) unique.set(c.id, c);
    }
    const fields = (c: ResourceDetail) => [
      c.title,
      c.id,
      c.description,
      c.tags?.join(" "),
      c.category,
    ];
    // strip heavy fields from summaries
    return rankByQuery([...unique.values()], args.query, fields, limit).map(
      ({ code, aiPrompt, ...summary }) => summary,
    );
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
    // (e.g. "2026-07-23-diagonal-illusion-pattern-in-pure-css"), so let the picker search uses
    // choose likely collections from those words, then scan them.
    const words = id.replace(/^\d{4}-\d{2}-\d{2}-/, ""); // drop date prefix
    const candidates = new Set(await pickCollections(words, undefined));
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
