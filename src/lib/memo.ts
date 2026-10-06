// Process-level memo for parsed upstream data (registry indexes, repo trees, manifests).
// Concurrent callers share one in-flight load, failures are not cached, results expire after
// `ttlMs` so a long-running session sees new upstream items, and if a refresh fails the last
// good value is served instead of an error.

export function memoAsync<T>(load: () => Promise<T>, ttlMs: number): () => Promise<T> {
  let value: { data: T; expires: number } | null = null;
  let pending: Promise<T> | null = null;
  return () => {
    if (value && value.expires > Date.now()) return Promise.resolve(value.data);
    if (!pending) {
      pending = load()
        .then(
          (data) => {
            value = { data, expires: Date.now() + ttlMs };
            return data;
          },
          (e: unknown) => {
            if (value) return value.data; // stale beats failing
            throw e;
          },
        )
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  };
}
