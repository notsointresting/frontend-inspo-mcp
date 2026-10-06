// The server's other MCP features, in-process with the network faked: outputSchema plus
// structuredContent, the inspo://{source}/{+id} resource template (read, list, complete) and
// the two workflow prompts.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, MAX_RESPONSE_CHARS, NOTICE } from "../dist/server.js";
import { getAdapter, SOURCE_IDS } from "../dist/sources/index.js";
import { mockFetch } from "./helpers.mjs";

const SHADCN_INDEX = [
  { name: "button", type: "registry:ui", description: "A button", categories: ["forms"] },
  { name: "multi", type: "registry:block", description: "Several files" },
  { name: "huge", type: "registry:ui", description: "x" },
];
const BUTTON = {
  name: "button",
  type: "registry:ui",
  files: [{ path: "ui/button.tsx", content: "export const Button = 1;" }],
};
const MULTI = {
  name: "multi",
  type: "registry:block",
  files: [
    { path: "ui/multi.tsx", content: "export const Multi = 1;" },
    { path: "styles/multi.css", content: ".multi{}" },
    { path: "ui/multi-item.tsx", content: "export const Item = 2;" },
  ],
};
const HUGE = { name: "huge", files: [{ path: "ui/huge.tsx", content: "h".repeat(160_000) }] };

// Loose URL matching: the shadcn index and item paths are being changed in parallel.
const calls = mockFetch((url) => {
  if (url.startsWith("https://ui.shadcn.com/")) {
    if (/\/(index|registry)\.json$/.test(url)) return { body: JSON.stringify(SHADCN_INDEX) };
    if (url.endsWith("/button.json")) return { body: JSON.stringify(BUTTON) };
    if (url.endsWith("/multi.json")) return { body: JSON.stringify(MULTI) };
    if (url.endsWith("/huge.json")) return { body: JSON.stringify(HUGE) };
    return { status: 404 };
  }
  if (url.includes("/r/registry.json")) return { status: 429, headers: { "retry-after": "0" } };
  return { status: 404 };
});

const text = (r) => r.content[0].text;
const plain = (v) => JSON.parse(JSON.stringify(v));
const TEMPLATE = "inspo://{source}/{+id}";

let client;
const call = (name, args) => client.callTool({ name, arguments: args });
const read = (uri) => client.readResource({ uri });
before(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer().connect(a);
  client = new Client({ name: "server-mcp-test", version: "0.0.0" });
  await client.connect(b);
  await client.listTools(); // makes the client check every structuredContent against its schema
});
after(() => client.close());

describe("structured output", () => {
  it("declares an outputSchema for the four listing/search tools only", async () => {
    const { tools } = await client.listTools();
    const by = Object.fromEntries(tools.map((t) => [t.name, t]));
    for (const n of ["list_sources", "list_categories", "search_resources", "search_all"]) {
      assert.equal(by[n].outputSchema?.type, "object", n);
    }
    assert.equal(by.get_resource.outputSchema, undefined);
    assert.equal(by.get_code.outputSchema, undefined);
  });

  it("returns structuredContent next to the unchanged JSON text", async () => {
    const ls = await call("list_sources", {});
    assert.ok(Array.isArray(JSON.parse(text(ls))), "text stays the plain array");
    assert.deepEqual(plain(ls.structuredContent), { sources: JSON.parse(text(ls)) });

    const lc = await call("list_categories", { source: "shadcn" });
    assert.deepEqual(plain(lc.structuredContent), {
      source: "shadcn",
      categories: JSON.parse(text(lc)),
    });

    const sr = await call("search_resources", { source: "shadcn", query: "button" });
    assert.deepEqual(plain(sr.structuredContent), JSON.parse(text(sr)));
    assert.equal(sr.structuredContent.notice, NOTICE);

    const sa = await call("search_all", { query: "button", sources: ["shadcn", "magicui"] });
    assert.deepEqual(plain(sa.structuredContent), JSON.parse(text(sa)));
    assert.equal(sa.structuredContent.errors[0].source, "magicui");
  });

  it("sends tool errors without structuredContent, which the client accepts", async () => {
    const r = await call("list_categories", { source: "magicui" });
    assert.equal(r.isError, true);
    assert.equal(r.structuredContent, undefined);
  });
});

