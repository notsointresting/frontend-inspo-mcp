// Shared query matching for every adapter that filters locally, so word order, hyphens and
// plurals behave the same everywhere: "button shimmer" finds "shimmer-button".
// ponytail: substring matching on normalized words with a naive plural strip, not real
// stemming or fuzzy matching. Upgrade path: BM25 over the same fields if ranking needs it.

/** Lowercase, with every run of non-letters/digits collapsed to one space. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Distinct query words; a trailing plural "s" is dropped so "buttons" also finds "button". */
export function queryTokens(query: string | undefined): string[] {
  const words = normalize(query ?? "")
    .split(" ")
    .filter(Boolean);
  const stem = (w: string) =>
    w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
  return [...new Set(words.map(stem))];
}

/**
 * How well `fields` match `query`; 0 means no match. Every query word must occur in some
 * field. Earlier fields weigh more, whole-word hits weigh a little more, and the full phrase
 * in the first field earns a bonus (more if it is the whole field). An empty query scores 1.
 */
export function matchScore(
  query: string | undefined,
  fields: readonly (string | undefined)[],
): number {
  const tokens = queryTokens(query);
  if (!tokens.length) return 1;
  const norm = fields.map((f) => ` ${normalize(f ?? "")} `);
  let score = 0;
  for (const t of tokens) {
    let best = 0;
    norm.forEach((f, i) => {
      if (f.includes(t)) {
        best = Math.max(best, fields.length - i + (f.includes(` ${t} `) ? 0.5 : 0));
      }
    });
    if (best === 0) return 0;
    score += best;
  }
  const phrase = normalize(query ?? "");
  const first = norm[0]?.trim() ?? "";
  if (tokens.length > 1 && first.includes(phrase)) score += fields.length;
  if (first === phrase) score += fields.length;
  return score;
}

/** The items matching `query`, best first (ties keep input order), capped at `limit`. */
export function rankByQuery<T>(
  items: readonly T[],
  query: string | undefined,
  fieldsOf: (item: T) => readonly (string | undefined)[],
  limit: number,
): T[] {
  if (!queryTokens(query).length) return items.slice(0, limit);
  return items
    .map((item, i) => ({ item, i, score: matchScore(query, fieldsOf(item)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.item);
}
