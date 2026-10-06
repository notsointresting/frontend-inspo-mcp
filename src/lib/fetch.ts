// Polite HTTP helper: per-host rate limiting, retries, and a bounded in-memory cache (TTL + LRU,
// concurrent requests for one URL share a single fetch).
// Optional disk cache: set FRONTEND_INSPO_CACHE_DIR to persist responses across
// restarts (memory stays the fast first layer). ponytail: disk cache is opt-in;
// default behavior is unchanged (memory-only).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

const PROJECT_URL = "https://github.com/notsointresting/frontend-inspo-mcp";

function packageVersion(): string {
  // dist/lib/fetch.js -> ../../package.json (as in server.ts); "0" if it can't be read.
  try {
    const { version } = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
    ) as { version?: unknown };
    return typeof version === "string" && /^[\w.+-]+$/.test(version) ? version : "0";
  } catch {
    return "0";
  }
}

/** Unique, honest UA: some APIs require one, and site owners can allow or block us by name. */
const USER_AGENT = `frontend-inspo-mcp/${packageVersion()} (+${PROJECT_URL})`;

/** A non-negative number from the environment, read per call; `fallback` when unset or invalid. */
function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const v = Number(raw);
  return raw && Number.isFinite(v) && v >= 0 ? v : fallback;
}

const DEFAULT_MIN_GAP_MS = 400; // min delay between requests to the same host
/** Hosts whose robots.txt asks for a longer gap (Crawl-delay), in ms. */
const HOST_MIN_GAP_MS = new Map([["www.ui-layouts.com", 1000]]); // "Crawl-delay: 1"
/** Politeness gap for `host`: FRONTEND_INSPO_MIN_GAP_MS replaces the default, a host's
 *  Crawl-delay raises it, and 0 switches every gap off (the unit tests set 0). Read per call. */
export function minGapMs(host: string): number {
  const gap = envNumber("FRONTEND_INSPO_MIN_GAP_MS", DEFAULT_MIN_GAP_MS);
  return gap === 0 ? 0 : Math.max(gap, HOST_MIN_GAP_MS.get(host) ?? 0);
}

// --- memory cache -------------------------------------------------------------

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const IMMUTABLE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
/** Lifetime of an ordinary response; FRONTEND_INSPO_CACHE_TTL_MS overrides it. Read per call. */
const defaultTtlMs = (): number => envNumber("FRONTEND_INSPO_CACHE_TTL_MS", DEFAULT_TTL_MS);

// Version-pinned URLs (an exact npm version or a git commit SHA): their content never changes.
const NPM_EXACT = String.raw`(?:@[^/@]+/)?[^/@]+@\d+\.\d+\.\d+(?:[-+][\w.+-]*)?`;
const IMMUTABLE_URLS = [
  new RegExp(String.raw`^https://cdn\.jsdelivr\.net/npm/${NPM_EXACT}/`),
  new RegExp(String.raw`^https://data\.jsdelivr\.com/v1/packages/npm/${NPM_EXACT}(?:[/?]|$)`),
  /^https:\/\/cdn\.jsdelivr\.net\/gh\/[^/@]+\/[^/@]+@[0-9a-f]{40}\//,
  /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[0-9a-f]{40}\//,
];

/** How long a response for `url` stays cached: a day for version-pinned URLs (or the configured
 *  TTL if that is longer), the configured TTL (default 10 minutes) for everything else. */
export function cacheTtlMs(url: string): number {
  const ttl = defaultTtlMs();
  return IMMUTABLE_URLS.some((re) => re.test(url)) ? Math.max(IMMUTABLE_TTL_MS, ttl) : ttl;
}

interface CacheEntry {
  body: string;
  expires: number;
}

