// Package/source-tree adapters for code libraries: npm packages via jsDelivr and repos via
// GitHub. Lists a file tree, searches by path, and returns raw source.
// ponytail: GitHub unauthenticated API is 60 req/hr; we cache the tree and read an
// optional GITHUB_TOKEN to lift the limit. Upgrade path: add ETag caching if needed.
import { FetchError, fetchJson, fetchText, isTransient } from "../lib/fetch.js";
import { memoAsync } from "../lib/memo.js";
import { rankByQuery } from "../lib/search.js";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
  SourceId,
  Stack,
} from "../lib/types.js";

export interface FileEntry {
  path: string; // repo/package-relative path, always starting with "/"
}

/** Optional metadata every package-style factory passes through to the adapter. */
export interface SourceMeta {
  stack?: readonly Stack[];
  /** Defaults to a file-path description. */
  idFormat?: string;
  heavy?: boolean;
}

export interface PackageConfig extends SourceMeta {
  id: SourceId;
  label: string;
  description: string;
  homepage: string;
  license: string;
  // Only include files matching this (keeps the tree relevant + small).
  include: RegExp;
  loadTree(): Promise<FileEntry[]>;
  /** Raw-content URL for a path; may be async to resolve a version or mirror first. */
  rawUrl(path: string): string | Promise<string>;
  // Derive a top-level category from a path (e.g. "shaders", "controls").
  categoryOf(path: string): string;
}

const langFromPath = (p: string): string => {
  const ext = p.split(".").pop()?.toLowerCase() || "";
  return (
    {
      tsx: "tsx",
      ts: "ts",
      jsx: "jsx",
      js: "js",
      glsl: "glsl",
      frag: "glsl",
      vert: "glsl",
      css: "css",
    }[ext] ||
    ext ||
    "code"
  );
};

const baseName = (p: string): string =>
  p
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "") || p;

/** File names that say nothing on their own: the folder names the resource. */
const GENERIC_NAME = /^(?:index|\+page|readme|skill|design)$/i;
/** Numbered variants ("1", "1-dark", "example-01"): kept, after their folder's name. */
const NUMBERED_NAME = /^(?:\d+(?:-dark)?|example-\d+)$/i;

/** A file's title: its base name, unless that only means something with its folder
 *  ("/design-md/stripe/DESIGN.md" -> "stripe", ".../accordions/1-dark.html" ->
 *  "accordions 1-dark"). */
const titleOf = (p: string): string => {
  const name = baseName(p);
  const folder = p.split("/").at(-2);
  if (!folder) return name; // a top-level file has no folder to borrow from
  if (GENERIC_NAME.test(name)) return folder;
  return NUMBERED_NAME.test(name) ? `${folder} ${name}` : name;
};

/** idFormat for file-path ids, with a real example path from the source. */
const pathIdFormat = (example: string): string =>
  `file path from search_resources, e.g. "${example}"`;

const TREE_TTL_MS = 60 * 60 * 1000; // file listings
const VERSION_TTL_MS = 6 * 60 * 60 * 1000; // npm "latest" tags

