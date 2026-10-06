// MCP server definition: the six discovery tools over all 27 sources.
// Kept separate from index.ts (the stdio launcher) so tests can run it in-process.
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SourceAdapter, SourceId } from "./lib/types.js";
import { categorySchema, idSchema, querySchema, techSchema } from "./lib/validate.js";
import { freefrontend } from "./sources/freefrontend.js";
import { lsgraphics } from "./sources/lsgraphics.js";
import {
  detectgpu,
  drei,
  glyph,
  gsap,
  img2threejs,
  liquidglass,
  liquidlogo,
  postprocessing,
  reactspring,
  scrollama,
  shadergradient,
  threejs,
  twojs,
  zustand,
} from "./sources/packages.js";
import { r3f } from "./sources/r3f.js";
import { refero } from "./sources/refero.js";
import {
  aceternity,
  canvasui,
  fancy,
  magicui,
  reactbits,
  shadcn,
  vengeanceui,
} from "./sources/registry.js";
import { threeui } from "./sources/threeui.js";
import { watermelon } from "./sources/watermelon.js";

const ADAPTERS: Record<SourceId, SourceAdapter> = {
  freefrontend,
  watermelon,
  lsgraphics,
  shadcn,
  magicui,
  aceternity,
  reactbits,
  refero,
  threejs,
  drei,
  fancy,
  twojs,
  scrollama,
  r3f,
  reactspring,
  zustand,
  glyph,
  postprocessing,
  detectgpu,
  shadergradient,
  liquidlogo,
  liquidglass,
  img2threejs,
  gsap,
  vengeanceui,
  threeui,
  canvasui,
};

const SOURCE_IDS = Object.keys(ADAPTERS) as SourceId[];
const sourceSchema = z.enum(SOURCE_IDS as [SourceId, ...SourceId[]]);

// Every tool only reads public third-party data; none modifies state anywhere.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: true } as const;

/** Upper bound on one tool response, so a huge upstream payload cannot flood the client. */
export const MAX_RESPONSE_CHARS = 1_000_000;

function json(data: unknown) {
  let text = JSON.stringify(data, null, 2);
  if (text.length > MAX_RESPONSE_CHARS) {
    text = JSON.stringify(
      {
        error: `Response too large (${text.length} characters, limit ${MAX_RESPONSE_CHARS}). Narrow the request with a smaller limit, a query or a category.`,
      },
      null,
      2,
    );
    return { content: [{ type: "text" as const, text }], isError: true };
  }
  return { content: [{ type: "text" as const, text }] };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

function packageVersion(): string {
  // dist/server.js -> ../package.json, so the reported version can never drift from the package.
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8")) as {
    version: string;
  };
  return pkg.version;
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "frontend-inspo-mcp", version: packageVersion() });

  server.registerTool(
    "list_sources",
    {
      description: "List the available frontend/design resource sources and their capabilities.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
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

  server.registerTool(
    "list_categories",
    {
      description:
        "List categories/collections for a given source. freefrontend discovers sub-collections live.",
      inputSchema: { source: sourceSchema },
      annotations: READ_ONLY,
    },
    async ({ source }) => {
      try {
        return json(await ADAPTERS[source].listCategories());
      } catch (e) {
        return err(`list_categories failed for ${source}: ${(e as Error).message}`);
      }
    },
  );

  server.registerTool(
    "search_resources",
    {
      description:
        "Search resources in a source. Filter by query, category, or tech (css/js/react/etc). Returns lightweight summaries.",
      inputSchema: {
        source: sourceSchema,
        query: querySchema.optional().describe("Free-text keyword filter."),
        category: categorySchema
          .optional()
          .describe("Category/collection id from list_categories."),
        tech: techSchema.optional().describe("Technology hint, e.g. css, js, html, react, blocks."),
        limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)."),
      },
      annotations: READ_ONLY,
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

  server.registerTool(
    "search_all",
    {
      description:
        "Search several sources at once and merge the results. Use when you don't know which source has what you want. Runs sources in parallel; failures are reported per-source without failing the whole call.",
      inputSchema: {
        query: querySchema.describe("Free-text keyword to search across sources."),
        sources: z
          .array(sourceSchema)
          .optional()
          .describe("Which sources to search. Defaults to all sources."),
        perSource: z
          .number()
          .int()
          .min(1)
          .max(25)
          .optional()
          .describe("Max results per source (default 5)."),
      },
      annotations: READ_ONLY,
    },
    async ({ query, sources, perSource }) => {
      const targets = sources?.length ? sources : SOURCE_IDS;
      const limit = perSource ?? 5;
      const settled = await Promise.allSettled(
        targets.map(async (id) => ({
          source: id,
          results: await ADAPTERS[id].search({ query, limit }),
        })),
      );
      const merged: unknown[] = [];
      const errors: { source: string; error: string }[] = [];
      settled.forEach((r, i) => {
        const source = targets[i];
        if (!source) return; // settled is index-parallel to targets
        if (r.status === "fulfilled") merged.push(...r.value.results);
        else errors.push({ source, error: (r.reason as Error).message });
      });
      return json({
        query,
        sourcesSearched: targets.length,
        count: merged.length,
        results: merged,
        ...(errors.length ? { errors } : {}),
      });
    },
  );

  server.registerTool(
    "get_resource",
    {
      description:
        "Get full detail for one resource. For freefrontend, pass id as 'collection::snippetId' OR just the snippet id (it will resolve across likely collections). For watermelon, id is 'kind/slug'. For lsgraphics, id is the asset slug.",
      inputSchema: { source: sourceSchema, id: idSchema },
      annotations: READ_ONLY,
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

  server.registerTool(
    "get_code",
    {
      description:
        "Get raw source code for a resource (freefrontend only). Returns code by language plus the 'Copy for AI' prompt when available.",
      inputSchema: {
        source: sourceSchema,
        id: idSchema.describe("Resource id. For freefrontend use 'collection::snippetId'."),
      },
      annotations: READ_ONLY,
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

  return server;
}