/** Map order doubles as LRU order: a hit moves the entry to the end. */
const cache = new Map<string, CacheEntry>();
let cachedChars = 0; // sum of the body lengths held in `cache`
const MAX_ENTRY_CHARS = 2 * 1024 * 1024; // callers parse and keep bigger bodies themselves
const DEFAULT_MAX_CACHE_CHARS = 64 * 1024 * 1024;
/** Memory budget in characters (~bytes); FRONTEND_INSPO_CACHE_MAX_BYTES overrides it. Per call. */
const maxCacheChars = (): number =>
  envNumber("FRONTEND_INSPO_CACHE_MAX_BYTES", DEFAULT_MAX_CACHE_CHARS);

function forget(url: string, e: CacheEntry): void {
  cache.delete(url);
  cachedChars -= e.body.length;
}

function cacheGet(url: string): string | undefined {
  const e = cache.get(url);
  if (!e) return undefined;
  forget(url, e);
  if (e.expires <= Date.now()) return undefined;
  cache.set(url, e); // re-insert as the most recently used
  cachedChars += e.body.length;
  return e.body;
}

function cacheSet(url: string, entry: CacheEntry): void {
  const now = Date.now();
  const old = cache.get(url);
  if (old) forget(url, old);
  // ponytail: full O(entries) sweep on every write; each write follows a network round trip or a
  // disk read that costs far more. Upgrade path: an expiry-ordered heap if writes ever get hot.
  for (const [k, e] of cache) if (e.expires <= now) forget(k, e);
  const size = entry.body.length;
  const cap = maxCacheChars();
  if (size > MAX_ENTRY_CHARS || size > cap || entry.expires <= now) return;
  for (const [k, e] of cache) {
    if (cachedChars + size <= cap) break;
    forget(k, e); // least recently used first
  }
  cache.set(url, entry);
  cachedChars += size;
}

/** What the memory cache holds right now: entry count and total body characters. */
export function cacheStats(): { entries: number; chars: number } {
  return { entries: cache.size, chars: cachedChars };
}

const lastHit = new Map<string, number>(); // host -> timestamp
const hostChain = new Map<string, Promise<unknown>>(); // serialize per host
const inFlight = new Map<string, Promise<string>>(); // url -> the one request all callers share

