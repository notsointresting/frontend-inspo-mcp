// Shared types across all source adapters.

/**
 * A source id. The list in sources/index.ts is the only registry of valid ids: it rejects
 * duplicates, and every tool's `source` enum is generated from it.
 */
export type SourceId = string;

/** Stack tags a source can declare. `list_sources` shows them and `search_all` filters on them. */
export const STACKS = [
  "react",
  "tailwind",
  "css",
  "html",
  "javascript",
  "3d",
  "animation",
  "design-tokens",
  "icons",
  "fonts",
  "assets",
  "mockups",
  "guidance",
  "accessibility",
  "compat",
] as const;
export type Stack = (typeof STACKS)[number];

/** A category or collection within a source (e.g. "css-hover-effects", "blocks/auth"). */
export interface Category {
  id: string; // stable id used as the `category` arg in other tools
  label: string; // human-readable name
  count?: number; // number of items, when known
  parent?: string; // parent category id, when applicable
}

/** A lightweight search/listing result. */
export interface ResourceSummary {
  source: SourceId;
  id: string; // stable id (usually slug) unique within the source
  title: string;
  description?: string;
  category?: string;
  url: string; // canonical page for the resource
  image?: string; // preview image URL
  tags?: string[]; // technologies / features / formats
}

/** Full detail for a single resource. */
export interface ResourceDetail extends ResourceSummary {
  license?: string;
  author?: string;
  // Code snippets keyed by language (freefrontend). Empty when the source has no inline code.
  code?: Record<string, string>;
  aiPrompt?: string; // freefrontend "Copy for AI" prompt
  formats?: string[]; // ls.graphics: Figma / Sketch / PSD, etc.
  downloads?: { label: string; url: string }[]; // ls.graphics download links
  extra?: Record<string, unknown>; // source-specific leftovers
}

export interface SearchArgs {
  query?: string;
  category?: string;
  tech?: string; // e.g. css, js, react
  limit?: number;
  page?: number;
}

/** Contract every source adapter implements. */
export interface SourceAdapter {
  id: SourceId;
  label: string;
  description: string;
  homepage: string;
  /** Whether get_code returns meaningful inline source for this source. */
  hasInlineCode: boolean;
  /** What the source covers, so agents and `search_all` can pick relevant sources. */
  stack?: readonly Stack[];
  /** How to write an id for get_resource / get_code, e.g. `registry item name, e.g. "button"`. */
  idFormat?: string;
  /** Costly to search (multi-MB download or a tight quota): `search_all` skips it unless named. */
  heavy?: boolean;
  listCategories(): Promise<Category[]>;
  search(args: SearchArgs): Promise<ResourceSummary[]>;
  getResource(id: string): Promise<ResourceDetail | null>;
}
