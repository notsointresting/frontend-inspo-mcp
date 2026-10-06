// The whole MCP server, in-process: a real SDK client talks to createServer() over a linked
// in-memory transport, with the network faked. Covers registration, validation and errors.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, MAX_RESPONSE_CHARS } from "../dist/server.js";
import { mockFetch } from "./helpers.mjs";

const SHADCN_INDEX = [
  { name: "button", type: "registry:ui", description: "A button", categories: ["forms"] },
  { name: "huge", type: "registry:ui", description: "x" },
];
const BUTTON = {
  name: "button",
  type: "registry:ui",
  files: [{ path: "ui/button.tsx", content: "export const Button = 1;" }],
};

mockFetch((url) => {
  if (url === "https://ui.shadcn.com/r/index.json") return { body: JSON.stringify(SHADCN_INDEX) };
  if (url.endsWith("/new-york/button.json")) return { body: JSON.stringify(BUTTON) };
  if (url.endsWith("/new-york/huge.json")) {
    // Bigger than the response cap, to prove oversize payloads are refused.
    const content = "x".repeat(MAX_RESPONSE_CHARS + 10);
    return { body: JSON.stringify({ name: "huge", files: [{ path: "a.tsx", content }] }) };
  }
  if (url.includes("ui.watermelon.sh")) return { status: 400, body: "{}" };
  if (url.includes("/r/registry.json")) return { status: 429, headers: { "retry-after": "0" } };
  return { status: 404 };
});

const text = (r) => r.content[0].text;
const data = (r) => JSON.parse(text(r));

let client;
before(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer().connect(a);
  client = new Client({ name: "server-test", version: "0.0.0" });
  await client.connect(b);
});
after(() => client.close());

describe("server", () => {
  it("reports the package version and exposes exactly the six tools, all read-only", async () => {
    const pkg = (await import("../package.json", { with: { type: "json" } })).default;
    assert.equal(client.getServerVersion().version, pkg.version);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), [
      "get_code",
      "get_resource",
      "list_categories",
      "list_sources",
      "search_all",
      "search_resources",
    ]);
    for (const t of tools) assert.equal(t.annotations?.readOnlyHint, true, t.name);
  });

  it("list_sources returns all 27 sources", async () => {
    const sources = data(await client.callTool({ name: "list_sources", arguments: {} }));
    assert.equal(sources.length, 27);
    assert.ok(sources.every((s) => s.id && s.label && s.homepage));
  });

  it("search_resources, get_resource and get_code work end to end", async () => {
    const s = data(
      await client.callTool({
        name: "search_resources",
        arguments: { source: "shadcn", query: "button" },
      }),
    );
    assert.equal(s.count, 1);
    assert.equal(s.results[0].id, "button");
    const r = data(
      await client.callTool({
        name: "get_resource",
        arguments: { source: "shadcn", id: "button" },
      }),
    );
    assert.equal(r.code.tsx, "export const Button = 1;");
    const c = data(
      await client.callTool({ name: "get_code", arguments: { source: "shadcn", id: "button" } }),
    );
    assert.deepEqual(c.code, { tsx: "export const Button = 1;" });
  });

  it("list_categories works and search_all merges sources and reports per-source errors", async () => {
    const cats = data(
      await client.callTool({ name: "list_categories", arguments: { source: "shadcn" } }),
    );
    assert.ok(cats.some((x) => x.id === "forms"));
    const all = data(
      await client.callTool({
        name: "search_all",
        arguments: { query: "button", sources: ["shadcn", "magicui"], perSource: 3 },
      }),
    );
    assert.equal(all.sourcesSearched, 2);
    assert.ok(all.results.some((r) => r.source === "shadcn"));
    assert.equal(all.errors.length, 1);
    assert.equal(all.errors[0].source, "magicui");
  });

  it("returns tool errors (not crashes) for upstream failures and unknown resources", async () => {
    const missing = await client.callTool({
      name: "get_resource",
      arguments: { source: "shadcn", id: "nope" },
    });
    assert.equal(missing.isError, true);
    assert.match(text(missing), /not found/i);
    const broken = await client.callTool({
      name: "search_resources",
      arguments: { source: "watermelon" },
    });
    assert.equal(broken.isError, true);
    assert.match(text(broken), /search_resources failed for watermelon/);
    const cats = await client.callTool({
      name: "list_categories",
      arguments: { source: "magicui" },
    });
    assert.equal(cats.isError, true);
    assert.match(text(cats), /list_categories failed/);
  });

  it("get_code explains when a source has no inline code", async () => {
    const r = await client.callTool({
      name: "get_code",
      arguments: { source: "lsgraphics", id: "x" },
    });
    assert.equal(r.isError, true);
    assert.match(text(r), /no inline code/);
  });

  it("refuses responses larger than the size cap", async () => {
    const r = await client.callTool({
      name: "get_resource",
      arguments: { source: "shadcn", id: "huge" },
    });
    assert.equal(r.isError, true);
    assert.match(text(r), /Response too large/);
    assert.ok(text(r).length < 1000);
  });

  it("rejects malformed input before any adapter runs", async () => {
    const bad = [
      { name: "get_resource", arguments: { source: "shadcn", id: "../../etc/passwd" } },
      { name: "get_code", arguments: { source: "shadcn", id: "a?b=c" } },
      { name: "search_resources", arguments: { source: "shadcn", category: "a\nb" } },
      { name: "search_resources", arguments: { source: "shadcn", tech: "<script>" } },
      { name: "search_resources", arguments: { source: "shadcn", query: "q".repeat(201) } },
      { name: "search_resources", arguments: { source: "nope" } },
      { name: "search_resources", arguments: { source: "shadcn", limit: 1000 } },
      { name: "search_all", arguments: { query: "x", perSource: 99 } },
    ];
    for (const call of bad) {
      const r = await client.callTool(call);
      assert.equal(r.isError, true, `should reject ${JSON.stringify(call)}`);
      assert.match(text(r), /validation/i);
    }
  });
});
