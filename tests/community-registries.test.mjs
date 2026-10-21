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
  {
    id: "hextaui",
    index: "https://hextaui.com/r/registry.json",
    indexBody: {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "hextaui",
      homepage: "https://hextaui.com",
      items: [
        { name: "theme", type: "registry:theme", title: "Theme" }, // theme: dropped
        {
          name: "use-autosize",
          type: "registry:hook",
          title: "useAutosize",
          description:
            "Grows a textarea with what you write between its minimum and maximum height, animating each change without ever touching the text.",
          files: [file("hooks/use-autosize.ts", "registry:hook")],
        },
        {
          name: "accordion",
          type: "registry:ui",
          title: "Accordion",
          description:
            "Stacked headings that each reveal a panel, with height motion you can reverse mid-way and panels that stay searchable while closed.",
          categories: ["layout"],
          files: [file("components/ui/accordion.tsx", "registry:ui")],
        },
        {
          name: "accordion-controlled",
          type: "registry:example",
          title: "Accordion: Controlled",
          description: "The Controlled example from the Accordion docs.",
          files: [file("components/examples/accordion/controlled.tsx", "registry:example")],
        },
      ],
    },
    ids: ["use-autosize", "accordion", "accordion-controlled"],
    query: "textarea",
    found: ["use-autosize"],
    item: "use-autosize",
    itemUrl: "https://hextaui.com/r/use-autosize.json",
    files: [
      file(
        "hooks/use-autosize.ts",
        "registry:hook",
        'import * as React from "react"\n\nimport { easeOut, prefersReducedMotion } from "@/lib/motion"\n',
      ),
    ],
    code: {
      ts: 'import * as React from "react"\n\nimport { easeOut, prefersReducedMotion } from "@/lib/motion"\n',
    },
    url: "https://hextaui.com/",
    license: "MIT",
  },
  {
    id: "reui",
    heavy: true,
    index: "https://reui.io/r/styles/base-nova/registry.json",
    indexBody: {
      name: "reui",
      homepage: "https://reui.io",
      items: [
        {
          name: "alert",
          type: "registry:ui",
          title: "Alert",
          description: "",
          files: [file("alert.tsx", "registry:ui")],
        },
        {
          name: "c-alert-1",
          type: "registry:block",
          title: "Basic alert",
          description: "Basic alert",
          files: [file("c-alert-1.tsx", "registry:block")],
        },
        {
          name: "agent-activity-1", // a paid block (it answers 401): dropped by name
          type: "registry:block",
          title:
            "Agent run console that stops at approval steps for an inline Approve, Revise or Deny",
          files: [file("page.tsx", "registry:block"), file("agent-activity.tsx", "registry:block")],
        },
        {
          name: "use-copy-to-clipboard",
          type: "registry:hook",
          title: "Use Copy To Clipboard",
          description: "",
          files: [file("use-copy-to-clipboard.ts", "registry:hook")],
        },
      ],
    },
    ids: ["alert", "c-alert-1", "use-copy-to-clipboard"],
    query: "basic alert",
    found: ["c-alert-1"],
    item: "c-alert-1",
    itemUrl: "https://reui.io/r/styles/base-nova/c-alert-1.json",
    files: [
      file(
        "c-alert-1.tsx",
        "registry:block",
        'import {\n  Alert,\n  AlertDescription,\n  AlertTitle,\n} from "@/components/reui/alert"\n',
      ),
    ],
    code: {
      tsx: 'import {\n  Alert,\n  AlertDescription,\n  AlertTitle,\n} from "@/components/reui/alert"\n',
    },
    url: "https://reui.io/",
    license: "MIT",
  },
  {
    id: "cnippetui",
    index: "https://ui.cnippet.dev/r/registry.json",
    indexBody: {
      name: "cnippet ui",
      homepage: "https://ui.cnippet.dev",
      items: [
        { name: "ui", type: "registry:ui" }, // the bundle of every component has no files: dropped
        {
          name: "accordion",
          type: "registry:ui",
          files: [file("registry/default/ui/accordion.tsx", "registry:ui")],
        },
        {
          name: "v-accordion-2",
          type: "registry:block",
          description: "Single Accordion",
          categories: ["accordion"],
          files: [file("registry/default/variants/v-accordion-2.tsx", "registry:block")],
        },
        {
          name: "m-typewriter-1",
          type: "registry:block",
          description: "Hero headline — types once with a block-underscore cursor",
          categories: ["typewriter"],
          files: [file("registry/default/motion-variants/m-typewriter-1.tsx", "registry:block")],
        },
        { name: "font-sans", type: "registry:font" },
      ],
    },
    ids: ["accordion", "v-accordion-2", "m-typewriter-1"],
    query: "typewriter cursor",
    found: ["m-typewriter-1"],
    item: "m-typewriter-1",
    itemUrl: "https://ui.cnippet.dev/r/m-typewriter-1.json",
    files: [
      file(
        "registry/default/motion-variants/m-typewriter-1.tsx",
        "registry:block",
        'import { Typewriter } from "@/registry/default/motion/typewriter";\n',
      ),
    ],
    code: { tsx: 'import { Typewriter } from "@/registry/default/motion/typewriter";\n' },
    url: "https://ui.cnippet.dev/",
    license: "MIT",
  },
  {
    id: "systalikoui",
    index: "https://systaliko-ui.vercel.app/r/registry.json",
    indexBody: {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "systaliko",
      homepage: "https://systaliko.com",
      items: [
        { name: "index", type: "registry:style", files: [] },
        {
          name: "animated-menu",
          type: "registry:block",
          title: "Animated Menu",
          description: "Animated menu, with orchestrated children animation, fully customizable.",
          files: [file("registry/blocks/animated-menu/index.tsx", "registry:block")],
        },
        {
          name: "text-stagger-inview",
          type: "registry:ui",
          title: "Text Stagger Inview",
          description:
            "Splitted text animation with staggered reveal triggered by view, You can easily customize by controlling the animation property (transform, opacity, blur) and the stagger value, and the transition.",
          files: [file("registry/text/text-stagger-inview/index.tsx", "registry:ui")],
        },
        {
          name: "badge",
          type: "registry:ui",
          title: "Badge",
          description: "Badge component with variants.",
          files: [file("registry/shadcn/badge/index.tsx", "registry:ui")],
        },
        {
          name: "badge", // the button, published under the badge's name: the first one wins
          type: "registry:ui",
          title: "Button",
          description: "Button component with variants.",
          files: [file("registry/shadcn/button/index.tsx", "registry:ui")],
        },
      ],
    },
    ids: ["animated-menu", "text-stagger-inview", "badge"],
    query: "staggered reveal",
    found: ["text-stagger-inview"],
    item: "text-stagger-inview",
    itemUrl: "https://systaliko-ui.vercel.app/r/text-stagger-inview.json",
    files: [
      file(
        "registry/text/text-stagger-inview/index.tsx",
        "registry:ui",
        "'use client';\nimport * as React from 'react';\n",
      ),
    ],
    code: { tsx: "'use client';\nimport * as React from 'react';\n" },
    url: "https://systaliko-ui.vercel.app/",
    license: "MIT",
  },
  {
    id: "uitripled",
    index: "https://ui.tripled.work/r/registry.json",
    indexBody: {
      items: [
        {
          name: "ai-glow-input-shadcnui",
          type: "registry:component",
          title: "AI Glow Input",
          description:
            "Input field with dynamic glow that pulses based on typing speed - smart motion feedback",
          files: [
            file(
              "@uitripled/react-shadcn/src/components/motion-core/ai-glow-input.tsx",
              "registry:component",
            ),
          ],
        },
        {
          name: "about-us-section-baseui",
          type: "registry:block",
          title: "About Us",
          description:
            "About us section with value cards, icons, and animated reveal effects (Base UI)",
          files: [
            file(
              "@uitripled/react-baseui/src/components/sections/about-us-section-baseui.tsx",
              "registry:block",
            ),
          ],
        },
      ],
    },
    ids: ["ai-glow-input-shadcnui", "about-us-section-baseui"],
    query: "value cards",
    found: ["about-us-section-baseui"],
    item: "about-us-section-baseui",
    itemUrl: "https://ui.tripled.work/r/about-us-section-baseui.json",
    files: [
      file(
        "@uitripled/react-baseui/src/components/sections/about-us-section-baseui.tsx",
        "registry:block",
        '"use client";\n\nimport { motion, Variants } from "framer-motion";\n',
      ),
    ],
    code: { tsx: '"use client";\n\nimport { motion, Variants } from "framer-motion";\n' },
    url: "https://ui.tripled.work/",
    license: "MIT",
  },
  {
    id: "ruixenui",
    // The index sits at the site root, the items under /r/.
    index: "https://ruixen.com/registry.json",
    indexBody: {
      name: "ruixen-ui",
      homepage: "https://ruixen.com",
      items: [
        { name: "index", type: "registry:style", files: [] },
        {
          name: "halo-reel",
          type: "registry:ui",
          title: "Halo Reel",
          description:
            "Image cards riding an ellipse — cos θ places each card, sizes it and stacks it, so the near side of the ring is large and the far side small.",
          files: [file("registry/ruixenui/halo-reel.tsx", "registry:ui")],
        },
        {
          name: "halo-reel-demo",
          type: "registry:example",
          title: "Halo Reel Demo",
          description:
            "Example of an image ring that turns on its own, pauses on hover, and spins under a drag.",
          files: [file("registry/example/halo-reel-demo.tsx", "registry:example")],
        },
      ],
    },
    ids: ["halo-reel", "halo-reel-demo"],
    query: "ellipse",
    found: ["halo-reel"],
    item: "halo-reel-demo",
    itemUrl: "https://ruixen.com/r/halo-reel-demo.json",
    files: [
      file(
        "registry/example/halo-reel-demo.tsx",
        "registry:example",
        '"use client";\n\nimport { HaloReel, type HaloReelItem } from "@/registry/ruixenui/halo-reel";\n',
      ),
    ],
    code: {
      tsx: '"use client";\n\nimport { HaloReel, type HaloReelItem } from "@/registry/ruixenui/halo-reel";\n',
    },
    url: "https://ruixen.com/",
    license: "MIT",
  },
  {
    id: "uselayouts",
    index: "https://uselayouts.com/r/registry.json",
    indexBody: {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "uselayouts",
      homepage: "https://uselayouts.com",
      items: [
        {
          name: "3d-book",
          type: "registry:component",
          title: "3D Book",
          description: "An interactive 3D book component with page flip animations.",
          files: [file("registry/default/example/3d-book.tsx", "registry:component")],
        },
        {
          name: "gooey-navbar",
          type: "registry:component",
          title: "Gooey Navbar",
          description:
            "A pill nav that melts into its neighbor when you hover — liquid bridges, active dot.",
          files: [file("registry/default/example/gooey-navbar.tsx", "registry:component")],
        },
      ],
    },
    ids: ["3d-book", "gooey-navbar"],
    query: "page flip",
    found: ["3d-book"],
    item: "gooey-navbar",
    itemUrl: "https://uselayouts.com/r/gooey-navbar.json",
    files: [
      file(
        "registry/default/example/gooey-navbar.tsx",
        "registry:component",
        '"use client";\n\nimport React, { useState, useEffect, useRef } from "react";\n',
      ),
    ],
    code: { tsx: '"use client";\n\nimport React, { useState, useEffect, useRef } from "react";\n' },
    url: "https://uselayouts.com/",
    license: "MIT",
  },
  {
    id: "spellui",
    index: "https://spell.sh/r/registry.json",
    indexBody: {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "spell-ui",
      homepage: "https://spell.sh",
      items: [
        {
          name: "blur-reveal",
          type: "registry:component",
          title: "Blur Reveal",
          description: "Animated text reveal with blur effect.",
          files: [file("registry/spell-ui/blur-reveal.tsx", "registry:component")],
        },
        {
          name: "text-marquee",
          type: "registry:component",
          title: "Text Marquee",
          description: "Animated text marquee component with vertical scrolling.",
          files: [file("registry/spell-ui/text-marquee.tsx", "registry:component")],
        },
      ],
    },
    ids: ["blur-reveal", "text-marquee"],
    query: "vertical scrolling",
    found: ["text-marquee"],
    item: "text-marquee",
    itemUrl: "https://spell.sh/r/text-marquee.json",
    files: [
      file(
        "registry/spell-ui/text-marquee.tsx",
        "registry:component",
        '"use client";\n\nimport React from "react";\nimport { cn } from "@/lib/utils";\n',
      ),
    ],
    code: {
      tsx: '"use client";\n\nimport React from "react";\nimport { cn } from "@/lib/utils";\n',
    },
    url: "https://spell.sh/",
    license: "MIT",
  },
  {
    id: "jollyui",
    index: "https://www.jollyui.dev/r/index.json",
    // A legacy (shadcn v2) index: a bare array.
    indexBody: [
      {
        name: "breadcrumbs",
        type: "registry:ui",
        dependencies: ["react-aria-components"],
        registryDependencies: ["button"],
        files: [file("ui/breadcrumbs.tsx", "registry:ui")],
      },
      { name: "meter", type: "registry:ui", files: [file("ui/meter.tsx", "registry:ui")] },
    ],
    ids: ["breadcrumbs", "meter"],
    query: "meter",
    found: ["meter"],
    item: "meter",
    itemUrl: "https://www.jollyui.dev/r/styles/default/meter.json",
    files: [
      file("ui/meter.tsx", "registry:ui", '"use client"\n\nimport * as React from "react"\n'),
    ],
    code: { tsx: '"use client"\n\nimport * as React from "react"\n' },
    url: "https://www.jollyui.dev/",
    license: "MIT",
  },
  {
    id: "assistantui",
    index: "https://r.assistant-ui.com/registry.json",
    indexBody: {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "assistant-ui",
      homepage: "https://assistant-ui.com",
      items: [
        {
          name: "elements-tool-call",
          type: "registry:component",
          title: "Tool call",
          description:
            "One tool invocation with its request and result tucked behind a disclosure.",
          files: [file("components/assistant-ui/elements/tool-call.tsx", "registry:component")],
          dependencies: ["lucide-react"],
        },
        {
          name: "shimmer-style", // a style without files: dropped
          type: "registry:style",
          title: "Shimmer Style",
          description: "Keyframes and theme variables for the streaming shimmer animation.",
        },
        {
          name: "thread",
          type: "registry:component",
          title: "Thread",
          description:
            "Chat container with message list, composer, auto scroll, and accessibility built in.",
          files: [file("components/assistant-ui/elements/thread.aui.tsx", "registry:component")],
        },
        {
          name: "use-copy-to-clipboard",
          type: "registry:hook",
          title: "Use Copy To Clipboard",
          description: "Copy text to the clipboard with a temporary copied state.",
          files: [file("hooks/use-copy-to-clipboard.ts", "registry:hook")],
        },
      ],
    },
    ids: ["elements-tool-call", "thread", "use-copy-to-clipboard"],
    query: "auto scroll",
    found: ["thread"],
    item: "elements-tool-call",
    itemUrl: "https://r.assistant-ui.com/elements-tool-call.json",
    files: [
      file(
        "components/assistant-ui/elements/tool-call.tsx",
        "registry:component",
        '"use client";\n\nimport { CheckIcon, ChevronRightIcon } from "lucide-react";\n',
      ),
    ],
    code: { tsx: '"use client";\n\nimport { CheckIcon, ChevronRightIcon } from "lucide-react";\n' },
    url: "https://www.assistant-ui.com/",
    license: "MIT",
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
      const listed = Array.isArray(c.indexBody) ? c.indexBody : c.indexBody.items;
      const type = listed.find((i) => i?.name === c.item)?.type;
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