export function makePackageAdapter(cfg: PackageConfig): SourceAdapter {
  const tree = memoAsync(
    async () => (await cfg.loadTree()).filter((f) => cfg.include.test(f.path)),
    TREE_TTL_MS,
  );
  // A segment such as "_shared" fails the tools' category schema (it must start with a letter
  // or digit), so a client could not pass it back: drop the leading symbols ("shared").
  const categoryOf = (path: string): string =>
    cfg.categoryOf(path).replace(/^[^A-Za-z0-9]+/, "") || "misc";

  return {
    id: cfg.id,
    label: cfg.label,
    description: cfg.description,
    homepage: cfg.homepage,
    hasInlineCode: true,
    stack: cfg.stack,
    idFormat: cfg.idFormat ?? pathIdFormat("/src/index.ts"),
    heavy: cfg.heavy,

    async listCategories(): Promise<Category[]> {
      const files = await tree();
      const counts = new Map<string, number>();
      for (const f of files) {
        const c = categoryOf(f.path);
        counts.set(c, (counts.get(c) || 0) + 1);
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({ id, label: id, count }));
    },

    async search(args: SearchArgs): Promise<ResourceSummary[]> {
      const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
      const cat = (args.category || "").toLowerCase();
      const files = (await tree()).filter((f) => !cat || categoryOf(f.path).toLowerCase() === cat);
      const ranked = rankByQuery(
        files,
        args.query,
        (f) => [titleOf(f.path), f.path, categoryOf(f.path)],
        limit,
      );
      return ranked.map((f) => ({
        source: cfg.id,
        id: f.path,
        title: titleOf(f.path),
        category: categoryOf(f.path),
        url: cfg.homepage,
        tags: [categoryOf(f.path), langFromPath(f.path)],
      }));
    },

    async getResource(id: string): Promise<ResourceDetail | null> {
      const path = id.startsWith("/") ? id : `/${id}`;
      // Resolved outside the try: a failed version lookup is an error, not a missing file.
      const url = await cfg.rawUrl(path);
      let content: string;
      try {
        content = await fetchText(url);
      } catch (e) {
        if (isTransient(e)) throw e; // keep rate limits/network errors visible
        return null;
      }
      return {
        source: cfg.id,
        id: path,
        title: titleOf(path),
        category: categoryOf(path),
        url: cfg.homepage,
        tags: [categoryOf(path), langFromPath(path)],
        license: cfg.license,
        code: { [langFromPath(path)]: content },
        extra: { path },
      };
    },
  };
}

// --- three.js via jsdelivr --------------------------------------------------

interface JsdelivrFlat {
  files: { name: string }[];
}

export const threejs: SourceAdapter = makeJsdelivrSrcAdapter({
  id: "threejs",
  label: "three.js",
  description:
    "Official three.js examples — shaders (GLSL), post-processing, loaders, controls, and helpers. Real source via jsdelivr CDN.",
  homepage: "https://threejs.org/",
  pkg: "three",
  license: "MIT",
  include: /^\/examples\/jsm\//,
  categoryIndex: 3, // /examples/jsm/<category>/<file>
  stack: ["3d", "javascript"],
  idFormat: pathIdFormat("/examples/jsm/controls/OrbitControls.js"),
});

// --- GitHub helpers -----------------------------------------------------------

interface GhTree {
  tree: { path: string; type: string }[];
}

// Goes through fetchJson so GitHub 403/429 rate limits get retried with backoff;
// fetch.ts attaches GITHUB_TOKEN for api.github.com.
const githubJson = <T>(url: string): Promise<T> => fetchJson<T>(url);

// --- Generic jsdelivr /src libraries (Two.js, scrollama) --------------------

// ponytail: listing and raw URLs each read this memo, so for up to an hour after a new release
// (the tree TTL) a listed file may come from the newer version. Upgrade path: memoize the
// version together with the listing.
/** A memoized lookup of an npm package's "latest" dist-tag. */
function npmLatest(pkg: string): () => Promise<string> {
  return memoAsync(async () => {
    const meta = await fetchJson<{ tags?: { latest?: string } }>(
      `https://data.jsdelivr.com/v1/package/npm/${pkg}`,
    );
    return meta.tags?.latest || "latest";
  }, VERSION_TTL_MS);
}

export interface JsdelivrSrcOptions extends SourceMeta {
  id: SourceId;
  label: string;
  description: string;
  homepage: string;
  pkg: string; // npm package name, scoped names included ("@radix-ui/colors")
  license?: string; // defaults to "MIT"
  include: RegExp;
  categoryIndex: number; // which path segment is the category
}

export function makeJsdelivrSrcAdapter(opts: JsdelivrSrcOptions): SourceAdapter {
  const version = npmLatest(opts.pkg);
  return makePackageAdapter({
    id: opts.id,
    label: opts.label,
    description: opts.description,
    homepage: opts.homepage,
    license: opts.license ?? "MIT",
    include: opts.include,
    stack: opts.stack,
    idFormat: opts.idFormat,
    heavy: opts.heavy,
    async loadTree() {
      const flat = await fetchJson<JsdelivrFlat>(
        `https://data.jsdelivr.com/v1/packages/npm/${opts.pkg}@${await version()}?structure=flat`,
      );
      return (flat.files || []).map((f) => ({ path: f.name }));
    },
    async rawUrl(path: string) {
      return `https://cdn.jsdelivr.net/npm/${opts.pkg}@${await version()}${path}`;
    },
    categoryOf(path: string) {
      return path.split("/")[opts.categoryIndex] || "misc";
    },
  });
}

