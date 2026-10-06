// Live smoke check: hits each source and asserts basic parsing works.
// Run after build: `npm run smoke`.
//
// Failures are classified per source:
//   HARD      - parsing/schema/API contract is broken (0 results, missing code,
//               HTTP 400/404, unexpected payload...). Never retried.
//   TRANSIENT - rate limit (403/429), gateway errors, or network errors. The
//               whole source is retried up to MAX_RETRIES times with backoff.
// Exit code is non-zero if any source still fails after that. A per-source
// PASS/FAIL table is always printed last.
import { freefrontend } from "./sources/freefrontend.js";
import { lsgraphics } from "./sources/lsgraphics.js";
import { watermelon } from "./sources/watermelon.js";
import { aceternity, canvasui, fancy, magicui, reactbits, shadcn, vengeanceui } from "./sources/registry.js";
import { refero } from "./sources/refero.js";
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
import { threeui } from "./sources/threeui.js";
import { r3f } from "./sources/r3f.js";
import { isTransient } from "./lib/fetch.js";
import type { SourceAdapter } from "./lib/types.js";

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
      console.error(`RETRY ${name} - transient failure (${failed[0].detail}); retry ${attempt}/${MAX_RETRIES} in ${wait}ms`);
      await sleep(wait);
      continue;
    }

    for (const r of rows) {
      console.error(`${r.ok ? "PASS" : "FAIL"}  ${r.step} - ${r.detail}${r.ok ? "" : ` [${r.kind}]`}`);
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

/** Shared shape for adapters that just need search -> getResource -> has code. */
function searchAndCode(name: string, adapter: SourceAdapter, firstBy: "id" | "title") {
  return source(name, async (check) => {
    const res = await adapter.search({ limit: 3 });
    check(`${name}.search`, res.length > 0, `${res.length} results, first="${res[0]?.[firstBy]}"`);
    if (res[0]) {
      const d = await adapter.getResource(res[0].id);
      const hasCode = d?.code && Object.keys(d.code).length > 0;
      check(`${name}.getResource+code`, !!d && !!hasCode,
        `code langs=${d?.code ? Object.keys(d.code).join(",") : "none"}`);
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
    line(r.source, r.ok ? "PASS" : "FAIL", r.kind ?? "-", String(r.attempts), r.detail.slice(0, 110));
  }
  const failed = results.filter((r) => !r.ok);
  const hard = failed.filter((r) => r.kind === "HARD").length;
  console.error(
    `\n${results.length - failed.length}/${results.length} sources passed` +
      (failed.length ? ` - ${failed.length} FAILED (${hard} HARD, ${failed.length - hard} TRANSIENT after ${MAX_RETRIES} retries)` : " - ALL PASS"),
  );
}

async function run() {
  // Watermelon (JSON API)
  await source("watermelon", async (check) => {
    const cats = await watermelon.listCategories();
    check("watermelon.listCategories", cats.length === 5, `${cats.length} kinds`);
    const res = await watermelon.search({ kind: undefined, limit: 3 } as any);
    check("watermelon.search", res.length > 0, `${res.length} results, first="${res[0]?.title}"`);
    if (res[0]) {
      const d = await watermelon.getResource(res[0].id);
      check("watermelon.getResource", !!d, `title="${d?.title}"`);
    }
  });

  // freefrontend (HTML + base64)
  await source("freefrontend", async (check) => {
    const res = await freefrontend.search({ tech: "css", limit: 3 });
    check("freefrontend.search", res.length > 0, `${res.length} results, first="${res[0]?.title}"`);
    if (res[0]) {
      const d = await freefrontend.getResource(`css-hover-effects::${res[0].id}`);
      const hasCode = d?.code && Object.keys(d.code).length > 0;
      check("freefrontend.getResource+code", !!d && !!hasCode,
        `code langs=${d?.code ? Object.keys(d.code).join(",") : "none"}`);
    }
  });

  // ls.graphics (HTML)
  await source("lsgraphics", async (check) => {
    const res = await lsgraphics.search({ limit: 3 });
    check("lsgraphics.search", res.length > 0, `${res.length} results, first="${res[0]?.title}"`);
    if (res[0]) {
      const d = await lsgraphics.getResource(res[0].id);
      check("lsgraphics.getResource", !!d, `title="${d?.title}" formats=${d?.formats?.join(",") ?? "?"}`);
    }
  });

  // Registry sources (shadcn schema): search + code fetch.
  for (const [name, adapter] of [
    ["shadcn", shadcn],
    ["magicui", magicui],
    ["aceternity", aceternity],
    ["reactbits", reactbits],
    ["fancy", fancy],
    ["vengeanceui", vengeanceui],
    ["canvasui", canvasui],
  ] as const) {
    await searchAndCode(name, adapter, "id");
  }

  // Refero styles (public pages -> synthesized DESIGN.md/tokens)
  await source("refero", async (check) => {
    const res = await refero.search({ limit: 3 });
    check("refero.search", res.length > 0, `${res.length} results, first="${res[0]?.title}"`);
    if (res[0]) {
      const d = await refero.getResource(res[0].id);
      const hasMd = !!d?.code?.["design.md"];
      check("refero.getResource+design.md", !!d && hasMd,
        `artifacts=${d?.code ? Object.keys(d.code).join(",") : "none"}`);
    }
  });

  // Package sources: three.js (jsdelivr) + drei (GitHub) + the rest
  for (const [name, adapter] of [
    ["threejs", threejs],
    ["drei", drei],
    ["twojs", twojs],
    ["scrollama", scrollama],
    ["reactspring", reactspring],
    ["zustand", zustand],
    ["glyph", glyph],
    ["postprocessing", postprocessing],
    ["detectgpu", detectgpu],
    ["shadergradient", shadergradient],
    ["liquidlogo", liquidlogo],
    ["liquidglass", liquidglass],
    ["img2threejs", img2threejs],
    ["gsap", gsap],
    ["threeui", threeui],
  ] as const) {
    await searchAndCode(name, adapter, "title");
  }

  // R3F (bundled offline skill markdown)
  await source("r3f", async (check) => {
    const cats = await r3f.listCategories();
    check("r3f.listCategories", cats.length > 0, `${cats.length} categories`);
    const res = await r3f.search({ query: "scroll", limit: 5 });
    check("r3f.search", res.length > 0, `${res.length} results, first="${res[0]?.title}"`);
    if (res[0]) {
      const d = await r3f.getResource(res[0].id);
      const hasCode = d?.code && Object.keys(d.code).length > 0;
      check("r3f.getResource+code", !!d && !!hasCode,
        `code langs=${d?.code ? Object.keys(d.code).join(",") : "none"}`);
    }
  });

  printSummary();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

run();
