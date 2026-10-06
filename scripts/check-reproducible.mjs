// Proves the build is repeatable: build from a clean dist/ twice and compare every file's hash.
// Usage: node scripts/check-reproducible.mjs   (exits non-zero if the two builds differ)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
// Same steps as `npm run build`, run without a shell: tsc, then copy bundled assets.
const tscBin = join(
  dirname(createRequire(import.meta.url).resolve("typescript/package.json")),
  "bin",
  "tsc",
);

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : [p];
  });
}

function buildAndHash() {
  rmSync(dist, { recursive: true, force: true });
  for (const args of [[tscBin], [join(root, "scripts", "copy-assets.mjs")]]) {
    execFileSync(process.execPath, args, { cwd: root, stdio: "ignore" });
  }
  const hashes = {};
  for (const file of listFiles(dist).sort()) {
    hashes[relative(dist, file).replaceAll("\\", "/")] = createHash("sha256")
      .update(readFileSync(file))
      .digest("hex");
  }
  return hashes;
}

const first = buildAndHash();
const second = buildAndHash();
const names = new Set([...Object.keys(first), ...Object.keys(second)]);
const differing = [...names].filter((n) => first[n] !== second[n]);

if (differing.length > 0) {
  console.error(`NOT reproducible. Differing files:\n  ${differing.join("\n  ")}`);
  process.exit(1);
}
console.log(`Reproducible build: ${names.size} files identical across two clean builds.`);
