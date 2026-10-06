// Poly Haven (https://polyhaven.com): CC0 HDRIs, PBR textures and 3D models from the public
// Poly Haven API (https://api.polyhaven.com; docs and terms: github.com/Poly-Haven/Public-API).
// Search ranks the three per-type asset lists locally (~2.5 MB together, kept for a day), so the
// source is heavy; get_resource reads one asset's /info and /files. The API terms ask for a
// User-Agent that names the app (fetch.ts sends one) and a visible credit wherever its content
// is shown, so every detail carries extra.credit.
// ponytail: plain word matching over names, tags and categories; the API's semantic /search
// ("couch" finds sofas) is not used. Upgrade path: order the cached lists by its ranked slugs.
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
import { idSchema } from "../lib/validate.js";

const API = "https://api.polyhaven.com";
const LIST_TTL_MS = 24 * 60 * 60 * 1000;
/** Asset types, indexed by an asset's numeric `type` (0 = HDRI, 1 = texture, 2 = model). */
const TYPES = ["hdris", "textures", "models"] as const;
type AssetType = (typeof TYPES)[number];
const LABELS: Record<AssetType, string> = {
  hdris: "HDRIs",
  textures: "Textures",
  models: "Models",
};

interface Asset {
  name?: string;
  type?: number;
  description?: string;
  categories?: string[];
  category?: string; // taxonomy path, e.g. "Decor & Art/Vases & Vessels/Ceramic Vases"
  tags?: string[];
  authors?: Record<string, string>; // name -> what they did: "All", "Photography", ...
  max_resolution?: number[];
  polycount?: number;
  download_count?: number;
  thumbnail_url?: string;
}
interface Listed extends Asset {
  id: string;
}
interface FileRef {
  url?: string;
  size?: number;
  include?: Record<string, FileRef>; // files a .gltf loads, keyed by their path next to it
}
/** /files/<id>: map or bundle -> resolution -> file format -> file (HDRIs: hdri -> 1k -> hdr). */
type Files = Record<string, Record<string, Record<string, FileRef> | undefined> | undefined>;
type Download = { label: string; url: string };

const loadList = (type: AssetType) =>
  memoAsync(async (): Promise<Listed[]> => {
    const all = await fetchJson<Record<string, Asset>>(`${API}/assets?type=${type}`);
    return Object.entries(all)
      .filter(([id, a]) => idSchema.safeParse(id).success && typeof a?.name === "string")
      .map(([id, a]) => ({ ...a, id }));
  }, LIST_TTL_MS);
const lists: Record<AssetType, () => Promise<Listed[]>> = {
  hdris: loadList("hdris"),
  textures: loadList("textures"),
  models: loadList("models"),
};

const pageUrl = (id: string) => `https://polyhaven.com/a/${id}`;

function summaryOf(id: string, a: Asset): ResourceSummary {
  return {
    source: "polyhaven",
    id,
    title: a.name || id,
    description: a.description,
    category: TYPES[a.type ?? -1],
    url: pageUrl(id),
    image: a.thumbnail_url,
    tags: a.tags,
  };
}

/** {"Greg Zaal": "Original", "Jarod Guest": "Sky edits"} -> "Greg Zaal (Original), Jarod ..." */
const authorOf = (authors: Record<string, string> = {}): string | undefined =>
  Object.entries(authors)
    .map(([name, role]) => (/^all$/i.test(role) ? name : `${name} (${role})`))
    .join(", ") || undefined;

/** 1435119 -> "1.4 MB", 2690 -> "3 KB" */
const fileSize = (bytes: number): string =>
  bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;

/** One labeled download, or none when the file is missing or not HTTPS. */
function link(label: string, f: FileRef | undefined): Download[] {
  if (!f?.url?.startsWith("https://")) return [];
  return [{ label: f.size ? `${label} (${fileSize(f.size)})` : label, url: f.url }];
}

