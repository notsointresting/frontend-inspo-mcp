# frontend-inspo-mcp 🎨

> **A local MCP server that lets AI coding agents discover and pull real frontend code, UI components, design mockups, design-system tokens, 3D/WebGL source, and agent guidance** — across **65 sources**, from shadcn-schema component registries to pmndrs 3D libraries, HTML/CSS galleries, design-token APIs, and free asset libraries.

[![npm version](https://img.shields.io/npm/v/frontend-inspo-mcp.svg)](https://www.npmjs.com/package/frontend-inspo-mcp)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-server-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-22%2B-339933)](https://nodejs.org/)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/15252/badge)](https://www.bestpractices.dev/projects/15252)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

Give Claude, Cursor, Kiro, or any MCP-compatible agent instant access to **thousands of
copy-paste UI components and free design assets** — with the **actual source code**, not
just links. Ask for "a glassmorphism card" or "an animated shadcn button" and get real,
usable code back.

## 📦 Install from npm (no clone needed)

Add this to your MCP client config and restart it; `npx` fetches and runs the server for you:

```json
{
  "mcpServers": {
    "frontend-inspo": {
      "command": "npx",
      "args": ["-y", "frontend-inspo-mcp"]
    }
  }
}
```

- **Claude Desktop** — paste it into `claude_desktop_config.json`
  (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`).
- **Claude Code** — run `claude mcp add frontend-inspo -- npx -y frontend-inspo-mcp`,
  or put the same JSON in a project-level `.mcp.json`.
- **Cursor** — paste it into `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per project).

Prefer to hack on it? See [Quick start](#-quick-start) to run from source.

## 🎬 Demo

<!-- TODO: replace with recorded demo video -->
Demo video coming soon.

---

## ✨ Why use this?

Most component galleries are built for humans clicking around a browser. This server makes
them **agent-readable**, so your AI assistant can search, compare, and paste real code
directly into your project.

- 🔍 **Search 65 sources** through one consistent set of tools
- 📋 **Get real code** — React/TSX, Tailwind, vanilla HTML/CSS/JS, GLSL, design tokens
- 🎨 **Design systems & tokens** — DESIGN.md, Tailwind themes, CSS variables, color/gradient/font tokens
- 🧊 **3D & WebGL** — three.js, the pmndrs ecosystem (drei, R3F, postprocessing, rapier, uikit…), shaders
- 🎭 **Free design assets** — mockups (Figma / Sketch / PSD), HDRIs, PBR textures
- 🧭 **Agent guidance** — curated R3F, GSAP, accessibility (APG) and Baseline compat references
- ⚡ **Fast & polite** — in-memory + optional disk cache, per-host throttling, deadline-bounded parallel search
- 🧩 **Pluggable** — add a new source in one small adapter file

## 📚 Sources (65)

Every source is public and read-only. Content is returned as **reference data, never executed**.
`heavy` sources (large downloads or tight quotas) are skipped by `search_all` unless you name them
in its `sources` argument. Call `list_sources` for the live list with each source's `idFormat`.

### shadcn-schema component registries (React + Tailwind)

| Source | What it gives you | Inline code? |
| --- | --- | :---: |
| **[shadcn/ui](https://ui.shadcn.com/)** | React + Tailwind v4 + Radix components, blocks, charts (24 style variants) | ✅ |
| **[Magic UI](https://magicui.design/)** | Animated React + Framer Motion components | ✅ |
| **[Aceternity UI](https://ui.aceternity.com/)** | Bold animated React + Tailwind components | ✅ |
| **[React Bits](https://reactbits.dev/)** | Animated React components (JS/TS, CSS/Tailwind) | ✅ |
| **[Fancy Components](https://fancycomponents.dev/)** | Motion, scroll, text-physics & 2D effect components | ✅ |
| **[VengeanceUI](https://github.com/Ashutoshx7/VengeanceUI)** | Animated React + Tailwind + Framer Motion components | ✅ |
| **[Canvas UI](https://canvasui.dev/)** | WebGL/WebGPU canvas components (React/Vue/Svelte/Solid/Preact/vanilla) | ✅ |
| **[Cult UI](https://www.cult-ui.com/)** | Animated React + Tailwind + Framer Motion components | ✅ |
| **[Motion Primitives](https://motion-primitives.com/)** | Motion-first React + Tailwind + Framer Motion primitives | ✅ |
| **[Kibo UI](https://www.kibo-ui.com/)** | Composable shadcn-registry React + Tailwind components | ✅ |
| **[coss ui](https://coss.com/)** | React + Tailwind application components | ✅ |
| **[Kokonut UI](https://kokonutui.com/)** | Animated React + Tailwind components | ✅ |
| **[Eldora UI](https://www.eldoraui.site/)** | Animated React + Tailwind components | ✅ |
| **[UI Layouts](https://www.ui-layouts.com/)** | Animated React + Tailwind layout components | ✅ |
| **[SmoothUI](https://smoothui.dev/)** · _heavy_ | Animated React + Tailwind components | ✅ |
| **[AI Elements](https://ai-sdk.dev/elements)** | React + Tailwind building blocks for AI chat UIs | ✅ |
| **[SVGL](https://svgl.app/)** | SVG brand logos as React components | ✅ |
| **[Watermelon UI](https://ui.watermelon.sh/)** | React components, blocks, dashboards, templates | ✅ |

### HTML / CSS / Tailwind galleries

| Source | What it gives you | Inline code? |
| --- | --- | :---: |
| **[FreeFrontend](https://freefrontend.com/)** | HTML / CSS / JS / Bootstrap / Tailwind snippets (~900 collections) | ✅ |
| **[Uiverse](https://uiverse.io/)** | Community HTML/CSS + Tailwind UI elements | ✅ |
| **[HyperUI](https://www.hyperui.dev/)** | Copy-paste Tailwind HTML components | ✅ |
| **[Meraki UI](https://merakiui.com/)** | Tailwind HTML components (RTL-ready) | ✅ |
| **[Pines](https://devdojo.com/pines)** | Alpine.js + Tailwind UI library | ✅ |
| **[daisyUI](https://daisyui.com/)** | Tailwind CSS component classes | ✅ |
| **[Flowbite](https://flowbite.com/)** | Tailwind HTML + JS components | ✅ |

### Design systems, tokens & fonts

| Source | What it gives you | Inline code? |
| --- | --- | :---: |
| **[Refero Styles](https://styles.refero.design/)** | Design systems from real sites — DESIGN.md, Tailwind, CSS vars, tokens | ✅ |
| **[tweakcn](https://tweakcn.com/)** | shadcn theme presets — CSS variables & Tailwind themes | ✅ |
| **[Open Props](https://open-props.style/)** | Open-source CSS custom-property design tokens | ✅ |
| **[Radix Colors](https://www.radix-ui.com/colors)** | Accessible color scales as CSS/JS tokens | ✅ |
| **[Fontsource](https://fontsource.org/)** | Self-hostable open-source font packages & metadata | ✅ |
| **[uiGradients](https://uigradients.com/)** | Curated CSS gradient presets | ✅ |
| **[awesome-design-md](https://github.com/beije/awesome-design-md)** | Curated DESIGN.md design-system references | ✅ |
| **[shadcn Registry Directory](https://ui.shadcn.com/docs/registry)** | Directory of public shadcn registries to point tools at | — |

### 3D, WebGL & React Three Fiber

| Source | What it gives you | Inline code? |
| --- | --- | :---: |
| **[three.js](https://threejs.org/)** | Official examples — GLSL shaders, post-fx, loaders, controls | ✅ |
| **[drei](https://github.com/pmndrs/drei)** | React Three Fiber helper components | ✅ |
| **[React Three Fiber](https://r3f.docs.pmnd.rs/)** | Curated R3F guidance (bundled, offline) | ✅ |
| **[react-spring](https://github.com/pmndrs/react-spring)** | Spring-physics animation for React | ✅ |
| **[zustand](https://github.com/pmndrs/zustand)** | Minimal React state management | ✅ |
| **[glyph](https://github.com/pmndrs/glyph)** | GPU text/geometry glyph baking (TSL, typegpu) | ✅ |
| **[postprocessing](https://github.com/pmndrs/postprocessing)** | Post-processing effects + EffectComposer | ✅ |
| **[detect-gpu](https://github.com/pmndrs/detect-gpu)** | Classify a device's GPU tier | ✅ |
| **[uikit](https://github.com/pmndrs/uikit)** | Flexbox UI for R3F/three.js | ✅ |
| **[react-three-rapier](https://github.com/pmndrs/react-three-rapier)** | Physics for R3F (Rapier) | ✅ |
| **[leva](https://github.com/pmndrs/leva)** | React GUI controls/panels | ✅ |
| **[math (pmndrs)](https://github.com/pmndrs/maath)** | Math helpers for 3D | ✅ |
| **[OGL](https://github.com/oframe/ogl)** | Minimal WebGL library source | ✅ |
| **[WebGPU Samples](https://github.com/webgpu/webgpu-samples)** | Official WebGPU example source | ✅ |
| **[ShaderGradient](https://github.com/ruucm/shadergradient)** | Animated gradient meshes for R3F/three.js | ✅ |
| **[liquid-logo](https://github.com/collidingScopes/liquid-logo)** | Liquid-metal WebGL effect from a logo (GLSL) | ✅ |
| **[liquid-glass-js](https://github.com/dashersw/liquid-glass-js)** | Apple-style "liquid glass" refraction effect | ✅ |
| **[ThreeUI](https://threeui.com/browse)** · _heavy_ | Community Three.js/WebGL components & landing pages | ✅ |
| **[img2threejs](https://github.com/img2threejs/img2threejs)** | Image → three.js/GLB scene pipeline (Python) | ✅ |

### Animation & scroll

| Source | What it gives you | Inline code? |
| --- | --- | :---: |
| **[GSAP Skills](https://github.com/greensock/gsap-skills)** | Official GSAP agent guidance + runnable examples | ✅ |
| **[Lenis](https://github.com/darkroomengineering/lenis)** | Smooth-scroll library source | ✅ |
| **[Anime.js](https://github.com/juliangarnier/anime)** | JavaScript animation engine source | ✅ |
| **[Two.js](https://two.js.org/)** | 2D drawing / animation library source | ✅ |
| **[scrollama](https://github.com/russellsamora/scrollama)** | Scrollytelling library source | ✅ |
| **[Codrops demos](https://tympanus.net/codrops/)** · _heavy_ | Tutorial demo source (HTML/CSS/JS effects) | ✅ |

### Guidance, accessibility & compatibility

| Source | What it gives you | Inline code? |
| --- | --- | :---: |
| **[WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/)** | Accessible component patterns + example source | ✅ |
| **[Anthropic Agent Skills](https://github.com/anthropics/skills)** | Design-focused agent skills (guidance) | ✅ |
| **[Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)** | Web interface quality guidelines | ✅ |
| **[web-features (Baseline)](https://github.com/web-platform-dx/web-features)** · _heavy_ | Baseline browser-support data for web features | ✅ |

### Free design assets

| Source | What it gives you | Inline code? |
| --- | --- | :---: |
| **[LS.GRAPHICS](https://www.ls.graphics/free-mockups)** | Free design mockups (Figma / Sketch / PSD) | — |
| **[Poly Haven](https://polyhaven.com/)** · _heavy_ | CC0 HDRIs, textures and models | — |
| **[ambientCG](https://ambientcg.com/)** | CC0 PBR materials and textures | — |

> **Excluded on purpose.** Some popular sources are intentionally **not** included because their
> `robots.txt` disallows the needed path, or their license forbids redistribution: Iconify &
> Openverse (API path disallowed), 8bitcn / 21st.dev (`/r/` disallowed), Tailark & Preline (paid /
> fair-use), Animate UI (Commons Clause), and key-gated media APIs (Unsplash, Pexels, Sketchfab,
> Google Fonts API, LottieFiles). See [docs/security-assurance-case.md](docs/security-assurance-case.md).

## 🚀 Quick start

```bash
git clone https://github.com/notsointresting/frontend-inspo-mcp.git
cd frontend-inspo-mcp
npm install
npm run build
```

Requires **Node 22+** (uses the built-in `fetch` and current LTS APIs).

Run the offline unit tests (no network needed):

```bash
npm test
```

Verify every source is live:

```bash
npm run smoke   # hits all 65 sources and asserts parsing → prints ALL PASS
```

## 🔌 Add it to your MCP client

The server speaks MCP over **stdio**. Point your client at the built `dist/index.js`.

### Claude Desktop / Cursor / generic (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "frontend-inspo": {
      "command": "node",
      "args": ["/absolute/path/to/frontend-inspo-mcp/dist/index.js"]
    }
  }
}
```

### Claude Code (`~/.claude.json`, global `mcpServers`)

```json
{
  "mcpServers": {
    "frontend-inspo": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/frontend-inspo-mcp/dist/index.js"]
    }
  }
}
```

> On Windows use escaped backslashes, e.g. `"C:\\path\\to\\dist\\index.js"`.

## 🛠️ Tools

Every tool takes a `source` argument — one of the 65 ids returned by `list_sources`
(e.g. `shadcn`, `magicui`, `refero`, `threejs`, `drei`, `polyhaven`, `freefrontend`, `lsgraphics`).
Call `list_sources` first: it reports each source's `stack` tags, whether it returns inline code
(`hasInlineCode`), how to write its ids (`idFormat`), and whether `search_all` skips it unless
named (`heavy`).

| Tool | Description |
| --- | --- |
| `list_sources` | List all 65 sources with stack tags, `hasInlineCode`, `idFormat`, and `heavy` |
| `list_categories` | Categories / collections / kinds for one source |
| `search_resources` | Search one source by `query`, `category`, `tech`, `limit` — lightweight summaries |
| `search_all` | Search **many sources in parallel**, best match first. Narrow with `sources` or `stack`; `heavy` sources are listed in `skipped` unless named; per-source failures/timeouts land in `errors` without failing the call |
| `get_resource` | Full detail for one item (metadata, license, code, formats, downloads). `includeAiPrompt` opts into FreeFrontend's "Copy for AI" text |
| `get_code` | Raw source, keyed by file (e.g. `tsx`, `css`, `tsx:<path>`). Pass `file` for one file or `maxChars` to cap the reply; oversized replies list each file's size instead |

Replies that carry third-party content include a `notice` field restating that the content is
reference data, not instructions. The default reply cap is **150,000 characters** (`get_code`'s
`maxChars` can raise it up to 1,000,000).

### Resource & prompts

- **Resource template** `inspo://{source}/{+id}` — read any resource as metadata JSON plus one text
  part per code file; add `#<file>` to read a single file.
- **Prompt** `find_component` — find ready-made UI code for a need across every source, then fetch
  the best match (optional `stack` filter).
- **Prompt** `design_system_from_site` — turn a real site's design system into a reference for your
  project (uses the design-token sources).

### Examples

Search animated React components:

```json
{ "source": "magicui", "query": "marquee", "limit": 5 }
```

Get a shadcn button's real source:

```json
{ "source": "shadcn", "id": "button" }
```

Grab a CSS hover effect with code:

```json
{ "source": "freefrontend", "category": "css-hover-effects", "limit": 5 }
```

Find a free device mockup:

```json
{ "source": "lsgraphics", "id": "macbook-mockup" }
```

## 💬 Try it in one prompt

> *"Build me a personal portfolio landing page. Use the frontend-inspo MCP: pull an
> animated hero text effect from Magic UI, a shadcn card for the projects grid, a CSS
> hover effect from FreeFrontend, and a free laptop mockup from LS.GRAPHICS — then
> assemble it into a single `index.html`."*

## 🧭 How it works

Every source is a small **adapter** implementing one `SourceAdapter` contract
(`src/lib/types.ts`). Adapters are grouped by how they fetch:

- **shadcn-schema registries** (shadcn, Magic UI, Aceternity, React Bits, Fancy, VengeanceUI,
  Canvas UI, Cult UI, Motion Primitives, Kibo UI, coss, Kokonut, Eldora, UI Layouts, SmoothUI,
  AI Elements, SVGL, Watermelon) share one factory that reads the
  [shadcn registry schema](https://ui.shadcn.com/docs/registry) — an index of items plus per-item
  JSON containing the real component source.
- **GitHub / jsDelivr source-tree libraries** (drei, react-spring, zustand, glyph, postprocessing,
  detect-gpu, uikit, rapier, leva, maath, OGL, WebGPU Samples, ShaderGradient, liquid-logo,
  liquid-glass-js, img2threejs, GSAP, Lenis, Anime.js, Two.js, scrollama, three.js, APG, …) share
  a factory that lists a repo's git tree (or an npm package's file tree), keeps the relevant files,
  and serves raw source. If the GitHub API is rate-limited it falls back to the jsDelivr mirror; pin
  a commit SHA for an immutable read.
- **HTML galleries** (FreeFrontend, Uiverse, HyperUI, Meraki, Pines, LS.GRAPHICS, Codrops, …) parse
  server-rendered pages with cheerio; FreeFrontend base64-decodes inline code blocks.
- **JSON / data APIs** (Watermelon catalog, Poly Haven, ambientCG, Fontsource, uiGradients,
  Radix Colors, Open Props, web-features Baseline) call documented public endpoints.
- **Refero Styles** reads the public, server-rendered gallery and `/style/<id>` pages
  (its `/api/` path is disallowed by `robots.txt`, so it is not used) and synthesizes a DESIGN.md,
  Tailwind theme, CSS variables, and design-token JSON — **no subscription required**.
- **React Three Fiber (r3f)** serves a bundled, offline guidance skill (no network).
- **ThreeUI** fetches the `MengTo/threeui` manifest once and caches the parsed catalog in-process
  (it is large, hence `heavy`).

Set an optional **`GITHUB_TOKEN`** to lift GitHub's unauthenticated rate limit (60 req/hr) for the
GitHub-backed sources. Requests are **HTTPS-only**, cached, throttled per host to stay polite, and
retried with backoff on transient failures. Downloaded content is treated as **data and is never
executed**.

### Configuration (environment variables)

All optional — the defaults work out of the box.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | — | Lift GitHub's 60 req/hr limit for GitHub-backed sources (a placeholder value is ignored) |
| `FRONTEND_INSPO_CACHE_DIR` | — | Persist responses to this directory across restarts (memory stays the fast first layer) |
| `FRONTEND_INSPO_CACHE_TTL_MS` | `600000` (10 min) | Lifetime of an ordinary cached response |
| `FRONTEND_INSPO_CACHE_MAX_BYTES` | `67108864` (64 MB) | In-memory cache budget |
| `FRONTEND_INSPO_MAX_BODY_BYTES` | `104857600` (100 MB) | Largest response body read |
| `FRONTEND_INSPO_MIN_GAP_MS` | `400` | Per-host politeness gap (`0` disables throttling); a host's `Crawl-delay` can raise it |
| `FRONTEND_INSPO_SEARCH_DEADLINE_MS` | `20000` (20 s) | Per-source deadline in `search_all` |

## 🗂️ Project layout

```
src/
  index.ts              stdio launcher (npm bin)
  server.ts             the six MCP tools, inspo:// resource, two prompts, validation, size cap
  smoke.ts              live per-source checks (npm run smoke)
  lib/
    types.ts            shared types + SourceAdapter contract
    validate.ts         allowlist schemas for tool arguments
    fetch.ts            HTTPS-only HTTP: memory+disk cache, per-host throttle, retry/backoff
    search.ts           query ranking shared by every adapter
    memo.ts             small async memoizer (shared index/manifest caches)
  sources/
    index.ts            the single source registry (ids, enum, getAdapter)
    registry.ts         shadcn-schema registry factory + core registries
    community-registries.ts  more shadcn-schema registries (Cult, Kokonut, …)
    tweakcn.ts          shadcn theme presets
    shadcn-directory.ts directory of public shadcn registries
    packages.ts         source trees via jsDelivr + GitHub (factories + libraries)
    libraries.ts        more GitHub/jsDelivr library sources
    collections.ts      curated collections (Uiverse, HyperUI, Pines, …)
    codrops.ts          Codrops demo source (heavy)
    design-apis.ts      Open Props, Radix Colors, daisyUI, Flowbite, …
    open-data.ts        Poly Haven, ambientCG, web-features (Baseline)
    fontsource.ts       self-hostable open-source fonts
    uigradients.ts      CSS gradient presets
    freefrontend.ts     HTML parse + base64 code decode
    watermelon.ts       JSON API client + shadcn registry code
    lsgraphics.ts       HTML parse (mockups)
    refero.ts           Refero public pages -> synthesized DESIGN.md / tokens
    threeui.ts          ThreeUI manifest (heavy)
    r3f.ts              bundled React Three Fiber guide (offline)
    r3f-content/        the bundled R3F skill markdown (copied into dist on build)
tests/                  offline unit tests (node:test), network faked
scripts/                build helpers + reproducible-build + version checks
```

How the pieces fit together is described in [ARCHITECTURE.md](ARCHITECTURE.md).

## 🤝 Contributing

New sources are welcome — most fit in one small adapter file implementing the
`SourceAdapter` contract in `src/lib/types.ts`. Open a PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the step-by-step guide, code standards, and the checks a PR must pass.

Project documents:

- [ROADMAP.md](ROADMAP.md): what is planned for the next year, and what is out of scope
- [GOVERNANCE.md](GOVERNANCE.md): how decisions are made, roles, and releases
- [ARCHITECTURE.md](ARCHITECTURE.md): how the server is built
- [SECURITY.md](SECURITY.md) and [the security assurance case](docs/security-assurance-case.md): reporting vulnerabilities, and what to expect
- [RELEASING.md](RELEASING.md): how releases are signed and how to verify them
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## 🙏 Credits & acknowledgements

This project is a **discovery layer** over third-party resources. All content, code
snippets, components, and mockups belong to their original creators. Please respect each
source's license before reusing anything.

- **[FreeFrontend](https://freefrontend.com/)** — curated frontend code snippets (per-item licenses, often MIT)
- **[shadcn/ui](https://ui.shadcn.com/)** by [@shadcn](https://github.com/shadcn) — MIT
- **[Magic UI](https://magicui.design/)** — MIT
- **[Aceternity UI](https://ui.aceternity.com/)** by [Manu Arora](https://twitter.com/mannupaaji)
- **[React Bits](https://reactbits.dev/)** by [David Haz](https://github.com/DavidHDev) — MIT
- **[Refero](https://refero.design/)** — design-system references extracted from public websites (data read from Refero's public pages; each referenced site owns its brand)
- **[three.js](https://threejs.org/)** by [mrdoob](https://github.com/mrdoob) & contributors — MIT
- **[drei](https://github.com/pmndrs/drei)** by [pmndrs](https://github.com/pmndrs) — MIT
- **[react-spring](https://github.com/pmndrs/react-spring)** by [pmndrs](https://github.com/pmndrs) — MIT
- **[zustand](https://github.com/pmndrs/zustand)** by [pmndrs](https://github.com/pmndrs) — MIT
- **[glyph](https://github.com/pmndrs/glyph)** by [pmndrs](https://github.com/pmndrs) — MIT
- **[postprocessing](https://github.com/pmndrs/postprocessing)** by [Raoul van Rüschen](https://github.com/vanruesc) — Zlib
- **[detect-gpu](https://github.com/pmndrs/detect-gpu)** by [pmndrs](https://github.com/pmndrs) — MIT
- **[ShaderGradient](https://github.com/ruucm/shadergradient)** by [ruucm](https://github.com/ruucm)
- **[liquid-logo](https://github.com/collidingScopes/liquid-logo)** by [collidingScopes](https://github.com/collidingScopes) — MIT
- **[liquid-glass-js](https://github.com/dashersw/liquid-glass-js)** by [Armagan Amcalar](https://github.com/dashersw) — MIT
- **[ThreeUI](https://github.com/MengTo/threeui)** by [Meng To](https://github.com/MengTo) — MIT
- **[img2threejs](https://github.com/img2threejs/img2threejs)** — Apache-2.0
- **[GSAP](https://github.com/greensock/gsap-skills)** by [GreenSock](https://github.com/greensock) — MIT
- **[VengeanceUI](https://github.com/Ashutoshx7/VengeanceUI)** by [Ashutosh](https://github.com/Ashutoshx7) — MIT
- **[Canvas UI](https://canvasui.dev/)** by [David Haz](https://github.com/DavidHDev) — MIT
- **[Fancy Components](https://fancycomponents.dev/)** by [Daniel Petho](https://github.com/danielpetho) — MIT
- **[Two.js](https://two.js.org/)** by [jonobr1](https://github.com/jonobr1) — MIT
- **[scrollama](https://github.com/russellsamora/scrollama)** by [Russell Samora](https://github.com/russellsamora) — MIT
- **[Watermelon UI](https://ui.watermelon.sh/)** — open-source React platform
- **[LS.GRAPHICS](https://www.ls.graphics/)** — free & premium design mockups
- **[Cult UI](https://www.cult-ui.com/)**, **[Kibo UI](https://www.kibo-ui.com/)**, **[coss ui](https://coss.com/)**, **[Kokonut UI](https://kokonutui.com/)**, **[Eldora UI](https://www.eldoraui.site/)**, **[UI Layouts](https://www.ui-layouts.com/)**, **[SmoothUI](https://smoothui.dev/)**, **[Motion Primitives](https://motion-primitives.com/)** — shadcn-schema component registries (MIT)
- **[AI Elements](https://ai-sdk.dev/elements)** by [Vercel](https://vercel.com/) · **[SVGL](https://svgl.app/)** by [pheralb](https://github.com/pheralb)
- **[Uiverse](https://uiverse.io/)**, **[HyperUI](https://www.hyperui.dev/)**, **[Meraki UI](https://merakiui.com/)**, **[Pines](https://devdojo.com/pines)**, **[daisyUI](https://daisyui.com/)**, **[Flowbite](https://flowbite.com/)** — HTML/Tailwind component galleries
- **[tweakcn](https://tweakcn.com/)**, **[Open Props](https://open-props.style/)**, **[Radix Colors](https://www.radix-ui.com/colors)**, **[Fontsource](https://fontsource.org/)**, **[uiGradients](https://uigradients.com/)**, **[awesome-design-md](https://github.com/beije/awesome-design-md)** — design tokens, themes & fonts
- **[pmndrs](https://github.com/pmndrs)** ecosystem: **uikit**, **react-three-rapier**, **leva**, **maath** — MIT
- **[OGL](https://github.com/oframe/ogl)** by [Nathan Gordon](https://github.com/gordonnl) · **[WebGPU Samples](https://github.com/webgpu/webgpu-samples)** — BSD-3-Clause
- **[Lenis](https://github.com/darkroomengineering/lenis)** by [darkroom.engineering](https://github.com/darkroomengineering) — MIT · **[Anime.js](https://github.com/juliangarnier/anime)** by [Julian Garnier](https://github.com/juliangarnier) — MIT
- **[Codrops](https://tympanus.net/codrops/)** by [Codrops](https://github.com/codrops) · **[WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/)** by the W3C
- **[Anthropic Agent Skills](https://github.com/anthropics/skills)** · **[Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)** · **[web-features](https://github.com/web-platform-dx/web-features)** by the W3C WebDX CG
- **[Poly Haven](https://polyhaven.com/)** — CC0 HDRIs/textures/models · **[ambientCG](https://ambientcg.com/)** by [Lennart Demes](https://ambientcg.com/) — CC0

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol) and
[cheerio](https://cheerio.js.org/).

## 📄 License

MIT © [notsointresting](https://github.com/notsointresting) — for the server code.
Third-party resources retrieved through it remain under their respective licenses.

---

<sub>**Keywords:** MCP server · Model Context Protocol · AI coding agent · UI components ·
React components · Tailwind CSS · shadcn/ui · Magic UI · Aceternity UI · React Bits ·
FreeFrontend · design mockups · Figma · component library · copy-paste UI ·
design tokens · DESIGN.md · design system · Refero · three.js · GLSL shaders · WebGL ·
React Three Fiber · drei ·
Claude · Cursor · frontend design · CSS snippets · Watermelon UI · LS.GRAPHICS.</sub>