// --- Generic GitHub source-tree libraries -----------------------------------
// Reads a repo's git tree, keeps files matching `include`, and serves raw file content,
// so any GitHub-hosted library can be exposed with one config block.

export interface GithubSrcOptions extends SourceMeta {
  id: SourceId;
  label: string;
  description: string;
  homepage: string;
  repo: string; // "owner/name"
  /** Git ref to read. Defaults to "HEAD" (the default branch); pin a commit SHA for immutable reads. */
  ref?: string;
  /**
   * Branch for the jsDelivr fallback, which has no "HEAD". Defaults to "main"; unused when
   * `ref` is a commit SHA (the fallback then reads that exact commit).
   */
  fallbackRef?: string;
  license: string;
  include: RegExp;
  categoryIndex: number; // which path segment (0-based, after leading "/") is the category
}

/** A full commit SHA: immutable, so the jsDelivr fallback can serve the exact same snapshot. */
const isCommitSha = (ref: string): boolean => /^[0-9a-f]{40}$/i.test(ref);

export function makeGithubSrcAdapter(opts: GithubSrcOptions): SourceAdapter {
  const ref = opts.ref ?? "HEAD";
  // ponytail: if the GitHub API tree call fails (rate limit, 5xx, network), list and serve
  // the repo through jsDelivr instead. jsDelivr caches branch refs up to 12 h and refuses
  // repos over 150 MB (e.g. pmndrs/uikit returns 403), so that copy can lag or be missing;
  // pin `ref` to a commit SHA for an exact match. Upgrade path: conditional (ETag) GitHub
  // requests, so refreshes spend less of the quota and the fallback is needed less often.
  const mirror = `${opts.repo}@${isCommitSha(ref) ? ref : (opts.fallbackRef ?? "main")}`;
  // Which host the current listing came from, so raw files come from the same snapshot.
  let viaJsdelivr = false;
  return makePackageAdapter({
    id: opts.id,
    label: opts.label,
    description: opts.description,
    homepage: opts.homepage,
    license: opts.license,
    include: opts.include,
    stack: opts.stack,
    idFormat: opts.idFormat,
    heavy: opts.heavy,
    async loadTree() {
      let t: GhTree;
      try {
        t = await githubJson<GhTree>(
          `https://api.github.com/repos/${opts.repo}/git/trees/${ref}?recursive=1`,
        );
      } catch (e) {
        if (!(e instanceof FetchError)) throw e;
        let flat: JsdelivrFlat;
        try {
          flat = await fetchJson<JsdelivrFlat>(
            `https://data.jsdelivr.com/v1/packages/gh/${mirror}?structure=flat`,
          );
        } catch {
          throw e; // the GitHub error is the one worth reporting
        }
        viaJsdelivr = true;
        return (flat.files || []).map((f) => ({ path: f.name }));
      }
      viaJsdelivr = false;
      return (t.tree || []).filter((n) => n.type === "blob").map((n) => ({ path: `/${n.path}` }));
    },
    rawUrl(path: string) {
      return viaJsdelivr
        ? `https://cdn.jsdelivr.net/gh/${mirror}${path}`
        : `https://raw.githubusercontent.com/${opts.repo}/${ref}${path}`;
    },
    categoryOf(path: string) {
      // path always starts with "/", so split()[0] === "" ; +1 to skip it.
      return path.split("/")[opts.categoryIndex + 1] || "misc";
    },
  });
}

