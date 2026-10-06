// GitHub-hosted collections (Uiverse, HyperUI, Meraki UI, Pines, APG, awesome-design-md,
// Anthropic skills, Web Interface Guidelines): one table of real paths from each repo's git
// tree (captured live). `hits` must be listed under their category; `misses`, real neighbours
// in the same tree, must not.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { idSchema } from "../dist/lib/validate.js";
import { collectionSources } from "../dist/sources/collections.js";
import { mockFetch } from "./helpers.mjs";

const byId = Object.fromEntries(collectionSources.map((a) => [a.id, a]));

const CASES = {
  uiverse: {
    repo: "uiverse-io/galaxy",
    license: "MIT",
    stack: ["html", "css", "tailwind"],
    hits: {
      "/Buttons/0x-Sarthak_hungry-penguin-30.html": "Buttons",
      "/Toggle-switches/Praashoo7_nasty-seahorse-26.html": "Toggle-switches",
      "/loaders/alexruix_nervous-sheep-18.html": "loaders",
    },
    misses: ["/LICENSE", "/README.md"],
  },
  hyperui: {
    repo: "markmead/hyperui",
    license: "MIT",
    stack: ["html", "tailwind"],
    hits: {
      "/public/examples/application/accordions/1.html": "accordions",
      "/public/examples/application/accordions/1-dark.html": "accordions",
      "/public/examples/marketing/announcements/2.html": "announcements",
      "/public/examples/templates/analytics-dashboard/1.html": "analytics-dashboard",
    },
    misses: [
      "/public/component.css",
      "/public/component.js",
      "/public/robots.txt",
      "/src/components/BaseHead.astro",
      "/README.md",
    ],
  },
  merakiui: {
    repo: "merakiuilabs/merakiui",
    license: "MIT",
    stack: ["html", "tailwind"],
    hits: {
      "/components/alerts/ErrorPop.html": "alerts",
      "/components/404-pages/Centered.html": "404-pages",
    },
    misses: ["/README.md", "/LICENSE", "/assets/thumbnail.webp"],
  },
  pines: {
    repo: "thedevdojo/pines",
    license: "MIT",
    stack: ["html", "tailwind", "javascript"],
    hits: {
      "/elements/accordion.html": "accordion.html",
      "/elements/accordion-examples/example-01.html": "accordion-examples",
      "/elements/badge-examples/example-04.html": "badge-examples",
    },
    misses: [
      "/elements/accordion.json",
      "/elements/explanation_generation.txt",
      "/getting-started/how-to-use.html",
      "/index.html",
      "/main.js",
      "/data.json",
    ],
  },
  apg: {
    repo: "w3c/aria-practices",
    license: "W3C Software and Document License",
    stack: ["accessibility", "html", "javascript"],
    hits: {
      "/content/patterns/tabs/examples/tabs-automatic.html": "tabs",
      "/content/patterns/tabs/examples/js/tabs-automatic.js": "tabs",
      "/content/patterns/tabs/examples/css/tabs.css": "tabs",
      "/content/patterns/accordion/accordion-pattern.html": "accordion",
      "/content/patterns/landmarks/examples/js/visua11y.js": "landmarks",
      "/content/practices/keyboard-interface/keyboard-interface-practice.html":
        "keyboard-interface",
    },
    misses: [
      // Vendored third-party files, not under the W3C license.
      "/content/patterns/landmarks/examples/css/bootstrap.css",
      "/content/patterns/landmarks/examples/js/bootstrap-accessibility-2.js",
      "/content/patterns/landmarks/examples/js/jquery-2.1.1.min.js",
      "/content/patterns/carousel/examples/images/amsterdamslide__800x600.jpg",
      "/content/patterns/patterns.html",
      "/content/shared/js/examples.js",
      "/content/about/about.html",
      "/test/tests/accordion_accordion.js",
    ],
  },
  designmd: {
    repo: "VoltAgent/awesome-design-md",
    ref: "13be5c05c63be24b57581162364167028020f043",
    license:
      "MIT (unofficial, brand-inspired interpretations; the brands own their names and marks)",
    stack: ["design-tokens", "guidance"],
    hits: {
      "/design-md/stripe/DESIGN.md": "stripe",
      "/design-md/linear.app/DESIGN.md": "linear.app",
    },
    misses: [
      "/design-md/stripe/README.md",
      "/README.md",
      "/CONTRIBUTING.md",
      "/.github/FUNDING.yml",
    ],
  },
  anthropicskills: {
    repo: "anthropics/skills",
    license: "Apache-2.0",
    stack: ["guidance"],
    hits: {
      "/skills/frontend-design/SKILL.md": "frontend-design",
      "/skills/theme-factory/themes/arctic-frost.md": "theme-factory",
      "/skills/web-artifacts-builder/SKILL.md": "web-artifacts-builder",
      "/skills/canvas-design/SKILL.md": "canvas-design",
    },
    misses: [
      // Source-available, not open source.
      "/skills/docx/SKILL.md",
      "/skills/pdf/SKILL.md",
      // Not one of the four design skills.
      "/skills/algorithmic-art/SKILL.md",
      "/skills/frontend-design/LICENSE.txt",
      "/skills/web-artifacts-builder/scripts/init-artifact.sh",
      "/skills/canvas-design/canvas-fonts/Lora-OFL.txt",
      "/README.md",
      "/THIRD_PARTY_NOTICES.md",
    ],
  },
  webguidelines: {
    repo: "vercel-labs/web-interface-guidelines",
    license: "MIT",
    stack: ["guidance", "accessibility"],
    hits: { "/AGENTS.md": "AGENTS.md", "/README.md": "README.md", "/command.md": "command.md" },
    misses: ["/install.sh", "/LICENSE"],
  },
};

