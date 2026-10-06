// Codrops demos from the codrops GitHub org. search runs over the org's repo list (name,
// description, topics); get_resource reads one repo's git tree and returns its main web files.
// Only public, non-fork repos whose license is MIT are listed or served: most older demos have
// no license at all. The Codrops articles on tympanus.net are linked, never fetched (its
// robots.txt blocks AI agents).
// ponytail: no jsDelivr fallback when the GitHub API is rate limited, since nothing mirrors an
// org's repo list; set GITHUB_TOKEN. Upgrade path: the packages.ts fallback for the repo trees.
import { fetchJson, fetchText } from "../lib/fetch.js";
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

const ORG = "codrops";
const PER_PAGE = 100;
// ponytail: reads at most 10 pages (1,000 repos; the org has ~345). Upgrade path: follow the
// Link header instead of counting pages.
const MAX_PAGES = 10;
const LIST_TTL_MS = 24 * 60 * 60 * 1000;
/** A repo's get_resource returns at most this many files and bytes; extra.files lists the rest. */
const MAX_FILES = 10;
const MAX_BYTES = 200_000;

interface GhRepo {
  name: string;
  description: string | null;
  homepage: string | null;
  html_url: string;
  fork: boolean;
  private: boolean;
  created_at: string;
  topics?: string[];
  license: { spdx_id: string | null } | null;
}

interface GhTree {
  tree?: { path: string; type: string; size?: number }[];
}

interface WebFile {
  path: string; // repo-relative, no leading "/"
  size: number;
}

const isId = (s: string): boolean => idSchema.safeParse(s).success;

/** Every repo we may serve, newest first. */
const repos = memoAsync(async (): Promise<GhRepo[]> => {
  const all: GhRepo[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await fetchJson<GhRepo[]>(
      `https://api.github.com/orgs/${ORG}/repos?per_page=${PER_PAGE}&page=${page}`,
    );
    all.push(...batch);
    if (batch.length < PER_PAGE) break; // a short (or empty) page is the last one
  }
  return all
    .filter((r) => !r.fork && !r.private && r.license?.spdx_id === "MIT" && isId(r.name))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}, LIST_TTL_MS);

const yearOf = (r: GhRepo): string => r.created_at.slice(0, 4);

function summary(r: GhRepo): ResourceSummary {
  return {
    source: "codrops",
    id: r.name,
    title: r.name,
    description: r.description ?? undefined,
    category: yearOf(r),
    // The Codrops article when the repo links one; it is only linked, never fetched.
    url: r.homepage?.startsWith("https://") ? r.homepage : r.html_url,
    tags: r.topics ?? [],
  };
}

/** Text files a demo is built from. */
const WEB_FILE = /\.(?:html|css|scss|js|mjs|ts|jsx|tsx|glsl|frag|vert|astro|vue|svelte)$/;
/** Not Codrops' own code: build output, dependencies, dot-folders, minified (vendored) libraries. */
const NOT_OWN = /(?:^|\/)(?:node_modules|dist|build)\/|(?:^|\/)\.|\.min\./;
/** The usual folders of a demo; files anywhere else (e.g. one folder per sketch) come last. */
const MAIN_DIR = /^(?:css|js|src|scripts)\//;

// ponytail: picks files by folder convention (index.html, css/, js/, src/, scripts/), not by
// what the page actually loads. Upgrade path: follow the entry page's <link> and <script> tags.
/**
 * Fetch order: the entry page; then styles, scripts and other pages, shallow ones first; then
 * files outside the main folders, in path order so each folder stays together.
 */
function rank(path: string): number {
  if (/^(?:src\/)?index\.html$/.test(path)) return 0;
  if (path.includes("/") && !MAIN_DIR.test(path)) return 400;
  const kind = /\.s?css$/.test(path) ? 100 : path.endsWith(".html") ? 300 : 200;
  return kind + path.split("/").length;
}

/**
 * The repo's own web files, in fetch order. Files over MAX_BYTES (bundles such as
 * three.module.js) and paths that would not be valid ids are left out.
 */
async function webFiles(name: string): Promise<WebFile[]> {
  const t = await fetchJson<GhTree>(
    `https://api.github.com/repos/${ORG}/${name}/git/trees/HEAD?recursive=1`,
  );
  return (t.tree ?? [])
    .filter(
      (n) =>
        n.type === "blob" &&
        WEB_FILE.test(n.path) &&
        !NOT_OWN.test(n.path) &&
        (n.size ?? 0) <= MAX_BYTES &&
        isId(`${name}/${n.path}`),
    )
    .map((n) => ({ path: n.path, size: n.size ?? 0 }))
    .sort(
      (a, b) =>
        rank(a.path) - rank(b.path) || a.path.localeCompare(b.path, "en", { numeric: true }),
    );
}

const raw = (name: string, path: string): Promise<string> =>
  fetchText(`https://raw.githubusercontent.com/${ORG}/${name}/HEAD/${path}`);

export const codrops: SourceAdapter = {
  id: "codrops",
  label: "Codrops demos",
  description:
    "Codrops creative front-end demos: scroll, hover, page-transition, typography, slideshow, WebGL/three.js and SVG-filter effects, mostly built with GSAP. A repo's get_resource returns its index.html, CSS and JS (up to 10 files / 200 KB; extra.files lists the rest). Only the MIT-licensed, non-fork repos of the codrops GitHub org; the Codrops article is linked, not fetched.",
  homepage: "https://github.com/codrops",
  hasInlineCode: true,
  stack: ["html", "css", "javascript", "animation"],
  idFormat:
    'repo name from search_resources for its main files, e.g. "ElasticGridScroll", or "<repo>/<path>" for one file from extra.files, e.g. "ElasticGridScroll/js/demo7/index.js"',
  heavy: true, // several GitHub API calls per listing and one per repo

  async listCategories(): Promise<Category[]> {
    const counts = new Map<string, number>();
    for (const r of await repos()) counts.set(yearOf(r), (counts.get(yearOf(r)) ?? 0) + 1);
    return [...counts].map(([id, count]) => ({ id, label: id, count })); // newest year first
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const list = (await repos()).filter((r) => !args.category || yearOf(r) === args.category);
    return rankByQuery(
      list,
      args.query,
      (r) => [r.name, r.description ?? undefined, r.topics?.join(" ")],
      limit,
    ).map(summary);
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const slash = id.indexOf("/");
    const name = slash < 0 ? id : id.slice(0, slash);
    const file = slash < 0 ? undefined : id.slice(slash + 1);
    const repo = (await repos()).find((r) => r.name === name);
    if (!repo) return null; // unknown, a fork, private or not MIT: never served
    const files = await webFiles(name);
    const base = { ...summary(repo), license: "MIT", author: "Codrops" };
    if (file !== undefined) {
      if (!files.some((f) => f.path === file)) return null;
      return {
        ...base,
        id,
        title: id,
        code: { [file]: await raw(name, file) },
        extra: { repo: repo.html_url, path: file },
      };
    }
    const picked: WebFile[] = [];
    const more: string[] = [];
    let bytes = 0;
    for (const f of files) {
      if (picked.length < MAX_FILES && bytes + f.size <= MAX_BYTES) {
        picked.push(f);
        bytes += f.size;
      } else {
        more.push(f.path);
      }
    }
    const code = Object.fromEntries(
      await Promise.all(picked.map(async (f) => [f.path, await raw(name, f.path)] as const)),
    );
    return { ...base, code, extra: { repo: repo.html_url, files: more } };
  },
};
