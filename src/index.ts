#!/usr/bin/env node
// frontend-inspo-mcp: local stdio MCP server that discovers frontend/design resources
// (components, code, mockups, design tokens) across every source registered in
// sources/index.ts. Tools, resources and prompts live in server.ts.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  await createServer().connect(new StdioServerTransport());
  // stdio MCP servers must not write to stdout; log to stderr only.
  console.error("frontend-inspo-mcp running on stdio");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
