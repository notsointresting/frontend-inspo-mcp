// The real launcher: spawn `node dist/index.js` and talk MCP over stdio, like a user's client does.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ADAPTER_LIST } from "../dist/sources/index.js";

describe("stdio launcher (dist/index.js)", () => {
  it("has the CLI shebang as its first line", () => {
    const first = readFileSync(new URL("../dist/index.js", import.meta.url), "utf-8").split(
      "\n",
    )[0];
    assert.equal(first.trim(), "#!/usr/bin/env node");
  });

  it("completes the MCP handshake and serves list_sources over stdio", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [new URL("../dist/index.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")],
      stderr: "pipe",
      env: { ...process.env },
    });
    const client = new Client({ name: "stdio-test", version: "0.0.0" });
    try {
      await client.connect(transport);
      assert.equal(client.getServerVersion()?.name, "frontend-inspo-mcp");
      const r = await client.callTool({ name: "list_sources", arguments: {} });
      assert.equal(JSON.parse(r.content[0].text).length, ADAPTER_LIST.length);
      assert.equal(r.structuredContent.sources.length, ADAPTER_LIST.length);
    } finally {
      await client.close();
    }
  });
});
