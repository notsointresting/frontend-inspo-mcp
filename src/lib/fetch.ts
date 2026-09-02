// Polite HTTP helper: per-host rate limiting + in-memory TTL cache.
// ponytail: cache is process-memory only (lost on restart); fine for a local stdio MCP.

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

  await throttle(hostOf(url));
  const body = await rawFetch(url);
  cache.set(url, { body, expires: Date.now() + CACHE_TTL_MS });
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
