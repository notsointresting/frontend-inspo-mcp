// Allowlist validation for everything an MCP client (i.e. an LLM, which may itself be fed
// untrusted text) can send us. Values that pass are safe to place in a URL *path* or
// query value: none of them can contain `?`, `#`, `%`, `\`, whitespace tricks or `..` segments.
// Rules were checked against every real id and category returned by all 27 live sources.
import { z } from "zod";

/** Resource ids: slugs, `kind/slug`, `collection::snippetId`, `/src/path/File.tsx`, uuids,
 *  and route-group folders such as `/src/routes/(docs)/+page.md`. */
const ID_RE = /^\/?[A-Za-z0-9][A-Za-z0-9._~:/@+()-]*$/;
/** Category / collection names, including display labels such as "Canvas 2D + DOM/CSS". */
const CATEGORY_RE = /^[A-Za-z0-9][A-Za-z0-9 ._:/@+()-]*$/;
/** Technology hints: css, js, react, blocks, ... */
const TECH_RE = /^[A-Za-z0-9][A-Za-z0-9 ._+-]*$/;

/** No `.`/`..` segments (traversal) and no `//` (which would also rule out `scheme://host`). */
const isPlainPath = (s: string) =>
  !s.includes("//") && !s.split("/").some((seg) => seg === "." || seg === "..");

export const idSchema = z
  .string()
  .max(300)
  .regex(ID_RE, "id contains characters that are not allowed")
  .refine(isPlainPath, "id must not contain '.' or '..' path segments, or '//'")
  .describe("Resource id as returned by search_resources.");

export const categorySchema = z
  .string()
  .max(100)
  .regex(CATEGORY_RE, "category contains characters that are not allowed");

export const techSchema = z
  .string()
  .max(50)
  .regex(TECH_RE, "tech contains characters that are not allowed");

/** Free text is only ever used for substring filtering or as an encoded query value. */
export const querySchema = z.string().max(200);
