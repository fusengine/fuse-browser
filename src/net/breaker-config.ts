/**
 * Resolve user circuit-breaker overrides into an effective config (or null
 * when the breaker is disabled). Defaults: 5 consecutive failures, 30s first
 * cooldown, 10min cap on the exponential reopen backoff.
 * @module net/breaker-config
 */
import type { CircuitBreakerConfig, CircuitBreakerOptions } from "../interfaces/net.js";

/**
 * Materialize the per-host breaker config.
 *
 * @param opts - User overrides; when absent the breaker stays disabled.
 * @returns The resolved config, or null to disable the breaker.
 */
export function resolveBreaker(opts?: CircuitBreakerOptions): CircuitBreakerConfig | null {
  if (!opts) return null;
  return {
    threshold: opts.threshold ?? 5,
    cooldownMs: opts.cooldownMs ?? 30_000,
    capMs: opts.capMs ?? 600_000,
  };
}
