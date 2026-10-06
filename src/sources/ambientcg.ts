// ambientCG (https://ambientcg.com): CC0 PBR materials, HDRIs, decals, Substance files and 3D
// models from the public ambientCG API v2 (https://docs.ambientcg.com/api/v2/full_json/).
// Search runs on the server (q, category, most popular first); get_resource asks for the same
// asset with its downloads: one zip (Substance: .sbsar) per resolution and format.
// ponytail: the API matches whole tags and needs every query word, so "tile" misses "tiles" and
// "wood floor texture" finds nothing. Upgrade path: retry without the words that match no tag.
import { fetchJson } from "../lib/fetch.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";
import { categorySchema, idSchema } from "../lib/validate.js";

const API = "https://ambientcg.com/api/v2";

interface AcgDownload {
  downloadLink?: string; // counts the download, then redirects to the file
  size?: number;
  filetype?: string; // "zip", "sbsar"
  attribute?: string; // "1K-JPG", "HQ-2K-PNG", "COMPILED"
}
interface AcgAsset {
  assetId: string;
  displayName?: string;
  customDisplayName?: string;
  description?: string;
  dataType?: string; // "Material", "HDRI", "Decal", "3DModel", ...
  dataTypeName?: string;
  creationMethodName?: string;
  displayCategory?: string | null;
  tags?: string[];
  maps?: string[];
  releaseDate?: string;
  previewImage?: Record<string, string>; // "256-PNG" -> URL, ...
  downloadFolders?: Record<
    string,
    { downloadFiletypeCategories?: Record<string, { downloads?: AcgDownload[] }> }
  > | null;
}
interface AcgCategory {
  categoryName?: string; // filter value, e.g. "PavingStones"
  categoryDisplayName?: string;
  numberOfAssets?: number;
}

/** The assets of a full_json reply whose ids are valid tool ids. */
async function findAssets(params: URLSearchParams): Promise<AcgAsset[]> {
  const payload = await fetchJson<{ foundAssets?: AcgAsset[] }>(`${API}/full_json?${params}`);
  return (payload?.foundAssets ?? []).filter((a) => idSchema.safeParse(a?.assetId).success);
}

const titleOf = (a: AcgAsset) => a.customDisplayName || a.displayName || a.assetId;

function summaryOf(a: AcgAsset): ResourceSummary {
  const own = a.assetId.toLowerCase();
  return {
    source: "ambientcg",
    id: a.assetId,
    title: titleOf(a),
    description:
      a.description ||
      [a.dataTypeName, a.creationMethodName].filter(Boolean).join(", ") ||
      undefined,
    category: a.displayCategory ?? undefined,
    url: `https://ambientcg.com/a/${a.assetId}`,
    image: a.previewImage?.["256-PNG"],
    // Drop the tags that only repeat the id ("105", "bricks105").
    tags: a.tags?.filter((t) => !/^\d+$/.test(t) && t !== own),
  };
}

/** 9354813 -> "9.4 MB", 461170 -> "461 KB" */
const fileSize = (bytes: number): string =>
  bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;

function downloadsOf(a: AcgAsset): { label: string; url: string }[] {
  return Object.values(a.downloadFolders ?? {})
    .flatMap((folder) => Object.values(folder?.downloadFiletypeCategories ?? {}))
    .flatMap((group) => group?.downloads ?? [])
    .flatMap((d) => {
      if (!d?.downloadLink?.startsWith("https://")) return [];
      const label = [d.attribute, d.filetype].filter(Boolean).join(" ") || "download";
      return [{ label: d.size ? `${label} (${fileSize(d.size)})` : label, url: d.downloadLink }];
    });
}

export const ambientcg: SourceAdapter = {
  id: "ambientcg",
  label: "ambientCG",
  description:
    "ambientCG — 2,800+ CC0 PBR materials (bricks, wood, metal, tiles, paving, ground, fabric, ...), HDRIs, decals, Substance files and 3D models. Search runs on the ambientCG API (whole-tag keywords, all of them required; most popular first); get_resource returns the zip downloads per resolution and format (1K-JPG to 8K-PNG), the preview image, tags and texture maps. Read from the public ambientCG API v2.",
  homepage: "https://ambientcg.com/",
  hasInlineCode: false,
  stack: ["assets", "3d"],
  idFormat: 'asset id from search_resources, e.g. "PavingStones036"',

  async listCategories(): Promise<Category[]> {
    const cats = await fetchJson<AcgCategory[]>(`${API}/categories_json`);
    return cats.flatMap((c) =>
      categorySchema.safeParse(c?.categoryName).success && c.categoryName
        ? [
            {
              id: c.categoryName,
              label: c.categoryDisplayName || c.categoryName,
              count: c.numberOfAssets,
            },
          ]
        : [],
    );
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const params = new URLSearchParams();
    const q = args.query?.trim();
    if (q) params.set("q", q);
    if (args.category) params.set("category", args.category);
    params.set("sort", "Popular");
    params.set("limit", String(limit));
    return (await findAssets(params)).slice(0, limit).map(summaryOf);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const found = await findAssets(new URLSearchParams({ id, include: "downloadData" }));
    // The id filter ignores case and unknown ids ("bricks105" finds Bricks105).
    const a = found.find((x) => x.assetId.toLowerCase() === id.toLowerCase());
    if (!a) return null;
    return {
      ...summaryOf(a),
      license: "CC0 (ambientCG)",
      downloads: downloadsOf(a),
      extra: {
        dataType: a.dataType,
        creationMethod: a.creationMethodName,
        maps: a.maps,
        releaseDate: a.releaseDate,
        // Optional under CC0; this is the wording ambientCG asks for if you credit it.
        credit: `Created using ${titleOf(a)} from ambientCG.com, licensed under the Creative Commons CC0 1.0 Universal License.`,
      },
    };
  },
};
