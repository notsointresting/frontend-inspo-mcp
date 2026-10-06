// Fails if server.json (MCP Registry entry) or manifest.json (MCP Bundle) describe a different
// release than package.json. The publish workflow runs it before `npm publish`.
// Usage: node scripts/check-versions.mjs   (or npm run check:versions)
import { readFileSync } from "node:fs";

const read = (file) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const pkg = read("package.json");
const server = read("server.json");
const manifest = read("manifest.json");

// [field, found, expected]. The registry also requires server.json's name to equal mcpName.
const checks = [
  ["server.json name", server.name, pkg.mcpName],
  ["server.json version", server.version, pkg.version],
  ...server.packages.flatMap((p, i) => [
    [`server.json packages[${i}].identifier`, p.identifier, pkg.name],
    [`server.json packages[${i}].version`, p.version, pkg.version],
  ]),
  ["manifest.json version", manifest.version, pkg.version],
];
const wrong = checks.filter(([, found, expected]) => found !== expected);
for (const [field, found, expected] of wrong) {
  console.error(
    `${field} is ${JSON.stringify(found)}; package.json says ${JSON.stringify(expected)}`,
  );
}
if (wrong.length > 0) process.exit(1);
console.log(`server.json and manifest.json match package.json (${pkg.version}).`);
