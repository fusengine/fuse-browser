/**
 * Wrap a navigation in the per-host circuit breaker: fail fast when the
 * origin's circuit is open, otherwise run and report the outcome (a thrown
 * error trips it; a returned response — including 4xx/5xx/429, which are not
 * host failures — counts as success). No-op when the breaker is disabled.
 * @module net/breaker-guard
 */
import type { CircuitBreakerConfig } from "../interfaces/net.js";
import { CircuitOpenError } from "../lib/errors.js";
import { breakerCheck, breakerReport, originOf } from "./breaker.js";

/**
 * Run `fn` under the breaker for `url`'s origin.
 *
 * @param url - The target URL (origin is derived from it).
 * @param cfg - Resolved breaker config, or null to disable (pass-through).
 * @param fn - The navigation to guard.
 * @throws {CircuitOpenError} when the origin's circuit is open.
 */
export async function withBreaker<T>(
  url: string,
  cfg: CircuitBreakerConfig | null,
  fn: () => Promise<T>,
): Promise<T> {
  const origin = cfg ? originOf(url) : null;
  if (!cfg || !origin) return fn();
  const gate = breakerCheck(origin, Date.now());
  if (gate.open) throw new CircuitOpenError(origin, gate.retryInMs ?? 0);
  try {
    const result = await fn();
    breakerReport(origin, true, cfg, Date.now());
    return result;
  } catch (err) {
    breakerReport(origin, false, cfg, Date.now());
    throw err;
  }
}
