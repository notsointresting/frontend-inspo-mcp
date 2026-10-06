// ThreeUI (Community) adapter — MengTo/threeui open-source catalog of live,
// interactive Three.js/WebGL components. The repo ships one big manifest
// (public/source-code.json) that contains every Community component's inline
// source in `components[].files[].code`, plus `sharedFiles[]`.
// ponytail: the manifest is ~30MB, so we fetch+parse it once and keep the
// parsed result in-process for 6 hours (bypassing the shared 10-min text cache to avoid
// re-parsing megabytes on every call). Upgrade path: switch to a streamed/
// per-component endpoint if ThreeUI ever publishes one.
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

/** Re-downloaded after 6 hours, so a long session sees new components. */
const MANIFEST_TTL_MS = 6 * 60 * 60 * 1000;
/** Concurrent callers share one download; a failed one is retried on the next call. */
const loadManifest = memoAsync(() => fetchJson<Manifest>(MANIFEST_URL), MANIFEST_TTL_MS);

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
  stack: ["3d", "javascript", "html"],
  idFormat: 'component id from search_resources, e.g. "energy-orb"',
  heavy: true, // one ~30 MB manifest

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
    const cat = (args.category || "").toLowerCase();
    const summaries = (m.components || [])
      .filter((c) => !cat || categoryOf(c).toLowerCase() === cat)
      .map(summaryOf);
    // Tags are one field, so a component's tag count does not raise its score.
    const fields = (s: ResourceSummary) => [s.title, s.id, s.category, s.tags?.join(" ")];
    return rankByQuery(summaries, args.query, fields, limit);
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
