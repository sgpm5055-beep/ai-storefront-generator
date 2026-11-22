/**
 * Apify key rotation.
 *
 * Apify's Free plan allows $5 of usage a month and then returns 403
 * `platform-feature-disabled` on every call. That happened mid-testing:
 * the handle path went down completely while the rest of the product kept
 * working, which is the worst shape of outage — it looks like our bug.
 *
 * So we hold several keys and move to the next one BEFORE the current one
 * runs out, not after.
 *
 * Two mechanisms, because neither is sufficient alone:
 *
 *  1. PROACTIVE. Before a scrape we check the active key's remaining
 *     headroom and retire it once it drops below RESERVE_USD. A scrape
 *     costs a few cents, so leaving a reserve means the key is swapped
 *     while it can still serve the request in flight.
 *
 *  2. REACTIVE. Apify's usage figure lags real spend, so a key can 403
 *     while still reporting headroom. `reportExhausted()` retires it
 *     immediately and the caller retries on the next key.
 *
 * The quota check is cached for CHECK_TTL_MS so a build does not spend a
 * round trip per actor call, and a failed check never blocks a scrape:
 * if we cannot read the quota we use the key and let the 403 path handle
 * it.
 */

/** Keep this much headroom unused, so a swap happens before a failure. */
const RESERVE_USD = 0.75;

/** How long a quota reading stays good. */
const CHECK_TTL_MS = 60_000;

interface KeyState {
  token: string;
  /** Remaining USD at the last check, or null if never checked. */
  remaining: number | null;
  checkedAt: number;
  /** Set when Apify told us this key is finished. Never used again. */
  exhausted: boolean;
}

let keys: KeyState[] | null = null;

/**
 * APIFY_TOKENS takes a comma-separated list; APIFY_TOKEN stays supported
 * so a single-key setup and the existing .env keep working.
 */
function load(): KeyState[] {
  if (keys) return keys;
  const raw = process.env.APIFY_TOKENS ?? process.env.APIFY_TOKEN ?? '';
  const parsed = raw.split(',').map((t) => t.trim()).filter(Boolean);
  keys = parsed.map((token) => ({
    token, remaining: null, checkedAt: 0, exhausted: false,
  }));
  return keys;
}

/** Test seam: reset module state between cases. */
export function _resetForTest(tokens?: string[]): void {
  keys = tokens
    ? tokens.map((token) => ({ token, remaining: null, checkedAt: 0, exhausted: false }))
    : null;
}

/** Test seam: inspect state without exporting the array itself. */
export function _stateForTest(): Array<{ token: string; remaining: number | null; exhausted: boolean }> {
  return load().map((k) => ({ token: k.token, remaining: k.remaining, exhausted: k.exhausted }));
}

/**
 * Is this key usable? A key with unknown headroom counts as usable: we
 * would rather attempt a scrape and handle a 403 than refuse to try.
 */
export function usable(k: { remaining: number | null; exhausted: boolean }): boolean {
  if (k.exhausted) return false;
  return k.remaining === null || k.remaining > RESERVE_USD;
}

async function readRemaining(token: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.apify.com/v2/users/me/limits?token=${token}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    const body = await res.json() as {
      data?: { current?: { monthlyUsageUsd?: number }; limits?: { maxMonthlyUsageUsd?: number } };
    };
    const used = body.data?.current?.monthlyUsageUsd;
    const max = body.data?.limits?.maxMonthlyUsageUsd;
    if (typeof used !== 'number' || typeof max !== 'number') return null;
    return max - used;
  } catch {
    // A quota check must never be the reason a build fails.
    return null;
  }
}

/**
 * The token to scrape with, or null when every key is spent.
 *
 * Checks the active key's headroom at most once per CHECK_TTL_MS and
 * moves on while it can still serve a request.
 */
export async function activeToken(): Promise<string | null> {
  const all = load();
  if (all.length === 0) return null;

  for (const k of all) {
    if (k.exhausted) continue;

    const stale = Date.now() - k.checkedAt > CHECK_TTL_MS;
    if (stale) {
      const remaining = await readRemaining(k.token);
      k.remaining = remaining;
      k.checkedAt = Date.now();
      // A key reporting no headroom is retired now rather than on its
      // next 403, so the swap is invisible to the creator.
      if (remaining !== null && remaining <= RESERVE_USD) {
        k.exhausted = true;
        continue;
      }
    }

    if (usable(k)) return k.token;
  }
  return null;
}

/**
 * Apify refused this key. Retire it so the next call moves on.
 * Returns true if another key is available to retry with.
 */
export function reportExhausted(token: string): boolean {
  const all = load();
  const k = all.find((x) => x.token === token);
  if (k) { k.exhausted = true; k.remaining = 0; }
  return all.some((x) => !x.exhausted);
}

/** How many keys still have room. For diagnostics. */
export function remainingKeyCount(): number {
  return load().filter((k) => !k.exhausted).length;
}
