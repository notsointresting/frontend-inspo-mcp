# frontend-inspo-mcp

A local (stdio) [Model Context Protocol](https://modelcontextprotocol.io) server for
discovering frontend and design resources from three sources:

| Source | What it provides | Access |
| --- | --- | --- |
| **FreeFrontend** (`freefrontend.com`) | HTML / CSS / JS / Bootstrap / Tailwind code snippets, with **inline source code** and per-item licenses | HTML parsing |
| **Watermelon UI** (`ui.watermelon.sh`) | React animated components, blocks, dashboards, templates, showcases | Official JSON API |
| **LS.GRAPHICS** (`ls.graphics/free-mockups`) | Free design mockups (Figma / Sketch / PSD) | HTML parsing |

## Install

```bash
npm install
npm run build
```

Requires Node 18+ (uses the built-in `fetch`).

## Verify it works

```bash
npm run smoke   # hits all three live sources and asserts parsing works
```

Expected: `ALL PASS`.

## Configure a local MCP client

The server speaks MCP over **stdio**. Point your client at the built entry file.

### Claude Desktop / Cursor / generic

Add to your client's MCP config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "frontend-inspo": {
      "command": "node",
      "args": ["C:\\Users\\Institue\\web-inspi\\dist\\index.js"]
    }
  }
}
```

Use the absolute path to `dist/index.js` on your machine. On macOS/Linux use forward slashes.

## Tools

All tools take a `source` argument: `freefrontend` | `watermelon` | `lsgraphics`.

### `list_sources`
Lists the three sources, their descriptions, and whether they expose inline code.

### `list_categories`
Categories/collections for a source.
- **freefrontend**: discovers sub-collections live (e.g. `css-hover-effects`, `js-modals`).
- **watermelon**: the 5 kinds with counts.
- **lsgraphics**: curated free-mockup groups.

```json
{ "source": "freefrontend" }
```

### `search_resources`
Search a source. Returns lightweight summaries (no heavy code payloads).

| Arg | Notes |
| --- | --- |
| `source` | required |
| `query` | free-text keyword filter |
| `category` | a category id from `list_categories` |
| `tech` | hint: `css`, `js`, `html`, `bootstrap`, `tailwind` (freefrontend); `blocks`, `dashboards`, etc. (watermelon) |
| `limit` | 1–100, default 20 |

```json
{ "source": "watermelon", "query": "pricing", "category": "blocks", "limit": 10 }
```

```json
{ "source": "freefrontend", "category": "css-hover-effects", "limit": 5 }
```

### `get_resource`
Full detail for one item.

- **freefrontend**: id is `collection::snippetId` (e.g. `css-hover-effects::2026-07-23-...`).
  If you omit the collection, it defaults to `css-hover-effects`.
  Returns metadata, license, author, **inline code**, and the "Copy for AI" prompt.
- **watermelon**: id is `kind/slug` (as returned by `search_resources`).
- **lsgraphics**: id is the asset slug. Returns formats and download links.

```json
{ "source": "lsgraphics", "id": "spray-can-mockup" }
```

### `get_code`
Raw source code for a resource. **freefrontend only** (the other sources have no
inline code — use `get_resource` for their page URL / download links).

```json
{ "source": "freefrontend", "id": "css-hover-effects::2026-07-23-expanding-css-grid-notched-accordion-gallery" }
```

Returns `code` keyed by language (e.g. `html`, `css`, `js`) plus the `aiPrompt`.

## How each adapter works

- **Watermelon** calls the documented public API (`/api/v1/catalog/*`, see
  `https://ui.watermelon.sh/openapi.json`). No auth; the site applies rate limits.
- **FreeFrontend** fetches server-rendered collection pages, parses
  `article.snippet-card` with cheerio, and base64-decodes the inline
  `data-original` code blocks. Pagination follows `/<collection>/page/N/`, with
  cross-page de-duplication.
- **LS.GRAPHICS** parses the `/free-mockups` listing and each `/assets/<slug>`
  detail page for formats and download links.

Requests are cached in memory (10 min TTL) and throttled per host (~400 ms gap)
to stay polite.

## Licensing note

These are third-party resources. Every result surfaces its `license` field where
available. Respect each source's terms before reusing code or assets:
FreeFrontend snippets carry per-item licenses (often MIT); LS.GRAPHICS mockups
have their own free-use terms; Watermelon components are governed by their
repository license.

## Project layout

```
src/
  index.ts            server + tool registration
  smoke.ts            live per-adapter checks
  lib/
    types.ts          shared types + SourceAdapter contract
    fetch.ts          cached, throttled HTTP + base64 decode
  sources/
    freefrontend.ts   HTML parse + base64 code decode
    watermelon.ts     JSON API client
    lsgraphics.ts     HTML parse
```
