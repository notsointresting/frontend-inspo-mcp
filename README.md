# frontend-inspo-mcp 🎨

> **A local MCP server that lets AI coding agents discover and pull real frontend code, UI components, design mockups, and design-system tokens** — from FreeFrontend, shadcn/ui, Magic UI, Aceternity UI, React Bits, Fancy Components, Refero Styles, three.js, drei, Two.js, scrollama, Watermelon UI, and LS.GRAPHICS.

[![MCP](https://img.shields.io/badge/Model_Context_Protocol-server-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-18%2B-339933)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

Give Claude, Cursor, Kiro, or any MCP-compatible agent instant access to **thousands of
copy-paste UI components and free design assets** — with the **actual source code**, not
just links. Ask for "a glassmorphism card" or "an animated shadcn button" and get real,
usable code back.

---

## ✨ Why use this?

Most component galleries are built for humans clicking around a browser. This server makes
them **agent-readable**, so your AI assistant can search, compare, and paste real code
directly into your project.

- 🔍 **Search 13 sources** through one consistent set of tools
- 📋 **Get real code** — React/TSX, Tailwind, vanilla HTML/CSS/JS
- 🎭 **Free design mockups** with direct, un-gated download links (Figma / Sketch / PSD)
- ⚡ **Fast** — in-memory caching + polite per-host rate limiting
- 🧩 **Pluggable** — add a new source in one small adapter file

## 📚 Sources

| Source | What it gives you | Inline code? | Access |
| --- | --- | :---: | --- |
| **[FreeFrontend](https://freefrontend.com/)** | HTML / CSS / JS / Bootstrap / Tailwind snippets | ✅ | HTML parse + base64 |
| **[shadcn/ui](https://ui.shadcn.com/)** | React + Tailwind + Radix components | ✅ | Registry JSON |
| **[Magic UI](https://magicui.design/)** | Animated React + Framer Motion components | ✅ | Registry JSON |
| **[Aceternity UI](https://ui.aceternity.com/)** | Bold animated React + Tailwind components | ✅ | Registry JSON |
| **[React Bits](https://reactbits.dev/)** | Animated React components (JS/TS, CSS/Tailwind) | ✅ | Registry JSON |
| **[Fancy Components](https://fancycomponents.dev/)** | Motion, scroll, text-physics & 2D effect React components | ✅ | Registry JSON |
| **[Refero Styles](https://styles.refero.design/)** | Design systems from real sites — DESIGN.md, Tailwind, CSS vars, tokens | ✅ | Public API (no login) |
| **[three.js](https://threejs.org/)** | Official examples — GLSL shaders, post-fx, loaders, controls | ✅ | jsdelivr CDN |
| **[drei](https://github.com/pmndrs/drei)** | React Three Fiber helper components | ✅ | GitHub source |
| **[Two.js](https://two.js.org/)** | 2D drawing / animation library source | ✅ | jsdelivr CDN |
| **[scrollama](https://github.com/russellsamora/scrollama)** | Scrollytelling / scroll-storytelling library source | ✅ | jsdelivr CDN |
| **[Watermelon UI](https://ui.watermelon.sh/)** | React blocks, dashboards, templates, showcases | — | Official JSON API |
| **[LS.GRAPHICS](https://www.ls.graphics/free-mockups)** | Free design mockups (Figma / Sketch / PSD) | — | HTML parse |

## 🚀 Quick start

```bash
git clone https://github.com/notsointresting/frontend-inspo-mcp.git
cd frontend-inspo-mcp
npm install
npm run build
```

Requires **Node 18+** (uses the built-in `fetch`).

Verify every source is live:

```bash
npm run smoke   # hits all 13 sources and asserts parsing → prints ALL PASS
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

Every tool takes a `source` argument:
`freefrontend` · `shadcn` · `magicui` · `aceternity` · `reactbits` · `fancy` · `refero` · `threejs` · `drei` · `twojs` · `scrollama` · `watermelon` · `lsgraphics`

| Tool | Description |
| --- | --- |
| `list_sources` | List all sources and whether each returns inline code |
| `list_categories` | Categories/collections/kinds for a source |
| `search_resources` | Search by `query`, `category`, `tech`, `limit` — returns lightweight summaries |
| `get_resource` | Full detail for one item (metadata, license, code, formats, downloads) |
| `get_code` | Raw source code for code-bearing sources, keyed by language |

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

- **Registry sources** (shadcn, Magic UI, Aceternity, React Bits) share one adapter that
  reads the [shadcn registry schema](https://ui.shadcn.com/docs/registry) — an index of
  items plus per-item JSON containing the real component source.
- **FreeFrontend** parses server-rendered collection pages and base64-decodes the inline
  code blocks; pagination follows `/<collection>/page/N/`.
- **Watermelon UI** calls its documented public API (`/api/v1/catalog/*`).
- **Refero Styles** calls the **public** `styles.refero.design/api/styles` endpoints and
  synthesizes a DESIGN.md, Tailwind theme, CSS variables, and design-token JSON from the
  returned design-system data — **no Refero subscription is required**.
- **three.js** lists the published npm package file tree via jsdelivr and fetches raw
  source (GLSL shaders, post-processing, loaders, controls) from the CDN.
- **drei** reads the `pmndrs/drei` GitHub source tree and raw files. Set an optional
  `GITHUB_TOKEN` env var to lift GitHub's unauthenticated rate limit (60 req/hr).
- **LS.GRAPHICS** parses the free-mockups listing and each asset page for formats and
  download links.

Requests are cached in memory (10-min TTL) and throttled per host to stay polite.

## 🗂️ Project layout

```
src/
  index.ts              server + tool registration
  smoke.ts              live per-adapter checks
  lib/
    types.ts            shared types + SourceAdapter contract
    fetch.ts            cached, throttled HTTP + base64 decode
  sources/
    freefrontend.ts     HTML parse + base64 code decode
    watermelon.ts       JSON API client
    lsgraphics.ts       HTML parse (mockups)
    registry.ts         shadcn-schema registry factory (shadcn/magicui/aceternity/reactbits)
    refero.ts           Refero public API -> synthesized DESIGN.md / tokens
    packages.ts         code libraries via jsdelivr (three.js) + GitHub (drei)
```

## 🤝 Contributing

New sources are welcome — most fit in one small adapter file implementing the
`SourceAdapter` contract in `src/lib/types.ts`. Open a PR.

## 🙏 Credits & acknowledgements

This project is a **discovery layer** over third-party resources. All content, code
snippets, components, and mockups belong to their original creators. Please respect each
source's license before reusing anything.

- **[FreeFrontend](https://freefrontend.com/)** — curated frontend code snippets (per-item licenses, often MIT)
- **[shadcn/ui](https://ui.shadcn.com/)** by [@shadcn](https://github.com/shadcn) — MIT
- **[Magic UI](https://magicui.design/)** — MIT
- **[Aceternity UI](https://ui.aceternity.com/)** by [Manu Arora](https://twitter.com/mannupaaji)
- **[React Bits](https://reactbits.dev/)** by [David Haz](https://github.com/DavidHDev) — MIT
- **[Refero](https://refero.design/)** — design-system references extracted from public websites (data served via Refero's public API; each referenced site owns its brand)
- **[three.js](https://threejs.org/)** by [mrdoob](https://github.com/mrdoob) & contributors — MIT
- **[drei](https://github.com/pmndrs/drei)** by [pmndrs](https://github.com/pmndrs) — MIT
- **[Fancy Components](https://fancycomponents.dev/)** by [Daniel Petho](https://github.com/danielpetho) — MIT
- **[Two.js](https://two.js.org/)** by [jonobr1](https://github.com/jonobr1) — MIT
- **[scrollama](https://github.com/russellsamora/scrollama)** by [Russell Samora](https://github.com/russellsamora) — MIT
- **[Watermelon UI](https://ui.watermelon.sh/)** — open-source React platform
- **[LS.GRAPHICS](https://www.ls.graphics/)** — free & premium design mockups

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
