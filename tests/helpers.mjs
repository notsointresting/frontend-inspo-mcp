// Shared test helper: replace global fetch with an offline fake.
// The per-host politeness delay (400 ms) is pointless against a fake, so switch it off.
process.env.FRONTEND_INSPO_MIN_GAP_MS = "0";

// handler(url) -> { status?, body?, headers? }. Returns the list of requested URLs.
export function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    const r = await handler(u);
    return new Response(r.body ?? "", { status: r.status ?? 200, headers: r.headers });
  };
  return calls;
}
