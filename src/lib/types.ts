// Shared types across all source adapters.

export type SourceId =
  | "freefrontend"
  | "watermelon"
  | "lsgraphics"
  | "shadcn"
  | "magicui"
  | "aceternity"
  | "reactbits"
  | "refero"
  | "threejs"
  | "drei";

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
  listCategories(): Promise<Category[]>;
  search(args: SearchArgs): Promise<ResourceSummary[]>;
  getResource(id: string): Promise<ResourceDetail | null>;
}
