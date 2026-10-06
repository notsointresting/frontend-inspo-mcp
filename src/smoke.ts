// Live smoke check: hits each source and asserts basic parsing works.
// Run after build: `npm run smoke` (all sources) or `npm run smoke -- shadcn magicui`.
//
// Every registered source gets the same check: search -> getResource -> non-empty code
// (or just a detail object for sources without inline code). HINTS tweaks the few sources
// that need different search arguments or an extra check.
//
// Failures are classified per source:
//   HARD      - parsing/schema/API contract is broken (0 results, missing code,
//               HTTP 400/404, unexpected payload...). Never retried.
//   TRANSIENT - rate limit (403/429), gateway errors, or network errors. The
//               whole source is retried up to MAX_RETRIES times with backoff.
// Exit code is non-zero if any source still fails after that. A per-source
// PASS/FAIL table is always printed last.

import { isTransient } from "./lib/fetch.js";
import type { ResourceSummary, SearchArgs, SourceAdapter } from "./lib/types.js";
import { ADAPTER_LIST } from "./sources/index.js";

type Kind = "HARD" | "TRANSIENT";
interface Row {
  step: string;
  ok: boolean;
  detail: string;
  kind?: Kind;
}
type Check = (step: string, ok: boolean, detail: string) => void;
interface Result {
  source: string;
  ok: boolean;
  kind?: Kind;
  attempts: number;
  detail: string;
}
interface Hint {
  /** Search arguments for the check (default `{ limit: 3 }`). */
  search?: SearchArgs;
  /** Turn the first search result into the id passed to getResource (default: its id). */
  resolveId?: (r: ResourceSummary) => string;
  /** An extra contract check, run before the search. */
  extra?: (a: SourceAdapter, check: Check) => Promise<void>;
}

const HINTS: Record<string, Hint> = {
  freefrontend: {
    search: { query: "button", tech: "css", limit: 3 },
    resolveId: (r) => `${r.category}::${r.id}`,
  },
  watermelon: {
    extra: async (a, check) => {
      const cats = await a.listCategories();
      check(`${a.id}.listCategories`, cats.length === 5, `${cats.length} kinds`);
    },
  },
  r3f: {
    search: { query: "scroll", limit: 5 },
    extra: async (a, check) => {
      const cats = await a.listCategories();
      check(`${a.id}.listCategories`, cats.length > 0, `${cats.length} categories`);
    },
  },
};

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;
const results: Result[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run one source's checks; retry the whole source while it only fails transiently. */
async function source(name: string, body: (check: Check) => Promise<void>): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    const rows: Row[] = [];
    // A failed assertion means the content is wrong, not that the network blipped.
    const check: Check = (step, ok, detail) =>
      rows.push({ step, ok, detail, kind: ok ? undefined : "HARD" });
    try {
      await body(check);
    } catch (e) {
      rows.push({
        step: name,
        ok: false,
        detail: (e as Error).message,
        kind: isTransient(e) ? "TRANSIENT" : "HARD",
      });
    }

    const failed = rows.filter((r) => !r.ok);
    const hard = failed.some((r) => r.kind === "HARD");
    if (failed.length && !hard && attempt <= MAX_RETRIES) {
      const wait = RETRY_BASE_MS * 2 ** (attempt - 1);
      console.error(
        `RETRY ${name} - transient failure (${failed[0]?.detail}); retry ${attempt}/${MAX_RETRIES} in ${wait}ms`,
      );
      await sleep(wait);
      continue;
    }

    for (const r of rows) {
      console.error(
        `${r.ok ? "PASS" : "FAIL"}  ${r.step} - ${r.detail}${r.ok ? "" : ` [${r.kind}]`}`,
      );
    }
    results.push({
      source: name,
      ok: failed.length === 0,
      kind: failed.length === 0 ? undefined : hard ? "HARD" : "TRANSIENT",
      attempts: attempt,
      detail: failed[0]?.detail ?? `${rows.length} checks`,
    });
    return;
  }
}

/** search -> getResource -> code (or a detail, for sources without inline code). */
function checkSource(a: SourceAdapter): Promise<void> {
  const hint = HINTS[a.id] ?? {};
  return source(a.id, async (check) => {
    if (hint.extra) await hint.extra(a, check);
    const res = await a.search(hint.search ?? { limit: 3 });
    const first = res[0];
    check(
      `${a.id}.search`,
      res.length > 0,
      `${res.length} results, first="${first?.title ?? ""}" (${first?.id ?? "-"})`,
    );
    if (!first) return;
    const d = await a.getResource(hint.resolveId ? hint.resolveId(first) : first.id);
    if (a.hasInlineCode) {
      const langs = d?.code ? Object.keys(d.code) : [];
      check(`${a.id}.getResource+code`, langs.length > 0, `code=${langs.join(",") || "none"}`);
    } else {
      const formats = d?.formats ? ` formats=${d.formats.join(",")}` : "";
      check(`${a.id}.getResource`, !!d, `title="${d?.title}"${formats}`);
    }
  });
}

function printSummary(): void {
  const w = Math.max(6, ...results.map((r) => r.source.length));
  const line = (a: string, b: string, c: string, d: string, e: string) =>
    console.error(`${a.padEnd(w)}  ${b.padEnd(6)}  ${c.padEnd(9)}  ${d.padEnd(8)}  ${e}`);
  console.error("\nSUMMARY");
  line("SOURCE", "RESULT", "CLASS", "ATTEMPTS", "DETAIL");
  line("-".repeat(w), "------", "---------", "--------", "------");
  for (const r of results) {
    line(
      r.source,
      r.ok ? "PASS" : "FAIL",
      r.kind ?? "-",
      String(r.attempts),
      r.detail.slice(0, 110),
    );
  }
  const failed = results.filter((r) => !r.ok);
  const hard = failed.filter((r) => r.kind === "HARD").length;
  console.error(
    `\n${results.length - failed.length}/${results.length} sources passed` +
      (failed.length
        ? ` - ${failed.length} FAILED (${hard} HARD, ${failed.length - hard} TRANSIENT after ${MAX_RETRIES} retries)`
        : " - ALL PASS"),
  );
}

async function run() {
  const only = process.argv.slice(2);
  const unknown = only.filter((id) => !ADAPTER_LIST.some((a) => a.id === id));
  if (unknown.length) {
    console.error(`Unknown source id(s): ${unknown.join(", ")}`);
    process.exit(2);
  }
  for (const a of ADAPTER_LIST) {
    if (!only.length || only.includes(a.id)) await checkSource(a);
  }
  printSummary();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

run();