// --- optional disk cache ----------------------------------------------------
const DISK_CACHE_DIR = process.env.FRONTEND_INSPO_CACHE_DIR;
const CACHE_FILE = /^[0-9a-f]{64}\.json$/; // the names diskPath() writes; nothing else is touched
const diskPath = (url: string): string | null => {
  if (!DISK_CACHE_DIR) return null;
  const key = createHash("sha256").update(url).digest("hex");
  return join(DISK_CACHE_DIR, `${key}.json`);
};
function diskRead(url: string): CacheEntry | null {
  const p = diskPath(url);
  if (!p) return null;
  try {
    const entry = JSON.parse(readFileSync(p, "utf-8")) as CacheEntry;
    if (entry.expires > Date.now() && typeof entry.body === "string") return entry;
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

// ponytail: one stat per file, sequentially, once at startup; the directory holds about a day of
// responses. Upgrade path: cap the files checked per run if it ever gets large.
/** Delete cache files older than the longest TTL we hand out, so the directory stays bounded.
 *  Best-effort: never throws, and only touches files named like ours. */
export async function sweepDiskCache(dir: string): Promise<void> {
  try {
    const cutoff = Date.now() - Math.max(IMMUTABLE_TTL_MS, defaultTtlMs());
    for (const name of await readdir(dir)) {
      if (!CACHE_FILE.test(name)) continue;
      const p = join(dir, name);
      try {
        const s = await stat(p);
        if (s.isFile() && s.mtimeMs < cutoff) await unlink(p);
      } catch {
        /* vanished or locked: skip it */
      }
    }
  } catch {
    /* unreadable directory: nothing to sweep */
  }
}

if (DISK_CACHE_DIR) {
  try {
    mkdirSync(DISK_CACHE_DIR, { recursive: true });
  } catch {
    /* if we can't create it, silently fall back to memory-only */
  }
  void sweepDiskCache(DISK_CACHE_DIR);
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
  const wait = Math.max(0, minGapMs(host) - (Date.now() - last));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
  // release the slot shortly after so the next queued request can proceed
  setTimeout(release, 0);
}

/** HTTP/network failure. `transient` = upstream trouble worth retrying (rate limit, gateway,
 *  network); `retryable` = worth retrying right now (false when the wait would be too long). */
export class FetchError extends Error {
  constructor(
    message: string,
    readonly transient: boolean,
    readonly status?: number,
    readonly retryAfterMs?: number,
    readonly retryable = transient,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export interface FetchOptions {
  /** Non-2xx statuses whose body should still be returned (e.g. ls.graphics
   *  serves a complete page with HTTP 500). */
  okStatuses?: number[];
}

const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 1000;
const MAX_WAIT_MS = 30_000; // never stall a tool call longer than this per retry
const RETRY_STATUS = new Set([403, 429, 502, 503, 504]);
/** jsDelivr answers 403 for packages and repos over its size limit: permanent, never retried. */
const JSDELIVR_HOSTS = new Set(["data.jsdelivr.com", "cdn.jsdelivr.net"]);

/** How long the server asked us to wait (Retry-After, else X-RateLimit-Reset). */
export function serverWaitMs(h: Headers, now = Date.now()): number | undefined {
  const ra = h.get("retry-after");
  if (ra) {
    const secs = Number(ra);
    if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
    const date = Date.parse(ra);
    if (!Number.isNaN(date)) return Math.max(0, date - now);
  }
  const reset = Number(h.get("x-ratelimit-reset"));
  if (h.get("x-ratelimit-remaining") === "0" && Number.isFinite(reset) && reset > 0) {
    return Math.max(0, reset * 1000 - now);
  }
  return undefined;
}

/** Exponential backoff (1s, 2s, ...) unless the server told us how long to wait. */
export function retryDelayMs(attempt: number, serverMs?: number): number {
  return Math.min(serverMs ?? BACKOFF_BASE_MS * 2 ** attempt, MAX_WAIT_MS);
}

/** "HH:MM" (UTC) when api.github.com says its quota is used up for longer than we would wait. */
function githubQuotaReset(url: string, res: Response): string | undefined {
  if (hostOf(url) !== "api.github.com" || (res.status !== 403 && res.status !== 429)) {
    return undefined;
  }
  if (res.headers.get("x-ratelimit-remaining") !== "0") return undefined;
  const reset = new Date(Number(res.headers.get("x-ratelimit-reset")) * 1000);
  // A near, missing or malformed reset keeps the normal wait-and-retry path.
  if (!(reset.getTime() - Date.now() > MAX_WAIT_MS)) return undefined;
  return reset.toISOString().slice(11, 16);
}

/** GITHUB_TOKEN, or undefined when it is unset or a placeholder an MCP client passes for an empty
 *  setting: "", "undefined", "null" or an unsubstituted "${...}" template. Read per call. */
function githubToken(): string | undefined {
  const token = process.env.GITHUB_TOKEN?.trim();
  return token && !/^(?:undefined|null|\$\{.*\})$/i.test(token) ? token : undefined;
}

function requestHeaders(url: string): Record<string, string> {
  const headers: Record<string, string> = { "user-agent": USER_AGENT, accept: "*/*" };
  // Token goes to the GitHub API host only, never to third-party sites.
  if (hostOf(url) === "api.github.com") {
    headers.accept = "application/vnd.github+json";
    const token = githubToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

/** Largest response body we will read. The biggest real one (ThreeUI manifest) is ~30 MB. */
const DEFAULT_MAX_BODY_BYTES = 100 * 1024 * 1024;
/** FRONTEND_INSPO_MAX_BODY_BYTES overrides the cap (the tests shrink it). Read per call. */
export const maxBodyBytes = (): number => {
  const v = Number(process.env.FRONTEND_INSPO_MAX_BODY_BYTES);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_MAX_BODY_BYTES;
};

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** HTTPS only. Plain HTTP is allowed solely for loopback, which the tests use. */
export function isSecureUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || (u.protocol === "http:" && LOOPBACK.has(u.hostname));
  } catch {
    return false;
  }
}

/** Read the body as text, aborting once it exceeds maxBodyBytes() (chunked replies send no length). */
async function readCapped(res: Response, url: string): Promise<string> {
  if (!res.body) return await res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBodyBytes()) {
      await reader.cancel();
      throw new FetchError(`Response too large for ${url}`, false);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function rawFetch(url: string, opts: FetchOptions, timeoutMs = 15000): Promise<string> {
  if (!isSecureUrl(url)) throw new FetchError(`Refusing non-HTTPS URL: ${url}`, false);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: requestHeaders(url),
        signal: controller.signal,
        redirect: "follow",
      });
    } catch (e) {
      // DNS/connect/reset/timeout: no HTTP response at all -> transient.
      throw new FetchError(`Network error for ${url}: ${(e as Error).message}`, true);
    }
    // A redirect must not downgrade us to plain HTTP.
    if (res.url && !isSecureUrl(res.url)) {
      throw new FetchError(`Refusing redirect to non-HTTPS URL: ${res.url}`, false);
    }
    if (Number(res.headers.get("content-length")) > maxBodyBytes()) {
      throw new FetchError(`Response too large for ${url}`, false);
    }
    if (!res.ok && !opts.okStatuses?.includes(res.status)) {
      const reset = githubQuotaReset(url, res);
      if (reset) {
        // Transient (packages.ts falls back to jsDelivr), but retrying before the reset is futile.
        throw new FetchError(
          `GitHub API rate limit exhausted for ${url} (resets at ${reset} UTC). Set GITHUB_TOKEN to raise the limit.`,
          true,
          res.status,
          serverWaitMs(res.headers),
          false,
        );
      }
      throw new FetchError(
        `HTTP ${res.status} for ${url}`,
        RETRY_STATUS.has(res.status) && !(res.status === 403 && JSDELIVR_HOSTS.has(hostOf(url))),
        res.status,
        serverWaitMs(res.headers),
      );
    }
    return await readCapped(res, url);
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch text with cache + throttle + retry (3 attempts, exponential backoff).
 *  Concurrent calls for the same URL share one request. */
export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const cached = cacheGet(url);
  if (cached !== undefined) return cached;
  // ponytail: the shared request keys on url only, so a concurrent caller with different
  // `opts` (e.g. okStatuses) reuses the first caller's. Harmless today — only lsgraphics
  // passes okStatuses, and it fetches a unique url. Upgrade path: key on url + opts.
  let pending = inFlight.get(url);
  if (!pending) {
    pending = load(url, opts).finally(() => inFlight.delete(url));
    inFlight.set(url, pending);
  }
  return pending;
}

async function load(url: string, opts: FetchOptions): Promise<string> {
  // second layer: optional disk cache (survives restarts)
  const fromDisk = diskRead(url);
  if (fromDisk) {
    cacheSet(url, fromDisk);
    return fromDisk.body;
  }

  for (let attempt = 0; ; attempt++) {
    await throttle(hostOf(url));
    try {
      const body = await rawFetch(url, opts);
      const entry = { body, expires: Date.now() + cacheTtlMs(url) };
      cacheSet(url, entry);
      diskWrite(url, entry);
      return body;
    } catch (e) {
      if (!(e instanceof FetchError) || !e.retryable || attempt >= MAX_ATTEMPTS - 1) throw e;
      await new Promise((r) => setTimeout(r, retryDelayMs(attempt, e.retryAfterMs)));
    }
  }
}
/** True for failures worth retrying/reporting as "upstream flaky" (vs. not-found/format errors). */
export const isTransient = (e: unknown): boolean => e instanceof FetchError && e.transient;

/** Fetch and parse JSON. */
export async function fetchJson<T = unknown>(url: string): Promise<T> {
  const text = await fetchText(url);
  return JSON.parse(text) as T;
}

/** Decode a base64 string to UTF-8 (used for freefrontend inline code). */
export function decodeBase64(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf-8");
}