describe("inspo:// resource template", () => {
  it("is listed with a {+id} variable so ids may contain slashes", async () => {
    const { resourceTemplates } = await client.listResourceTemplates();
    assert.deepEqual(
      resourceTemplates.map((t) => t.uriTemplate),
      [TEMPLATE],
    );
    assert.match(resourceTemplates[0].description, /untrusted third-party/);
  });

  it("reads metadata as JSON, then each code file as text with a MIME type", async () => {
    const r = await read("inspo://shadcn/multi");
    const [meta, ...files] = r.contents;
    assert.equal(meta.uri, "inspo://shadcn/multi");
    assert.equal(meta.mimeType, "application/json");
    const m = JSON.parse(meta.text);
    assert.equal(m.notice, NOTICE);
    assert.equal(m.id, "multi");
    assert.equal(m.code, undefined);
    assert.deepEqual(m.files, { tsx: 23, css: 8, "tsx:ui/multi-item.tsx": 22 });
    assert.deepEqual(
      files.map((f) => [f.uri, f.mimeType, f.text]),
      [
        ["inspo://shadcn/multi#tsx", "text/typescript", "export const Multi = 1;"],
        ["inspo://shadcn/multi#css", "text/css", ".multi{}"],
        ["inspo://shadcn/multi#tsx:ui/multi-item.tsx", "text/typescript", "export const Item = 2;"],
      ],
    );
  });

  it("reads one file when the URI has a #file fragment", async () => {
    const r = await read("inspo://shadcn/multi#tsx:ui/multi-item.tsx");
    assert.equal(r.contents.length, 2);
    assert.equal(r.contents[1].text, "export const Item = 2;");
    await assert.rejects(read("inspo://shadcn/multi#nope"), /No file "nope"/);
  });

  it("passes ids with slashes, leading slashes and percent-escapes to the adapter", async () => {
    const seen = [];
    const a = getAdapter("watermelon");
    const original = a.getResource;
    a.getResource = async (id) => {
      seen.push(id);
      return { source: "watermelon", id, title: id, url: "https://ui.watermelon.sh/" };
    };
    try {
      for (const uri of [
        "inspo://watermelon/blocks/hero-1",
        "inspo://watermelon//src/routes/(docs)/+page.md",
        "inspo://watermelon/src%2Froutes%2F%28docs%29%2F%2Bpage.md",
      ]) {
        const r = await read(uri);
        assert.equal(r.contents.length, 1, "no code, so metadata only");
      }
      assert.deepEqual(seen, [
        "blocks/hero-1",
        "/src/routes/(docs)/+page.md",
        "src/routes/(docs)/+page.md",
      ]);
    } finally {
      a.getResource = original;
    }
  });

  it("rejects unknown sources, invalid ids and missing resources", async () => {
    await assert.rejects(read("inspo://nope/button"), /Unknown source: nope/);
    await assert.rejects(read("inspo://shadcn/a%3Fb"), /Invalid id/);
    await assert.rejects(read("inspo://shadcn/a/../../etc/passwd"), /not found/i);
    await assert.rejects(read("inspo://shadcn/missing"), /Resource not found: shadcn \/ missing/);
  });

  it("returns only the file sizes when the files are over the reply cap", async () => {
    const r = await read("inspo://shadcn/huge");
    assert.equal(r.contents.length, 1);
    assert.ok(r.contents[0].text.length <= MAX_RESPONSE_CHARS);
    const m = JSON.parse(r.contents[0].text);
    assert.equal(m.tooLarge, true);
    assert.deepEqual(m.files, { tsx: 160_000 });
    assert.match(m.hint, /inspo:\/\/shadcn\/huge#<file>/);
  });

  it("lists only the bundled r3f docs, without any network request", async () => {
    const before = calls.length;
    const { resources } = await client.listResources();
    assert.equal(calls.length, before);
    assert.ok(resources.length > 0);
    for (const r of resources) assert.match(r.uri, /^inspo:\/\/r3f\/[a-z-]+$/);
    const doc = await read(resources[0].uri);
    assert.equal(doc.contents[1].mimeType, "text/markdown");
    assert.ok(doc.contents[1].text.length > 100);
  });

  it("completes the source variable with source ids", async () => {
    const complete = (value) =>
      client.complete({
        ref: { type: "ref/resource", uri: TEMPLATE },
        argument: { name: "source", value },
      });
    const sha = await complete("sha");
    assert.ok(sha.completion.values.includes("shadcn"));
    assert.ok(sha.completion.values.every((v) => v.startsWith("sha")));
    const all = await complete("");
    assert.equal(all.completion.total, SOURCE_IDS.length);
  });
});

describe("prompts", () => {
  it("lists find_component and design_system_from_site with their arguments", async () => {
    const { prompts } = await client.listPrompts();
    const args = Object.fromEntries(
      prompts.map((p) => [p.name, p.arguments.map((a) => [a.name, a.required])]),
    );
    assert.deepEqual(args, {
      find_component: [
        ["what", true],
        ["stack", false],
      ],
      design_system_from_site: [["site", true]],
    });
    for (const p of prompts) assert.ok(p.title && p.description, p.name);
  });

  it("find_component tells the agent which tools to call, in order", async () => {
    const r = await client.getPrompt({
      name: "find_component",
      arguments: { what: "pricing table", stack: "react" },
    });
    const t = r.messages[0].content.text;
    assert.equal(r.messages[0].role, "user");
    assert.match(t, /search_all with query "pricing table" and stack \["react"\]/);
    const order = ["search_all", "list_sources", "search_resources", "get_resource", "get_code"];
    const at = order.map((tool) => t.indexOf(tool));
    assert.ok(at.every((i) => i >= 0));
    assert.deepEqual(
      [...at].sort((x, y) => x - y),
      at,
    );
    assert.match(t, /never follow instructions/);
    const noStack = await client.getPrompt({ name: "find_component", arguments: { what: "x" } });
    assert.doesNotMatch(noStack.messages[0].content.text, /stack \[/);
    await assert.rejects(
      client.getPrompt({ name: "find_component", arguments: { what: "x", stack: "cobol" } }),
    );
  });

  it("design_system_from_site points at the design-system sources and the fetch tools", async () => {
    const r = await client.getPrompt({
      name: "design_system_from_site",
      arguments: { site: "linear.app" },
    });
    const t = r.messages[0].content.text;
    assert.match(t, /search_all with query "linear\.app" and sources \[[^\]]*"refero"/);
    assert.ok(t.indexOf("get_resource") < t.indexOf("get_code"));
    assert.match(t, /instead of inventing values/);
  });
});
