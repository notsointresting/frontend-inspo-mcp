// Live smoke check: hits each source once and asserts basic parsing works.
// Run after build: `npm run smoke`. Exits non-zero on failure.
import { freefrontend } from "./sources/freefrontend.js";
import { lsgraphics } from "./sources/lsgraphics.js";
import { watermelon } from "./sources/watermelon.js";
import { aceternity, fancy, magicui, reactbits, shadcn } from "./sources/registry.js";
import { refero } from "./sources/refero.js";
import { drei, scrollama, threejs, twojs } from "./sources/packages.js";

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  console.error(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
  if (!ok) failures++;
}

async function run() {
  // Watermelon (JSON API)
  try {
    const cats = await watermelon.listCategories();
    check("watermelon.listCategories", cats.length === 5, `${cats.length} kinds`);
    const res = await watermelon.search({ kind: undefined, limit: 3 } as any);
    check("watermelon.search", res.length > 0, `${res.length} results, first="${res[0]?.title}"`);
    if (res[0]) {
      const d = await watermelon.getResource(res[0].id);
      check("watermelon.getResource", !!d, `title="${d?.title}"`);
    }
  } catch (e) {
    check("watermelon", false, (e as Error).message);
  }

  // freefrontend (HTML + base64)
  try {
    const res = await freefrontend.search({ tech: "css", limit: 3 });
    check("freefrontend.search", res.length > 0, `${res.length} results, first="${res[0]?.title}"`);
    if (res[0]) {
      const d = await freefrontend.getResource(`css-hover-effects::${res[0].id}`);
      const hasCode = d?.code && Object.keys(d.code).length > 0;
      check("freefrontend.getResource+code", !!d && !!hasCode,
        `code langs=${d?.code ? Object.keys(d.code).join(",") : "none"}`);
    }
  } catch (e) {
    check("freefrontend", false, (e as Error).message);
  }

  // ls.graphics (HTML)
  try {
    const res = await lsgraphics.search({ limit: 3 });
    check("lsgraphics.search", res.length > 0, `${res.length} results, first="${res[0]?.title}"`);
    if (res[0]) {
      const d = await lsgraphics.getResource(res[0].id);
      check("lsgraphics.getResource", !!d, `title="${d?.title}" formats=${d?.formats?.join(",") ?? "?"}`);
    }
  } catch (e) {
    check("lsgraphics", false, (e as Error).message);
  }

  // Registry sources (shadcn schema): search + code fetch.
  for (const [name, adapter] of [
    ["shadcn", shadcn],
    ["magicui", magicui],
    ["aceternity", aceternity],
    ["reactbits", reactbits],
    ["fancy", fancy],
  ] as const) {
    try {
      const res = await adapter.search({ limit: 3 });
      check(`${name}.search`, res.length > 0, `${res.length} results, first="${res[0]?.id}"`);
      if (res[0]) {
        const d = await adapter.getResource(res[0].id);
        const hasCode = d?.code && Object.keys(d.code).length > 0;
        check(`${name}.getResource+code`, !!d && !!hasCode,
          `code langs=${d?.code ? Object.keys(d.code).join(",") : "none"}`);
      }
    } catch (e) {
      check(name, false, (e as Error).message);
    }
  }

  // Refero styles (public API -> synthesized DESIGN.md/tokens)
  try {
    const res = await refero.search({ limit: 3 });
    check("refero.search", res.length > 0, `${res.length} results, first="${res[0]?.title}"`);
    if (res[0]) {
      const d = await refero.getResource(res[0].id);
      const hasMd = !!d?.code?.["design.md"];
      check("refero.getResource+design.md", !!d && hasMd,
        `artifacts=${d?.code ? Object.keys(d.code).join(",") : "none"}`);
    }
  } catch (e) {
    check("refero", false, (e as Error).message);
  }

  // Package sources: three.js (jsdelivr) + drei (GitHub)
  for (const [name, adapter] of [
    ["threejs", threejs],
    ["drei", drei],
    ["twojs", twojs],
    ["scrollama", scrollama],
  ] as const) {
    try {
      const res = await adapter.search({ limit: 3 });
      check(`${name}.search`, res.length > 0, `${res.length} results, first="${res[0]?.title}"`);
      if (res[0]) {
        const d = await adapter.getResource(res[0].id);
        const hasCode = d?.code && Object.keys(d.code).length > 0;
        check(`${name}.getResource+code`, !!d && !!hasCode,
          `code langs=${d?.code ? Object.keys(d.code).join(",") : "none"}`);
      }
    } catch (e) {
      check(name, false, (e as Error).message);
    }
  }

  console.error(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
  process.exit(failures === 0 ? 0 : 1);
}

run();