const HDRI_RES = ["1k", "2k", "4k"];
const WEB_RES = ["1k", "2k"];
/** Keys of a texture's file tree that are bundles (Blender, glTF, MaterialX, ...), not maps. */
const BUNDLES = new Set(["blend", "gltf", "mtlx", "fbx", "usd"]);

/** Web-sized files: 1k-4k .hdr HDRIs, 1k/2k JPG (else PNG) texture maps, and 1k/2k glTF models
 *  with every file the .gltf loads, labeled with the path it must be saved at. */
function downloadsOf(type: AssetType | undefined, files: Files): Download[] {
  if (type === "hdris") {
    return HDRI_RES.flatMap((r) => link(`HDRI ${r} .hdr`, files.hdri?.[r]?.hdr));
  }
  if (type === "models") {
    return WEB_RES.flatMap((r) => {
      const gltf = files.gltf?.[r]?.gltf;
      const deps = Object.entries(gltf?.include ?? {});
      return [...link(`glTF ${r}`, gltf), ...deps.flatMap(([p, f]) => link(`glTF ${r}: ${p}`, f))];
    });
  }
  if (type !== "textures") return [];
  return Object.entries(files)
    .filter(([key]) => !BUNDLES.has(key))
    .flatMap(([map, byRes]) =>
      WEB_RES.flatMap((r) => {
        const f = byRes?.[r];
        return f?.jpg ? link(`${map} ${r} JPG`, f.jpg) : link(`${map} ${r} PNG`, f?.png);
      }),
    );
}

export const polyhaven: SourceAdapter = {
  id: "polyhaven",
  label: "Poly Haven",
  description:
    "Poly Haven — 2,300+ CC0 HDRIs (sky, studio and interior lighting), PBR textures (brick, wood, rock, metal, fabric, ...) and 3D models for three.js and other 3D scenes. Search ranks the asset lists by name, tags and categories, most downloaded first; get_resource returns web-sized download links (1k-4k .hdr HDRIs, 1k/2k JPG texture maps — nor_gl is the OpenGL normal map three.js expects — and 1k/2k glTF models with the files they load), the preview image, authors and a 'Powered by Poly Haven' credit line. Read from the public Poly Haven API.",
  homepage: "https://polyhaven.com/",
  hasInlineCode: false,
  stack: ["assets", "3d"],
  idFormat: 'asset slug from search_resources, e.g. "brown_planks_03"',
  heavy: true, // a cold search downloads ~2.5 MB of asset lists

  async listCategories(): Promise<Category[]> {
    return TYPES.map((id) => ({ id, label: LABELS[id] }));
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const cat = (args.category ?? "").toLowerCase();
    const types = cat ? TYPES.filter((t) => t === cat) : TYPES;
    // Most downloaded first, so a search without a query starts with the staples.
    const assets = (await Promise.all(types.map((t) => lists[t]())))
      .flat()
      .sort((a, b) => (b.download_count ?? 0) - (a.download_count ?? 0));
    const fields = (a: Listed) => [
      a.name,
      a.id,
      a.tags?.join(" "),
      [...(a.categories ?? []), a.category].join(" "),
      a.description,
    ];
    return rankByQuery(assets, args.query, fields, limit).map((a) => summaryOf(a.id, a));
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const key = encodeURIComponent(id);
    let info: Asset;
    let files: Files;
    try {
      info = await fetchJson<Asset>(`${API}/info/${key}`);
      files = await fetchJson<Files>(`${API}/files/${key}`);
    } catch (e) {
      if (e instanceof FetchError && e.status === 404) return null; // no asset with that id
      throw e;
    }
    if (typeof info?.name !== "string") return null;
    return {
      ...summaryOf(id, info),
      license: "CC0 (Poly Haven)",
      author: authorOf(info.authors),
      downloads: downloadsOf(TYPES[info.type ?? -1], files ?? {}),
      extra: {
        category: info.category,
        categories: info.categories,
        maxResolution: info.max_resolution,
        polycount: info.polycount,
        credit: `Powered by Poly Haven: ${pageUrl(id)}`,
      },
    };
  },
};
