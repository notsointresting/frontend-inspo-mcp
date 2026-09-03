// Package/source-tree adapter for code libraries: three.js (via jsdelivr) and
// drei (via GitHub). Lists a file tree, searches by path, and returns raw source.
// ponytail: GitHub unauthenticated API is 60 req/hr; we cache the tree and read an
// optional GITHUB_TOKEN to lift the limit. Upgrade path: add ETag caching if needed.
import { fetchJson, fetchText } from "../lib/fetch.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
  SourceId,
} from "../lib/types.js";

interface FileEntry {
  path: string; // repo/package-relative path, always starting with "/"
}

interface PackageConfig {
  id: SourceId;
  label: string;
  description: string;
  homepage: string;
  license: string;
  // Only include files matching this (keeps the tree relevant + small).
  include: RegExp;
  loadTree(): Promise<FileEntry[]>;
  rawUrl(path: string): string;
  // Derive a top-level category from a path (e.g. "shaders", "controls").
  categoryOf(path: string): string;
}

const langFromPath = (p: string): string => {
  const ext = p.split(".").pop()?.toLowerCase() || "";
  return { tsx: "tsx", ts: "ts", jsx: "jsx", js: "js", glsl: "glsl", frag: "glsl", vert: "glsl", css: "css" }[ext] || ext || "code";
};

const baseName = (p: string): string => p.split("/").pop()?.replace(/\.[^.]+$/, "") || p;

function makePackageAdapter(cfg: PackageConfig): SourceAdapter {
  let treeCache: FileEntry[] | null = null;
  async function tree(): Promise<FileEntry[]> {
    if (!treeCache) treeCache = (await cfg.loadTree()).filter((f) => cfg.include.test(f.path));
    return treeCache;
  }

  return {
    id: cfg.id,
    label: cfg.label,
    description: cfg.description,
    homepage: cfg.homepage,
    hasInlineCode: true,

    async listCategories(): Promise<Category[]> {
      const files = await tree();
      const counts = new Map<string, number>();
      for (const f of files) {
        const c = cfg.categoryOf(f.path);
        counts.set(c, (counts.get(c) || 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, label: id, count }));
    },

    async search(args: SearchArgs): Promise<ResourceSummary[]> {
      const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
      const files = await tree();
      const q = (args.query || "").toLowerCase();
      const cat = (args.category || "").toLowerCase();
      const out: ResourceSummary[] = [];
      for (const f of files) {
        if (cat && cfg.categoryOf(f.path).toLowerCase() !== cat) continue;
        if (q && !f.path.toLowerCase().includes(q)) continue;
        out.push({
          source: cfg.id,
          id: f.path,
          title: baseName(f.path),
          category: cfg.categoryOf(f.path),
          url: cfg.homepage,
          tags: [cfg.categoryOf(f.path), langFromPath(f.path)],
        });
        if (out.length >= limit) break;
      }
      return out;
    },

    async getResource(id: string): Promise<ResourceDetail | null> {
      const path = id.startsWith("/") ? id : `/${id}`;
      let content: string;
      try {
        content = await fetchText(cfg.rawUrl(path));
      } catch {
        return null;
      }
      return {
        source: cfg.id,
        id: path,
        title: baseName(path),
        category: cfg.categoryOf(path),
        url: cfg.homepage,
        tags: [cfg.categoryOf(path), langFromPath(path)],
        license: cfg.license,
        code: { [langFromPath(path)]: content },
        extra: { path },
      };
    },
  };
}

// --- three.js via jsdelivr --------------------------------------------------

interface JsdelivrFlat { files: { name: string }[] }
let threeVer: string | null = null;
async function threeVersion(): Promise<string> {
  if (threeVer) return threeVer;
  const meta = await fetchJson<{ tags?: { latest?: string } }>(
    "https://data.jsdelivr.com/v1/package/npm/three",
  );
  threeVer = meta.tags?.latest || "latest";
  return threeVer;
}

export const threejs: SourceAdapter = makePackageAdapter({
  id: "threejs",
  label: "three.js",
  description:
    "Official three.js examples — shaders (GLSL), post-processing, loaders, controls, and helpers. Real source via jsdelivr CDN.",
  homepage: "https://threejs.org/",
  license: "MIT",
  include: /^\/examples\/jsm\//,
  async loadTree() {
    const ver = await threeVersion();
    const flat = await fetchJson<JsdelivrFlat>(
      `https://data.jsdelivr.com/v1/packages/npm/three@${ver}?structure=flat`,
    );
    return (flat.files || []).map((f) => ({ path: f.name }));
  },
  rawUrl(path: string) {
    return `https://cdn.jsdelivr.net/npm/three@${threeVer || "latest"}${path}`;
  },
  categoryOf(path: string) {
    // /examples/jsm/<category>/<file>
    return path.split("/")[3] || "misc";
  },
});

// --- drei via GitHub --------------------------------------------------------

interface GhTree { tree: { path: string; type: string }[] }

async function githubJson<T>(url: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const r = await fetch(url, {
    headers: {
      "user-agent": "frontend-inspo-mcp",
      accept: "application/vnd.github+json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!r.ok) throw new Error(`GitHub HTTP ${r.status} for ${url}`);
  return (await r.json()) as T;
}

export const drei: SourceAdapter = makePackageAdapter({
  id: "drei",
  label: "drei (React Three Fiber)",
  description:
    "@react-three/drei helper components for R3F — controls, shapes, staging, shaders, abstractions. Real source from the pmndrs/drei repo.",
  homepage: "https://github.com/pmndrs/drei",
  license: "MIT",
  include: /^\/src\/.*\.tsx?$/,
  async loadTree() {
    const t = await githubJson<GhTree>(
      "https://api.github.com/repos/pmndrs/drei/git/trees/master?recursive=1",
    );
    return (t.tree || [])
      .filter((n) => n.type === "blob")
      .map((n) => ({ path: `/${n.path}` }));
  },
  rawUrl(path: string) {
    return `https://raw.githubusercontent.com/pmndrs/drei/master${path}`;
  },
  categoryOf(path: string) {
    // /src/<category>/<file> ; drei groups as core/web/native
    return path.split("/")[2] || "core";
  },
});
