// Community shadcn-schema registries: each config's index and item URLs, read against small
// samples trimmed from the live sites, plus the shared index filter.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeItems, communityRegistries } from "../dist/sources/community-registries.js";
import { mockFetch } from "./helpers.mjs";

const file = (path, type, content) => ({ path, type, ...(content ? { content } : {}) });

// One row per registry: its index sample (the live shape), a query with the ids it must find,
// one item with its expected code, and the page URL expected for that item.
const CASES = [
  {
    id: "cultui",
    index: "https://www.cult-ui.com/r/registry.json",
    indexBody: {
      name: "cult/ui",
      homepage: "https://cult-ui.com",
      items: [
        {
          name: "text-animate",
          type: "registry:ui",
          dependencies: ["motion"],
          files: [file("registry/default/ui/text-animate.tsx", "registry:ui")],
          description: "Animated text component with customizable reveal effects and timing",
        },
        {
          name: "animated-badge", // deprecated alias without files: dropped
          type: "registry:ui",
          registryDependencies: ["https://cult-ui.com/r/halo-badge.json"],
          files: [],
          description: "Deprecated alias for halo-badge.",
        },
        {
          name: "text-animate-demo",
          type: "registry:component",
          files: [file("registry/default/example/text-animate-demo.tsx", "registry:component")],
        },
      ],
    },
    ids: ["text-animate", "text-animate-demo"],
    query: "reveal effects",
    found: ["text-animate"],
    item: "text-animate",
    itemUrl: "https://www.cult-ui.com/r/text-animate.json",
    files: [
      file(
        "registry/default/ui/text-animate.tsx",
        "registry:ui",
        '"use client"\n\nimport { motion, useInView } from "motion/react"\n',
      ),
    ],
    code: { tsx: '"use client"\n\nimport { motion, useInView } from "motion/react"\n' },
    url: "https://www.cult-ui.com/",
    license: "MIT",
  },
  {
    id: "motionprimitives",
    index: "https://motion-primitives.com/c/registry.json",
    indexBody: {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "motion-primitives",
      homepage: "https://motion-primitives.com",
      items: [
        {
          name: "accordion",
          type: "registry:ui",
          title: "Accordion",
          description:
            "A collapsible content component with smooth animations for showing and hiding content.",
          files: [file("components/core/accordion.tsx", "registry:component")],
          categories: ["ui", "motion-primitives"],
        },
        {
          name: "text-effect",
          type: "registry:ui",
          title: "Text Effect",
          description: "A component that applies animated effects to text content.",
          files: [file("components/core/text-effect.tsx", "registry:component")],
          categories: ["ui", "motion-primitives"],
        },
      ],
    },
    ids: ["accordion", "text-effect"],
    query: "collapsible",
    found: ["accordion"],
    item: "accordion",
    itemUrl: "https://motion-primitives.com/c/accordion.json",
    files: [
      file(
        "accordion.tsx",
        "registry:ui",
        "'use client';\nimport { motion } from 'motion/react';\n",
      ),
    ],
    code: { tsx: "'use client';\nimport { motion } from 'motion/react';\n" },
    url: "https://motion-primitives.com/docs/accordion",
    license: "MIT",
  },
  {
    id: "kiboui",
    index: "https://www.kibo-ui.com/r/registry.json",
    indexBody: {
      name: "Kibo UI Registry",
      homepage: "https://www.kibo-ui.com/",
      items: [
        {
          name: "announcement",
          type: "registry:ui",
          title: "announcement",
          description: "A compound badge designed to display an announcement.",
          files: [
            file("index.tsx", "registry:ui", 'import { Badge } from "@/components/ui/badge";'),
          ],
        },
        {
          name: "kanban",
          type: "registry:ui",
          title: "kanban",
          description:
            "A kanban board is a visual tool that helps you manage and visualize your work.",
          files: [file("index.tsx", "registry:ui", '"use client";')],
        },
        { name: "typography", type: "registry:style", title: "typography" }, // style: dropped
      ],
    },
    ids: ["announcement", "kanban"],
    query: "kanban board",
    found: ["kanban"],
    item: "announcement",
    itemUrl: "https://www.kibo-ui.com/r/announcement.json",
    files: [
      file(
        "index.tsx",
        "registry:ui",
        'import type { ComponentProps } from "react";\nimport { Badge } from "@/components/ui/badge";\n',
      ),
    ],
    code: {
      tsx: 'import type { ComponentProps } from "react";\nimport { Badge } from "@/components/ui/badge";\n',
    },
    url: "https://www.kibo-ui.com/components/announcement",
    license: "MIT",
  },
  {
    id: "cossui",
    index: "https://coss.com/ui/r/registry.json",
    indexBody: {
      homepage: "https://coss.com",
      name: "coss ui",
      items: [
        // The bundle of every component and the font entries have no files: dropped.
        { name: "ui", registryDependencies: ["@coss/accordion"], type: "registry:ui" },
        {
          dependencies: ["@base-ui/react"],
          files: [file("registry/default/ui/accordion.tsx", "registry:ui")],
          name: "accordion",
          type: "registry:ui",
        },
        {
          categories: ["badge"],
          description: "Secondary badge",
          files: [file("registry/default/particles/p-badge-3.tsx", "registry:block")],
          name: "p-badge-3",
          registryDependencies: ["@coss/badge"],
          type: "registry:block",
        },
        { name: "font-sans", type: "registry:font" },
      ],
    },
    ids: ["accordion", "p-badge-3"],
    query: "secondary badge",
    found: ["p-badge-3"],
    item: "accordion",
    itemUrl: "https://coss.com/ui/r/accordion.json",
    files: [
      file(
        "registry/default/ui/accordion.tsx",
        "registry:ui",
        '"use client";\n\nimport { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";\n',
      ),
    ],
    code: {
      tsx: '"use client";\n\nimport { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";\n',
    },
    url: "https://coss.com/ui",
    license:
      "MIT (apps/ui of cosscom/coss, per its LICENSING.md; the rest of that repo is AGPL-3.0)",
  },
  {
    id: "kokonutui",
    index: "https://kokonutui.com/r/registry.json",
    indexBody: {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "kokonut-ui",
      homepage: "https://kokonutui.com",
      items: [
        {
          name: "ai-prompt",
          type: "registry:component",
          title: "AI Input Selector",
          description:
            "Animated AI chat input with model selection dropdown, file attachment and auto-resizing textarea. Built with React, Tailwind CSS and Motion.",
          files: [
            file("components/kokonutui/ai-prompt.tsx", "registry:component"),
            file("hooks/use-auto-resize-textarea.ts", "registry:hook"),
          ],
        },
        {
          name: "use-click-outside",
          type: "registry:hook",
          title: "Use Click Outside",
          files: [file("hooks/use-click-outside.ts", "registry:hook")],
        },
      ],
    },
    ids: ["ai-prompt", "use-click-outside"],
    query: "model selection",
    found: ["ai-prompt"],
    item: "ai-prompt",
    itemUrl: "https://kokonutui.com/r/ai-prompt.json",
    files: [
      file(
        "/components/kokonutui/ai-prompt.tsx",
        "registry:component",
        '"use client";\n\n/**\n * @author: @kokonutui\n * @license: MIT\n */\n',
      ),
      file(
        "/hooks/use-auto-resize-textarea.ts",
        "registry:hook",
        'import { useCallback, useEffect, useRef } from "react";\n',
      ),
    ],
    code: {
      tsx: '"use client";\n\n/**\n * @author: @kokonutui\n * @license: MIT\n */\n',
      ts: 'import { useCallback, useEffect, useRef } from "react";\n',
    },
    url: "https://kokonutui.com/",
    license: "MIT",
  },
  {
    id: "eldoraui",
    index: "https://www.eldoraui.site/r/registry.json",
    indexBody: {
      name: "eldoraui",
      homepage: "https://eldoraui.site",
      items: [
        { name: "index", files: [], type: "registry:style" },
        {
          name: "safari-browser",
          title: "safari-browser",
          description: "A safari browser component.",
          files: [file("registry/eldoraui/safari-browser.tsx", "registry:ui")],
          type: "registry:ui",
        },
        {
          name: "safari-browser-demo",
          title: "safari-browser-demo",
          description: "Example showing a safari-browser-demo component.",
          files: [file("registry/example/safari-browser-demo.tsx", "registry:example")],
          type: "registry:example",
        },
      ],
    },
    ids: ["safari-browser", "safari-browser-demo"],
    query: "demo",
    found: ["safari-browser-demo"],
    item: "safari-browser",
    itemUrl: "https://www.eldoraui.site/r/safari-browser.json",
    files: [
      file(
        "registry/eldoraui/safari-browser.tsx",
        "registry:ui",
        'import type { SVGProps } from "react"\n\nexport interface SafariProps extends SVGProps<SVGSVGElement> {}\n',
      ),
    ],
    code: {
      tsx: 'import type { SVGProps } from "react"\n\nexport interface SafariProps extends SVGProps<SVGSVGElement> {}\n',
    },
    url: "https://www.eldoraui.site/",
    license: "MIT",
  },
  {
    id: "uilayouts",
    index: "https://www.ui-layouts.com/r/registry.json",
    indexBody: {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "ui-layouts",
      homepage: "https://www.ui-layouts.com",
      items: [
        {
          name: "btn-bg-shine",
          type: "registry:component",
          files: [file("./registry/components/button/btn-bg-shine.tsx", "registry:component")],
        },
        {
          name: "hero-digital-success",
          type: "registry:block",
          files: [
            file(
              "../../packages/blocks/src/hero-section/hero-digital-success.tsx",
              "registry:block",
            ),
            file("./components/ui/timeline-animation.tsx", "registry:ui"),
          ],
        },
      ],
    },
    ids: ["btn-bg-shine", "hero-digital-success"],
    query: "shine",
    found: ["btn-bg-shine"],
    item: "btn-bg-shine",
    itemUrl: "https://www.ui-layouts.com/r/btn-bg-shine.json",
    files: [
      file(
        "./registry/components/button/btn-bg-shine.tsx",
        "registry:component",
        "'use client';\n\nconst ButtonBackgroundShine = () => <button className='animate-background-shine' />;\n",
      ),
    ],
    code: {
      tsx: "'use client';\n\nconst ButtonBackgroundShine = () => <button className='animate-background-shine' />;\n",
    },
    url: "https://www.ui-layouts.com/",
    license: "MIT",
  },
  {
    id: "smoothui",
    heavy: true,
    index: "https://smoothui.dev/r/registry.json",
    indexBody: {
      homepage: "https://smoothui.dev/",
      name: "SmoothUI Registry",
      items: [
        {
          name: "cli", // a vitest file published as a component: dropped
          type: "registry:ui",
          title: "Cli",
          files: [
            file("package-isolation.test.ts", "registry:ui", 'import { describe } from "vitest";'),
          ],
        },
        {
          name: "magnetic-button",
          type: "registry:ui",
          title: "Magnetic Button",
          description: "Button that subtly follows the cursor with magnetic effect",
          files: [file("index.tsx", "registry:ui", '"use client";')],
        },
        { name: "theme-candy", type: "registry:theme", title: "SmoothUI Candy" },
      ],
    },
    ids: ["magnetic-button"],
    query: "magnetic cursor",
    found: ["magnetic-button"],
    item: "magnetic-button",
    itemUrl: "https://smoothui.dev/r/magnetic-button.json",
    files: [
      file(
        "index.tsx",
        "registry:ui",
        '"use client";\n\nimport { Slot } from "@radix-ui/react-slot";\nimport { cn } from "@/lib/utils";\n',
      ),
    ],
    code: {
      tsx: '"use client";\n\nimport { Slot } from "@radix-ui/react-slot";\nimport { cn } from "@/lib/utils";\n',
    },
    url: "https://smoothui.dev/",
    license: "MIT",
  },
  {
    id: "aielements",
    index: "https://elements.ai-sdk.dev/api/registry/registry.json",
    indexBody: {
      homepage: "https://elements.ai-sdk.dev/elements",
      name: "ai-elements",
      items: [
        {
          description: "AI-powered agent component.",
          files: [file("registry/default/ai-elements/agent.tsx", "registry:component")],
          name: "agent",
          title: "Agent",
          type: "registry:component",
        },
        {
          files: [file("registry/default/examples/agent.tsx", "registry:block")],
          name: "example-agent",
          title: "Agent Example",
          type: "registry:block",
        },
      ],
    },
    ids: ["agent", "example-agent"],
    // Components have a docs page; examples fall back to the homepage.
    summaryUrls: {
      agent: "https://elements.ai-sdk.dev/components/agent",
      "example-agent": "https://elements.ai-sdk.dev/",
    },
    query: "example",
    found: ["example-agent"],
    item: "agent",
    itemUrl: "https://elements.ai-sdk.dev/api/registry/agent.json",
    files: [
      file(
        "registry/default/ai-elements/agent.tsx",
        "registry:component",
        '"use client";\n\nimport { Badge } from "@/registry/default/ui/badge";\n',
      ),
    ],
    code: { tsx: '"use client";\n\nimport { Badge } from "@/registry/default/ui/badge";\n' },
    url: "https://elements.ai-sdk.dev/components/agent",
    license: "Apache-2.0",
  },
  {
    id: "svgl",
    index: "https://svgl.app/r/registry.json",
    indexBody: {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "svgl",
      homepage: "https://svgl.app",
      items: [
        {
          name: "ossium",
          type: "registry:component",
          title: "ossium",
          files: [file("././static/components-generated/ossiumLogo.tsx", "registry:component")],
        },
        {
          name: "arc",
          type: "registry:component",
          title: "arc",
          files: [file("././static/components-generated/arc.tsx", "registry:component")],
        },
        {
          name: "arc", // listed again for another variant: kept once
          type: "registry:component",
          title: "arc",
          files: [file("././static/components-generated/arcBrowser.tsx", "registry:component")],
        },
      ],
    },
    ids: ["ossium", "arc"],
    query: "arc",
    found: ["arc"],
    item: "ossium",
    itemUrl: "https://svgl.app/r/ossium.json",
    files: [
      file(
        "static/components-generated/ossiumLogo.tsx",
        "registry:component",
        'import type { SVGProps } from "react";\n\nconst OssiumLogo = (props: SVGProps<SVGSVGElement>) => <svg {...props} />;\n',
      ),
    ],
    code: {
      tsx: 'import type { SVGProps } from "react";\n\nconst OssiumLogo = (props: SVGProps<SVGSVGElement>) => <svg {...props} />;\n',
    },
    url: "https://svgl.app/",
    license:
      "MIT for the SVGL code; each logo is a trademark of its owner, so follow the brand's usage guidelines",
  },
];

