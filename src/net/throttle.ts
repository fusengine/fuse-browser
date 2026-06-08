/**
 * Per-host request throttle (fixed minimum gap between navigations).
 * @module net/throttle
 */
import { sleep } from "../lib/retry.js";

const lastHit = new Map<string, number>();

/**
 * Wait so consecutive hits on the same host stay at least `minGapMs` apart.
 * The next slot is **reserved synchronously** (before the await), so N concurrent
 * callers on the same host are spaced by `minGapMs` instead of bursting together
 * — correct under bounded-concurrency crawls, identical for sequential callers.
 */
export async function throttleHost(url: string, minGapMs: number): Promise<void> {
  if (minGapMs <= 0) return;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return;
  }
  const now = Date.now();
  const earliest = Math.max(now, (lastHit.get(host) ?? 0) + minGapMs);
  lastHit.set(host, earliest); // reserve before awaiting — no thundering herd
  if (earliest > now) await sleep(earliest - now);
}
