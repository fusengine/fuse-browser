/**
 * Per-host circuit breaker for mass scraping. After N consecutive failures on
 * an origin the circuit opens and further attempts fail fast for a cooldown
 * (exponential on repeated reopens) instead of burning browser time. After the
 * cooldown a single half-open trial is allowed; success closes, failure
 * reopens with a longer cooldown. Single-process, in-memory, LRU-bounded.
 * @module net/breaker
 */
import type { CircuitBreakerConfig } from "../interfaces/net.js";

/** Per-origin breaker state. */
interface HostState {
  fails: number;
  openUntil: number;
  opens: number;
  probing: boolean;
}

const MAX_HOSTS = 2000;
const hosts = new Map<string, HostState>();

/** Normalize a URL to its origin key, or null if unparsable. */
export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Get (refreshing LRU order) or create the state for an origin. */
function touch(origin: string): HostState {
  let s = hosts.get(origin);
  if (s) hosts.delete(origin);
  else s = { fails: 0, openUntil: 0, opens: 0, probing: false };
  hosts.set(origin, s);
  if (hosts.size > MAX_HOSTS) {
    const oldest = hosts.keys().next().value;
    if (oldest !== undefined) hosts.delete(oldest);
  }
  return s;
}

/**
 * Decide whether a request to `origin` may proceed. Returns `{ open: true,
 * retryInMs }` to fail fast, or `{ open: false }` to allow (claiming the single
 * half-open trial when in cooldown). Call {@link breakerReport} with the outcome.
 *
 * @param origin - The origin key (from {@link originOf}).
 * @param now - Current epoch ms (injected for determinism).
 */
export function breakerCheck(origin: string, now: number): { open: boolean; retryInMs?: number } {
  const s = touch(origin);
  if (s.openUntil === 0) return { open: false };
  if (now < s.openUntil) return { open: true, retryInMs: s.openUntil - now };
  // Cooldown elapsed → half-open: allow exactly one trial, others fail fast.
  if (s.probing) return { open: true, retryInMs: 0 };
  s.probing = true;
  return { open: false };
}

/**
 * Record the outcome of an attempt and update the breaker state.
 *
 * @param origin - The origin key.
 * @param ok - Whether the attempt succeeded (no trip-worthy failure).
 * @param cfg - Resolved breaker config (threshold, cooldown, cap).
 * @param now - Current epoch ms.
 * @param retryAfterMs - Optional server `Retry-After`; floors the cooldown.
 */
export function breakerReport(
  origin: string,
  ok: boolean,
  cfg: CircuitBreakerConfig,
  now: number,
  retryAfterMs?: number,
): void {
  const s = touch(origin);
  if (ok) {
    s.fails = 0;
    s.openUntil = 0;
    s.opens = 0;
    s.probing = false;
    return;
  }
  const wasProbing = s.probing;
  s.probing = false;
  if (!wasProbing) {
    s.fails += 1;
    if (s.fails < cfg.threshold) return;
  }
  const backoff = Math.min(cfg.capMs, cfg.cooldownMs * 2 ** s.opens);
  s.openUntil = now + Math.max(backoff, retryAfterMs ?? 0);
  s.opens += 1;
}

/** Reset all breaker state (tests only). */
export function resetBreaker(): void {
  hosts.clear();
}
