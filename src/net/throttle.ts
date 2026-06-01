/**
 * Per-host request throttle (fixed minimum gap between navigations).
 * @module net/throttle
 */
import { sleep } from "../lib/retry.js";

const lastHit = new Map<string, number>();

/** Wait so consecutive hits on the same host stay at least `minGapMs` apart. */
export async function throttleHost(url: string, minGapMs: number): Promise<void> {
  if (minGapMs <= 0) return;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return;
  }
  const wait = minGapMs - (Date.now() - (lastHit.get(host) ?? 0));
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}
