#!/usr/bin/env node
// frontend-inspo-mcp — local stdio MCP server exposing discovery tools across
// freefrontend.com, ui.watermelon.sh, and ls.graphics.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { freefrontend } from "./sources/freefrontend.js";
import { lsgraphics } from "./sources/lsgraphics.js";
import { watermelon } from "./sources/watermelon.js";
import { aceternity, magicui, reactbits, shadcn } from "./sources/registry.js";
import type { SourceAdapter, SourceId } from "./lib/types.js";

const ADAPTERS: Record<SourceId, SourceAdapter> = {
  freefrontend,
  watermelon,
  lsgraphics,
  shadcn,
  magicui,
  aceternity,
  reactbits,
};

const SOURCE_IDS = Object.keys(ADAPTERS) as SourceId[];

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

const server = new McpServer({
  name: "frontend-inspo-mcp",
  version: "0.1.0",
});

// --- list_sources -----------------------------------------------------------
server.tool(
  "list_sources",
  "List the available frontend/design resource sources and their capabilities.",
  {},
  async () =>
    json(
      SOURCE_IDS.map((id) => {
        const a = ADAPTERS[id];
        return {
          id: a.id,
          label: a.label,
          description: a.description,
          homepage: a.homepage,
          hasInlineCode: a.hasInlineCode,
        };
      }),
    ),
);

// --- list_categories --------------------------------------------------------
server.tool(
  "list_categories",
  "List categories/collections for a given source. freefrontend discovers sub-collections live.",
  { source: z.enum(SOURCE_IDS as [SourceId, ...SourceId[]]) },
  async ({ source }) => {
    try {
      return json(await ADAPTERS[source].listCategories());
    } catch (e) {
      return err(`list_categories failed for ${source}: ${(e as Error).message}`);
    }
  },
);

// --- search_resources -------------------------------------------------------
server.tool(
  "search_resources",
  "Search resources in a source. Filter by query, category, or tech (css/js/react/etc). Returns lightweight summaries.",
  {
    source: z.enum(SOURCE_IDS as [SourceId, ...SourceId[]]),
    query: z.string().optional().describe("Free-text keyword filter."),
    category: z.string().optional().describe("Category/collection id from list_categories."),
    tech: z.string().optional().describe("Technology hint, e.g. css, js, html, react, blocks."),
    limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)."),
  },
  async ({ source, query, category, tech, limit }) => {
    try {
      const results = await ADAPTERS[source].search({ query, category, tech, limit });
      return json({ source, count: results.length, results });
    } catch (e) {
      return err(`search_resources failed for ${source}: ${(e as Error).message}`);
    }
  },
);

// --- get_resource -----------------------------------------------------------
server.tool(
  "get_resource",
  "Get full detail for one resource. For freefrontend, pass id as 'collection::snippetId' (collection defaults to css-code-examples). For watermelon, id is 'kind/slug'. For lsgraphics, id is the asset slug.",
  {
    source: z.enum(SOURCE_IDS as [SourceId, ...SourceId[]]),
    id: z.string().describe("Resource id as returned by search_resources."),
  },
  async ({ source, id }) => {
    try {
      const detail = await ADAPTERS[source].getResource(id);
      if (!detail) return err(`Resource not found: ${source} / ${id}`);
      return json(detail);
    } catch (e) {
      return err(`get_resource failed for ${source}/${id}: ${(e as Error).message}`);
    }
  },
);

// --- get_code ---------------------------------------------------------------
server.tool(
  "get_code",
  "Get raw source code for a resource (freefrontend only). Returns code by language plus the 'Copy for AI' prompt when available.",
  {
    source: z.enum(SOURCE_IDS as [SourceId, ...SourceId[]]),
    id: z.string().describe("Resource id. For freefrontend use 'collection::snippetId'."),
  },
  async ({ source, id }) => {
    const adapter = ADAPTERS[source];
    if (!adapter.hasInlineCode) {
      return err(
        `Source '${source}' has no inline code. Use get_resource for its page URL and (for lsgraphics) download links.`,
      );
    }
    try {
      const detail = await adapter.getResource(id);
      if (!detail) return err(`Resource not found: ${source} / ${id}`);
      return json({
        source,
        id,
        title: detail.title,
        license: detail.license,
        code: detail.code ?? {},
        aiPrompt: detail.aiPrompt,
      });
    } catch (e) {
      return err(`get_code failed for ${source}/${id}: ${(e as Error).message}`);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio MCP servers must not write to stdout; log to stderr only.
  console.error("frontend-inspo-mcp running on stdio");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
