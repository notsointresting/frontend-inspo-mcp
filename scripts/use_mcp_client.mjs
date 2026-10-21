import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";

async function run() {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer().connect(a);
  const client = new Client({ name: "cli-tester", version: "1.0.0" });
  await client.connect(b);

  console.log("=== 1. Listing Registered Tools ===");
  const tools = await client.listTools();
  console.log(`Found ${tools.tools.length} tools:`, tools.tools.map((t) => t.name).join(", "));

  console.log("\n=== 2. Calling list_sources ===");
  const sourcesRes = await client.callTool({ name: "list_sources", arguments: {} });
  const sourcesData = JSON.parse(sourcesRes.content[0].text);
  console.log(
    `Total sources: ${sourcesData.sources ? sourcesData.sources.length : sourcesData.length}`,
  );

  console.log("\n=== 3. Searching for 'badge' in search_all ===");
  const searchRes = await client.callTool({
    name: "search_all",
    arguments: { query: "badge", limit: 3 },
  });
  const searchJson = JSON.parse(searchRes.content[0].text);
  console.log(
    `Found ${searchJson.count} matches (searched ${searchJson.sourcesSearched} sources):`,
  );
  searchJson.results.forEach((r, i) => {
    console.log(` [${i + 1}] [${r.source}] ${r.title} (${r.id}) -> ${r.url}`);
  });

  console.log("\n=== 4. Fetching Code for shadcn 'badge' ===");
  const codeRes = await client.callTool({
    name: "get_code",
    arguments: { source: "shadcn", id: "badge" },
  });
  const codeJson = JSON.parse(codeRes.content[0].text);
  console.log(`Retrieved badge code files:`, Object.keys(codeJson.code || {}));
  const firstKey = Object.keys(codeJson.code || {})[0];
  if (firstKey) {
    console.log(
      `Preview of ${firstKey} (first 250 chars):\n${codeJson.code[firstKey].slice(0, 250)}...`,
    );
  }

  console.log("\n=== 5. Testing get_code with asSandbox: true ===");
  const sandboxRes = await client.callTool({
    name: "get_code",
    arguments: { source: "shadcn", id: "badge", asSandbox: true },
  });
  const sandboxJson = JSON.parse(sandboxRes.content[0].text);
  console.log("Files returned with asSandbox:", Object.keys(sandboxJson.code || {}));
  if (sandboxJson.code?.["sandbox.html"]) {
    console.log(
      "Successfully generated sandbox.html! Length:",
      sandboxJson.code["sandbox.html"].length,
      "chars",
    );
    console.log("Snippet:\n", sandboxJson.code["sandbox.html"].slice(0, 300));
  }

  await client.close();
}

run().catch(console.error);
