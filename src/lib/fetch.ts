// Polite HTTP helper: per-host rate limiting + in-memory TTL cache.
// Optional disk cache: set FRONTEND_INSPO_CACHE_DIR to persist responses across
// restarts (memory stays the fast first layer). ponytail: disk cache is opt-in;
// default behavior is unchanged (memory-only).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const USER_AGENT =
  "frontend-inspo-mcp/0.1 (+https://github.com/) local discovery agent";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MIN_GAP_MS = 400; // min delay between requests to the same host

interface CacheEntry {
  body: string;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const lastHit = new Map<string, number>(); // host -> timestamp
const hostChain = new Map<string, Promise<unknown>>(); // serialize per host

// --- optional disk cache ----------------------------------------------------
const DISK_CACHE_DIR = process.env.FRONTEND_INSPO_CACHE_DIR;
if (DISK_CACHE_DIR) {
  try {
    mkdirSync(DISK_CACHE_DIR, { recursive: true });
  } catch {
    /* if we can't create it, silently fall back to memory-only */
  }
}
const diskPath = (url: string): string | null => {
  if (!DISK_CACHE_DIR) return null;
  const key = createHash("sha1").update(url).digest("hex");
  return join(DISK_CACHE_DIR, `${key}.json`);
};
function diskRead(url: string): string | null {
  const p = diskPath(url);
  if (!p) return null;
  try {
    const entry = JSON.parse(readFileSync(p, "utf-8")) as CacheEntry;
    if (entry.expires > Date.now()) return entry.body;
  } catch {
    /* missing or corrupt — treat as miss */
  }
  return null;
}
function diskWrite(url: string, entry: CacheEntry): void {
  const p = diskPath(url);
  if (!p) return;
  try {
    writeFileSync(p, JSON.stringify(entry));
  } catch {
    /* best-effort */
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

async function throttle(host: string): Promise<void> {
  const prev = hostChain.get(host) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  hostChain.set(
    host,
    prev.then(() => next),
  );
  await prev;
  const last = lastHit.get(host) ?? 0;
  const wait = Math.max(0, MIN_GAP_MS - (Date.now() - last));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
  // release the slot shortly after so the next queued request can proceed
  setTimeout(release, 0);
}

async function rawFetch(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "*/*" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch text with cache + throttle. */
export async function fetchText(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.body;

  // second layer: optional disk cache (survives restarts)
  const fromDisk = diskRead(url);
  if (fromDisk !== null) {
    cache.set(url, { body: fromDisk, expires: Date.now() + CACHE_TTL_MS });
    return fromDisk;
  }

  await throttle(hostOf(url));
  const body = await rawFetch(url);
  const entry = { body, expires: Date.now() + CACHE_TTL_MS };
  cache.set(url, entry);
  diskWrite(url, entry);
  return body;
}

/** Fetch and parse JSON. */
export async function fetchJson<T = unknown>(url: string): Promise<T> {
  const text = await fetchText(url);
  return JSON.parse(text) as T;
}

/** Decode a base64 string to UTF-8 (used for freefrontend inline code). */
export function decodeBase64(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf-8");
}
