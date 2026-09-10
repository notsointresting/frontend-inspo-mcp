// Copies bundled non-TS assets into dist after tsc (tsc only emits .js).
// Currently: the react-three-fiber skill markdown used by the r3f source.
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "src", "sources", "r3f-content");
const to = join(root, "dist", "sources", "r3f-content");

if (!existsSync(from)) {
  console.error(`copy-assets: source missing: ${from}`);
  process.exit(1);
}
cpSync(from, to, { recursive: true });
console.error(`copy-assets: copied r3f-content -> ${to}`);