export const drei = makeGithubSrcAdapter({
  id: "drei",
  label: "drei (React Three Fiber)",
  description:
    "@react-three/drei helper components for R3F — controls, shapes, staging, shaders, abstractions. Real source from the pmndrs/drei repo.",
  homepage: "https://github.com/pmndrs/drei",
  repo: "pmndrs/drei",
  fallbackRef: "master",
  license: "MIT",
  include: /^\/src\/.*\.tsx?$/,
  categoryIndex: 1, // /src/<category>/<file> ; drei groups as core/web/native
  stack: ["react", "3d"],
  idFormat: pathIdFormat("/src/core/OrbitControls.tsx"),
});

export const reactspring = makeGithubSrcAdapter({
  id: "reactspring",
  label: "react-spring",
  description:
    "@react-spring — spring-physics animation library for React. Real source (animated, core, web, three, konva, native targets) from the pmndrs/react-spring repo.",
  homepage: "https://github.com/pmndrs/react-spring",
  repo: "pmndrs/react-spring",
  fallbackRef: "next",
  license: "MIT",
  include: /^\/packages\/[^/]+\/src\/.*\.tsx?$/,
  categoryIndex: 1, // /packages/<category>/src/...
  stack: ["react", "animation"],
  idFormat: pathIdFormat("/packages/core/src/SpringValue.ts"),
});

export const zustand = makeGithubSrcAdapter({
  id: "zustand",
  label: "zustand",
  description:
    "zustand — minimal bear-necessities state management for React. Real source (core, middleware, react bindings) from the pmndrs/zustand repo.",
  homepage: "https://github.com/pmndrs/zustand",
  repo: "pmndrs/zustand",
  license: "MIT",
  include: /^\/src\/.*\.tsx?$/,
  categoryIndex: 1, // /src/<category-or-file>
  stack: ["react"],
  idFormat: pathIdFormat("/src/middleware/persist.ts"),
});

export const glyph = makeGithubSrcAdapter({
  id: "glyph",
  label: "glyph (pmndrs)",
  description:
    "@pmndrs/glyph — GPU text/geometry glyph baking utilities (TSL, typegpu, raster). Real source from the pmndrs/glyph repo.",
  homepage: "https://github.com/pmndrs/glyph",
  repo: "pmndrs/glyph",
  license: "MIT",
  include: /^\/packages\/[^/]+\/src\/.*\.tsx?$/,
  categoryIndex: 1, // /packages/<category>/src/...
  stack: ["3d"],
  idFormat: pathIdFormat("/packages/glyph/src/layout.ts"),
});

export const postprocessing = makeGithubSrcAdapter({
  id: "postprocessing",
  label: "postprocessing",
  description:
    "postprocessing — post-processing effects + EffectComposer for three.js (bloom, DOF, SSAO, glitch, and more). Real source from the pmndrs/postprocessing repo.",
  homepage: "https://github.com/pmndrs/postprocessing",
  repo: "pmndrs/postprocessing",
  license: "Zlib",
  include: /^\/src\/.*\.js$/,
  categoryIndex: 1, // /src/<category>/<file>
  stack: ["3d"],
  idFormat: pathIdFormat("/src/effects/BloomEffect.js"),
});

export const detectgpu = makeGithubSrcAdapter({
  id: "detectgpu",
  label: "detect-gpu",
  description:
    "detect-gpu — classify a device's GPU tier via benchmarks (pick fidelity/quality at runtime). Real source from the pmndrs/detect-gpu repo.",
  homepage: "https://github.com/pmndrs/detect-gpu",
  repo: "pmndrs/detect-gpu",
  fallbackRef: "master",
  license: "MIT",
  include: /^\/src\/.*\.ts$/,
  categoryIndex: 1, // /src/<category-or-file>
  stack: ["3d", "javascript"],
  idFormat: pathIdFormat("/src/index.ts"),
});

export const shadergradient = makeGithubSrcAdapter({
  id: "shadergradient",
  label: "ShaderGradient",
  description:
    "ShaderGradient — animated, customizable gradient meshes for R3F/three.js (as seen in Framer). Real source from the ruucm/shadergradient repo.",
  homepage: "https://github.com/ruucm/shadergradient",
  repo: "ruucm/shadergradient",
  license:
    "MIT (declared in the README and in each listed package's package.json; no LICENSE file)",
  include: /^\/packages\/[^/]+\/src\/.*\.(tsx?|glsl)$/,
  categoryIndex: 1, // /packages/<category>/src/...
  stack: ["react", "3d"],
  idFormat: pathIdFormat("/packages/shadergradient/src/ShaderGradient/ShaderGradient.tsx"),
});