describe("community registries", () => {
  it("registers every registry here, plus tweakcn and the directory", () => {
    assert.deepEqual(
      communityRegistries.map((a) => a.id),
      [...CASES.map((c) => c.id), "tweakcn", "shadcndirectory"],
    );
  });

  for (const c of CASES) {
    it(`${c.id}: lists its items, finds "${c.query}" and returns ${c.item}'s code`, async () => {
      const a = communityRegistries.find((x) => x.id === c.id);
      const type = c.indexBody.items.find((i) => i?.name === c.item)?.type;
      const item = {
        $schema: "https://ui.shadcn.com/schema/registry-item.json",
        name: c.item,
        type,
      };
      const calls = mockFetch((url) => {
        if (url === c.index) return { body: JSON.stringify(c.indexBody) };
        if (url === c.itemUrl) return { body: JSON.stringify({ ...item, files: c.files }) };
        return { status: 404 };
      });
      assert.equal(a.hasInlineCode, true);
      assert.equal(a.heavy === true, c.heavy === true, `${c.id}: heavy`);

      const all = await a.search({});
      assert.deepEqual(
        all.map((r) => r.id),
        c.ids,
      );
      for (const [id, url] of Object.entries(c.summaryUrls ?? {})) {
        assert.equal(all.find((r) => r.id === id)?.url, url, `${c.id}/${id} url`);
      }
      assert.deepEqual(
        (await a.search({ query: c.query })).map((r) => r.id),
        c.found,
      );

      const d = await a.getResource(c.item);
      assert.equal(d.id, c.item);
      assert.deepEqual(d.code, c.code);
      assert.equal(d.license, c.license);
      assert.equal(d.url, c.url);
      assert.equal(d.extra.install, `npx shadcn@latest add ${c.itemUrl}`);
      // One index download for both searches, then the item itself.
      assert.deepEqual(calls, [c.index, c.itemUrl]);
    });
  }

  it("returns null for an item the registry does not have", async () => {
    const a = communityRegistries.find((x) => x.id === "kokonutui");
    const calls = mockFetch(() => ({ status: 404 }));
    assert.equal(await a.getResource("no-such-item"), null);
    assert.deepEqual(calls, ["https://kokonutui.com/r/no-such-item.json"]);
  });
});

describe("codeItems", () => {
  const ui = (name, path = `ui/${name}.tsx`) => ({ name, type: "registry:ui", files: [{ path }] });
  const names = (payload) => codeItems(payload).map((i) => i.name);

  it("reads both index shapes and keeps items that ship code, each name once", () => {
    const items = [
      ui("button"),
      { name: "bundle", type: "registry:ui", registryDependencies: ["@x/button"] }, // no files
      { name: "alias", type: "registry:ui", files: [] },
      ui("cli", "package-isolation.test.ts"), // tests only
      { name: "card", files: [{ path: "card.spec.tsx" }, { path: "card.tsx" }] },
      ui("button", "ui/button-v2.tsx"), // the same name again
      { files: [{ path: "nameless.tsx" }] },
      null,
    ];
    assert.deepEqual(names(items), ["button", "card"]);
    assert.deepEqual(names({ items }), ["button", "card"]);
    assert.equal(codeItems(items)[0].files[0].path, "ui/button.tsx"); // the first one wins
  });

  it("returns nothing for payloads that are not an index", () => {
    for (const p of [null, undefined, "items", 3, {}, { items: "x" }]) {
      assert.deepEqual(codeItems(p), []);
    }
  });
});
