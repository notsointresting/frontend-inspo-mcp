// ls.graphics adapter — free design mockups (PSD/Figma/Sketch), server-rendered HTML.
// Listing: https://www.ls.graphics/free-mockups  (cards link to /assets/<slug>)
// Detail:  https://www.ls.graphics/assets/<slug>
import * as cheerio from "cheerio";
import { fetchText } from "../lib/fetch.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";

const BASE = "https://www.ls.graphics";
const LISTING = `${BASE}/free-mockups`;

// Known free-mockup sub-collections (from the listing nav). Used for list_categories.
const CATEGORIES: Category[] = [
  { id: "free-mockups", label: "All Free Mockups" },
  { id: "devices-mockups", label: "Devices" },
  { id: "branding-mockups", label: "Branding" },
  { id: "packages-mockups", label: "Packages" },
  { id: "billboard-mockups", label: "Billboard" },
  { id: "animated-mockups", label: "Animated" },
  { id: "apple-mockups", label: "Apple" },
];

function absUrl(href: string): string {
  return href.startsWith("http") ? href : `${BASE}${href}`;
}

/** Parse asset cards from a listing page. */
function parseListing(html: string): ResourceSummary[] {
  const $ = cheerio.load(html);
  const out: ResourceSummary[] = [];
  const seen = new Set<string>();

  $('a[href^="/assets/"]').each((_, a) => {
    const $a = $(a);
    const href = $a.attr("href") || "";
    const slug = href.replace("/assets/", "").replace(/\/+$/, "");
    if (!slug || seen.has(slug)) return;
    const img = $a.find("img").first();
    const title =
      (img.attr("alt") || "").trim() ||
      $a.text().trim() ||
      slug.replace(/-/g, " ");
    // Next.js images may use data-src or srcset; fall back gracefully.
    const image =
      img.attr("src") || img.attr("data-src") || undefined;
    seen.add(slug);
    out.push({
      source: "lsgraphics",
      id: slug,
      title,
      url: absUrl(href),
      image: image && !image.startsWith("data:") ? absUrl(image) : undefined,
    });
  });

  return out;
}

export const lsgraphics: SourceAdapter = {
  id: "lsgraphics",
  label: "LS.GRAPHICS",
  description:
    "Free high-quality design mockups in PSD, Figma, and Sketch formats.",
  homepage: "https://www.ls.graphics/free-mockups",
  hasInlineCode: false,

  async listCategories(): Promise<Category[]> {
    return CATEGORIES;
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const cat = args.category && args.category !== "free-mockups"
      ? args.category
      : "free-mockups";
    const url = cat === "free-mockups" ? LISTING : `${BASE}/${cat}`;
    let html: string;
    try {
      html = await fetchText(url);
    } catch {
      html = await fetchText(LISTING); // fall back to the main free listing
    }
    let items = parseListing(html);
    const q = (args.query || "").toLowerCase();
    if (q) {
      items = items.filter((i) => i.title.toLowerCase().includes(q));
    }
    return items.slice(0, limit);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const url = `${BASE}/assets/${id}`;
    let html: string;
    try {
      html = await fetchText(url);
    } catch {
      return null;
    }
    const $ = cheerio.load(html);
    const title =
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      id.replace(/-/g, " ");
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      undefined;
    const image = $('meta[property="og:image"]').attr("content") || undefined;

    // Collect download links and infer formats.
    const downloads: { label: string; url: string }[] = [];
    const formats = new Set<string>();
    $("a[href]").each((_, a) => {
      const href = $(a).attr("href") || "";
      const text = $(a).text().trim();
      const hay = `${href} ${text}`.toLowerCase();
      if (/download|\.zip|\.psd|\.fig|\.sketch|dropbox|figma|drive\.google/.test(hay)) {
        downloads.push({ label: text || "Download", url: absUrl(href) });
      }
      for (const f of ["figma", "sketch", "psd", "photoshop", "xd", "blender"]) {
        if (hay.includes(f)) formats.add(f === "photoshop" ? "psd" : f);
      }
    });

    return {
      source: "lsgraphics",
      id,
      title,
      description,
      url,
      image,
      formats: formats.size ? [...formats] : undefined,
      downloads: downloads.length ? dedupeDownloads(downloads) : undefined,
      license: "Free for personal and commercial use — verify on the asset page.",
    };
  },
};

function dedupeDownloads(
  d: { label: string; url: string }[],
): { label: string; url: string }[] {
  const seen = new Set<string>();
  return d.filter((x) => {
    if (seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}