/** A GitHub git-tree reply listing `paths` (plus a directory entry, which must be ignored). */
const gitTree = (paths) =>
  JSON.stringify({
    sha: "d7a5583cffd80af515f7dfb69583c95cbdc9e2ce",
    tree: [
      { path: "content", mode: "040000", type: "tree" },
      ...paths.map((p) => ({ path: p.slice(1), mode: "100644", type: "blob", size: 2896 })),
    ],
    truncated: false,
  });

describe("collection adapters", () => {
  for (const [id, c] of Object.entries(CASES)) {
    const ref = c.ref ?? "HEAD";

    it(`${id}: lists ${c.repo} files under their categories and fetches one`, async () => {
      const calls = mockFetch((url) => {
        const u = new URL(url);
        if (u.host === "api.github.com") {
          return { body: gitTree([...Object.keys(c.hits), ...c.misses]) };
        }
        return { body: `contents of ${u.pathname}` };
      });
      const a = byId[id];
      assert.ok(a, `${id} is registered in collectionSources`);
      assert.equal(a.hasInlineCode, true);
      assert.deepEqual(a.stack, c.stack);

      const res = await a.search({ limit: 100 });
      assert.deepEqual(res.map((r) => r.id).sort(), Object.keys(c.hits).sort());
      for (const r of res) {
        assert.equal(r.category, c.hits[r.id], r.id);
        assert.ok(idSchema.safeParse(r.id).success, `${r.id} is a valid id`);
      }
      assert.ok(
        calls.includes(`https://api.github.com/repos/${c.repo}/git/trees/${ref}?recursive=1`),
      );

      const cats = (await a.listCategories()).map((x) => x.id);
      for (const cat of Object.values(c.hits)) assert.ok(cats.includes(cat), cat);

      // The documented id example is a real, listed path.
      const example = /"([^"]+)"/.exec(a.idFormat)?.[1];
      assert.ok(example in c.hits, `idFormat example ${example}`);
      const d = await a.getResource(example);
      const lang = example.split(".").pop();
      assert.equal(d.code[lang], `contents of /${c.repo}/${ref}${example}`);
      assert.equal(d.category, c.hits[example]);
      assert.equal(d.license, c.license);
    });
  }

  it("registers every collection once, with codrops last", () => {
    const ids = collectionSources.map((a) => a.id);
    assert.deepEqual(ids, [...Object.keys(CASES), "codrops"]);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("labels the DESIGN.md files as unofficial interpretations of the brands", () => {
    const d = byId.designmd;
    assert.match(d.description, /Unofficial, brand-inspired interpretations/);
    assert.match(d.description, /the brands own their names and marks/);
  });
});
