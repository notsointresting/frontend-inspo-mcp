// ThreeUI (Community) adapter — MengTo/threeui open-source catalog of live,
// interactive Three.js/WebGL components. The repo ships one big manifest
// (public/source-code.json) that contains every Community component's inline
// source in `components[].files[].code`, plus `sharedFiles[]`.
// ponytail: the manifest is ~30MB, so we fetch+parse it once and keep the
// parsed result in-process (bypassing the shared 10-min text cache to avoid
// re-parsing megabytes on every call). Upgrade path: switch to a streamed/
// per-component endpoint if ThreeUI ever publishes one.
import { fetchJson } from "../lib/fetch.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";

const MANIFEST_URL =
  "https://raw.githubusercontent.com/MengTo/threeui/main/public/source-code.json";
const HOMEPAGE = "https://threeui.com/browse";
const LICENSE = "MIT";

interface ManifestFile {
  path: string;
  language?: string;
  role?: string;
  code?: string;
}
interface ManifestComponent {
  id: string;
  exportName?: string;
  runtime?: string;
  title?: string;
  category?: string;
  sharedFilePaths?: string[];
  files?: ManifestFile[];
}
interface Manifest {
  components?: ManifestComponent[];
  sharedFiles?: ManifestFile[];
}

let manifestCache: Manifest | null = null;
let manifestPromise: Promise<Manifest> | null = null;

async function loadManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache;
  if (!manifestPromise) {
    manifestPromise = fetchJson<Manifest>(MANIFEST_URL)
      .then((m) => {
        manifestCache = m;
        return m;
      })
      .catch((e) => {
        manifestPromise = null; // allow retry on next call
        throw e;
      });
  }
  return manifestPromise;
}

const titleOf = (c: ManifestComponent): string =>
  c.title ||
  c.id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const categoryOf = (c: ManifestComponent): string =>
  c.category || (c.id.includes("landing-page") ? "landing-pages" : c.runtime || "component");

function summaryOf(c: ManifestComponent): ResourceSummary {
  const langs = [...new Set((c.files || []).map((f) => f.language).filter(Boolean))] as string[];
  return {
    source: "threeui",
    id: c.id,
    title: titleOf(c),
    category: categoryOf(c),
    url: HOMEPAGE,
    tags: ["threejs", "webgl", ...(c.runtime ? [c.runtime] : []), ...langs].filter(Boolean),
  };
}

export const threeui: SourceAdapter = {
  id: "threeui",
  label: "ThreeUI (Community)",
  description:
    "ThreeUI — open-source Community catalog of live, interactive Three.js/WebGL components and landing pages. Returns real inline source (HTML/JS/GLSL/CSS) from the MengTo/threeui repo.",
  homepage: HOMEPAGE,
  hasInlineCode: true,

  async listCategories(): Promise<Category[]> {
    const m = await loadManifest();
    const counts = new Map<string, number>();
    for (const c of m.components || []) {
      const cat = categoryOf(c);
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, label: id, count }));
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const m = await loadManifest();
    const q = (args.query || "").toLowerCase();
    const cat = (args.category || "").toLowerCase();
    const out: ResourceSummary[] = [];
    for (const c of m.components || []) {
      if (cat && categoryOf(c).toLowerCase() !== cat) continue;
      if (q && !`${c.id} ${titleOf(c)}`.toLowerCase().includes(q)) continue;
      out.push(summaryOf(c));
      if (out.length >= limit) break;
    }
    return out;
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const m = await loadManifest();
    const c = (m.components || []).find((x) => x.id === id);
    if (!c) return null;
    const sharedByPath = new Map((m.sharedFiles || []).map((f) => [f.path, f]));

    const code: Record<string, string> = {};
    const addFile = (f: ManifestFile) => {
      if (!f.code) return;
      const lang = f.language || f.path.split(".").pop() || "code";
      // Key by path so multiple files of the same language don't collide.
      const key = code[lang] ? `${lang}:${f.path}` : lang;
      code[key] = f.code;
    };
    for (const f of c.files || []) addFile(f);
    for (const p of c.sharedFilePaths || []) {
      const sf = sharedByPath.get(p);
      if (sf) addFile(sf);
    }

    return {
      ...summaryOf(c),
      license: LICENSE,
      code: Object.keys(code).length ? code : undefined,
      extra: {
        exportName: c.exportName,
        runtime: c.runtime,
        files: (c.files || []).map((f) => f.path),
        sharedFilePaths: c.sharedFilePaths,
      },
    };
  },
};