export const liquidlogo = makeGithubSrcAdapter({
  id: "liquidlogo",
  label: "liquid-logo",
  description:
    "liquid-logo — turn a logo/image into an animated liquid-metal WebGL effect (GLSL shader + canvas video export). Real source from the collidingScopes/liquid-logo repo.",
  homepage: "https://github.com/collidingScopes/liquid-logo",
  repo: "collidingScopes/liquid-logo",
  license: "MIT",
  include: /^\/[^/]+\.(js|glsl|html)$/,
  categoryIndex: 0, // flat repo: category = the file itself
  stack: ["3d", "javascript"],
  idFormat: pathIdFormat("/fragment-shader.glsl"),
});

export const liquidglass = makeGithubSrcAdapter({
  id: "liquidglass",
  label: "liquid-glass-js",
  description:
    "liquid-glass-js — Apple-style 'liquid glass' refraction/displacement effect for the web, framework-agnostic. Real source from the dashersw/liquid-glass-js repo.",
  homepage: "https://github.com/dashersw/liquid-glass-js",
  repo: "dashersw/liquid-glass-js",
  license: "MIT",
  include: /^\/[^/]+\.(m?js|ts)$/,
  categoryIndex: 0, // flat repo: category = the file itself
  stack: ["javascript", "css"],
  idFormat: pathIdFormat("/container.js"),
});

export const img2threejs = makeGithubSrcAdapter({
  id: "img2threejs",
  label: "img2threejs",
  description:
    "img2threejs — pipeline that converts a single image into a three.js/GLB 3D scene. Real source (Python 'forge' pipeline) from the img2threejs/img2threejs repo.",
  homepage: "https://github.com/img2threejs/img2threejs",
  repo: "img2threejs/img2threejs",
  license: "Apache-2.0",
  include: /^\/forge\/.*\.py$/,
  categoryIndex: 1, // /forge/<category>/...
  stack: ["3d"],
  idFormat: pathIdFormat("/forge/_shared/glb_container.py"),
});

export const gsap = makeGithubSrcAdapter({
  id: "gsap",
  label: "GSAP Skills",
  description:
    "GreenSock's official GSAP 'skills' — agent-ready guidance (core, plugins, ScrollTrigger, React, frameworks, performance) plus runnable examples for React/Vue/Nuxt/vanilla. Real source from the greensock/gsap-skills repo.",
  homepage: "https://github.com/greensock/gsap-skills",
  repo: "greensock/gsap-skills",
  license: "MIT",
  include: /^\/(skills|examples)\/.*\.(md|jsx?|tsx?|vue|html)$/,
  categoryIndex: 1, // /<skills|examples>/<category>/...
  stack: ["animation", "guidance", "javascript"],
  idFormat: pathIdFormat("/skills/gsap-scrolltrigger/SKILL.md"),
});

export const twojs = makeJsdelivrSrcAdapter({
  id: "twojs",
  label: "Two.js",
  description:
    "Two.js — 2D drawing / animation library source (renderers, shapes, effects). Real source via jsdelivr.",
  homepage: "https://two.js.org/",
  pkg: "two.js",
  include: /^\/src\/.*\.js$/,
  categoryIndex: 2, // /src/<category>/<file>
  stack: ["javascript", "animation"],
  idFormat: pathIdFormat("/src/effects/linear-gradient.js"),
});

export const scrollama = makeJsdelivrSrcAdapter({
  id: "scrollama",
  label: "scrollama",
  description:
    "scrollama — scrollytelling / scroll-storytelling library source (IntersectionObserver-based). Real source via jsdelivr.",
  homepage: "https://github.com/russellsamora/scrollama",
  pkg: "scrollama",
  include: /^\/src\/.*\.js$/,
  categoryIndex: 1, // /src/<file>
  stack: ["javascript", "animation"],
  idFormat: pathIdFormat("/src/entry.js"),
});
