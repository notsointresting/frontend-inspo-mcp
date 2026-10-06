// Polite HTTP helper: per-host rate limiting + in-memory TTL cache.
// Optional disk cache: set FRONTEND_INSPO_CACHE_DIR to persist responses across
// restarts (memory stays the fast first layer). ponytail: disk cache is opt-in;
// default behavior is unchanged (memory-only).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const USER_AGENT = "frontend-inspo-mcp/0.1 (+https://github.com/) local discovery agent";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_MIN_GAP_MS = 400; // min delay between requests to the same host
/** Politeness gap; FRONTEND_INSPO_MIN_GAP_MS overrides it (the unit tests set 0). Read per call. */
const minGapMs = (): number => {
  const v = Number(process.env.FRONTEND_INSPO_MIN_GAP_MS);
  return Number.isFinite(v) && v >= 0 && process.env.FRONTEND_INSPO_MIN_GAP_MS
    ? v
    : DEFAULT_MIN_GAP_MS;
};

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
  const key = createHash("sha256").update(url).digest("hex");
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
  const wait = Math.max(0, minGapMs() - (Date.now() - last));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
  // release the slot shortly after so the next queued request can proceed
  setTimeout(release, 0);
}

/** HTTP/network failure. `transient` = worth retrying (rate limit, gateway, network). */
export class FetchError extends Error {
  constructor(
    message: string,
    readonly transient: boolean,
    readonly status?: number,
    readonly retryAfterMs?: number,
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

function requestHeaders(url: string): Record<string, string> {
  const headers: Record<string, string> = { "user-agent": USER_AGENT, accept: "*/*" };
  // Token goes to the GitHub API host only, never to third-party sites.
  if (hostOf(url) === "api.github.com") {
    headers.accept = "application/vnd.github+json";
    if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function rawFetch(url: string, opts: FetchOptions, timeoutMs = 15000): Promise<string> {
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
    if (!res.ok && !opts.okStatuses?.includes(res.status)) {
      throw new FetchError(
        `HTTP ${res.status} for ${url}`,
        RETRY_STATUS.has(res.status),
        res.status,
        serverWaitMs(res.headers),
      );
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch text with cache + throttle + retry (3 attempts, exponential backoff). */
export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.body;

  // second layer: optional disk cache (survives restarts)
  const fromDisk = diskRead(url);
  if (fromDisk !== null) {
    cache.set(url, { body: fromDisk, expires: Date.now() + CACHE_TTL_MS });
    return fromDisk;
  }

  for (let attempt = 0; ; attempt++) {
    await throttle(hostOf(url));
    try {
      const body = await rawFetch(url, opts);
      const entry = { body, expires: Date.now() + CACHE_TTL_MS };
      cache.set(url, entry);
      diskWrite(url, entry);
      return body;
    } catch (e) {
      if (!(e instanceof FetchError) || !e.transient || attempt >= MAX_ATTEMPTS - 1) throw e;
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
