// React Three Fiber (R3F) adapter — serves the bundled react-three-fiber skill
// (SKILL.md + reference docs) as offline, searchable guidance resources. Unlike
// the `drei`/`threejs` adapters (which fetch live library *code*), this source
// provides curated R3F *guidance*: stack-selection, scene/geometry patterns,
// scroll storytelling, and a performance/architecture checklist.
// ponytail: content is read from disk once and cached in-process; no network.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Category,
  ResourceDetail,
  ResourceSummary,
  SearchArgs,
  SourceAdapter,
} from "../lib/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
// Built code lives in dist/sources; content is copied alongside on build.
// Fall back to the src copy so unbuilt/dev runs also work.
const CONTENT_DIR =
  [join(HERE, "r3f-content"), join(HERE, "..", "..", "src", "sources", "r3f-content")].find((p) =>
    existsSync(p),
  ) ?? join(HERE, "r3f-content");

// Bundled docs, in reading order. `category` groups them for list_categories.
const DOCS: { id: string; file: string; title: string; category: string }[] = [
  {
    id: "skill",
    file: "SKILL.md",
    title: "React Three Fiber — overview & core concepts",
    category: "overview",
  },
  {
    id: "geometry-and-scenes",
    file: "references/geometry-and-scenes.md",
    title: "Geometry, materials, lighting & animation",
    category: "reference",
  },
  {
    id: "scroll-storytelling",
    file: "references/scroll-storytelling.md",
    title: "Scroll-driven 3D storytelling",
    category: "reference",
  },
  {
    id: "architecture-decisions",
    file: "references/architecture-decisions.md",
    title: "Architecture decisions, performance & declarative scenes",
    category: "reference",
  },
];

const HOMEPAGE = "https://r3f.docs.pmnd.rs/";

const contentCache = new Map<string, string>();
async function readDoc(file: string): Promise<string> {
  const cached = contentCache.get(file);
  if (cached !== undefined) return cached;
  const text = await readFile(join(CONTENT_DIR, file), "utf-8");
  contentCache.set(file, text);
  return text;
}

/** First `##`/`###` heading title in a markdown blob, else fall back. */
function headingTitles(md: string): string[] {
  return [...md.matchAll(/^#{2,3}\s+(.+?)\s*$/gm)].map((m) => m[1] ?? "");
}

function summaryOf(doc: (typeof DOCS)[number], md: string): ResourceSummary {
  const sections = headingTitles(md);
  // Description = first non-empty prose line after the H1.
  const afterH1 = md.replace(/^#\s+.+?\n/, "");
  const firstProse = afterH1
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !l.startsWith("```") && !l.startsWith("|"));
  return {
    source: "r3f",
    id: doc.id,
    title: doc.title,
    description: firstProse?.slice(0, 200),
    category: doc.category,
    url: HOMEPAGE,
    tags: [
      "react-three-fiber",
      "r3f",
      "three.js",
      "webgl",
      "react",
      doc.category,
      ...sections.slice(0, 6),
    ],
  };
}

export const r3f: SourceAdapter = {
  id: "r3f",
  label: "React Three Fiber (skill)",
  description:
    "Curated React Three Fiber (R3F) guidance — Canvas/hooks/JSX-Three.js core, geometry & materials, scroll-driven 3D storytelling, and a stack-selection + performance checklist. Offline, bundled reference (SKILL.md + docs); returns the guidance markdown as inline 'code'.",
  homepage: HOMEPAGE,
  hasInlineCode: true,

  async listCategories(): Promise<Category[]> {
    const counts = new Map<string, number>();
    for (const d of DOCS) counts.set(d.category, (counts.get(d.category) || 0) + 1);
    return [...counts.entries()].map(([id, count]) => ({ id, label: id, count }));
  },

  async search(args: SearchArgs): Promise<ResourceSummary[]> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const q = (args.query || "").toLowerCase();
    const cat = (args.category || "").toLowerCase();
    const out: ResourceSummary[] = [];
    for (const doc of DOCS) {
      if (cat && doc.category.toLowerCase() !== cat) continue;
      const md = await readDoc(doc.file);
      if (q && !`${doc.title}\n${md}`.toLowerCase().includes(q)) continue;
      out.push(summaryOf(doc, md));
      if (out.length >= limit) break;
    }
    return out;
  },

  async getResource(id: string): Promise<ResourceDetail | null> {
    const doc = DOCS.find((d) => d.id === id);
    if (!doc) return null;
    let md: string;
    try {
      md = await readDoc(doc.file);
    } catch {
      return null;
    }
    const summary = summaryOf(doc, md);
    return {
      ...summary,
      license: "See react-three-fiber skill bundle",
      code: { md: md },
      extra: { file: doc.file, sections: headingTitles(md) },
    };
  },
};
