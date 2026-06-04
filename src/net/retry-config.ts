/**
 * Resolve user retry overrides into an effective navigation retry config.
 * Defaults: 3 attempts, 300ms base, 10s cap, no per-host throttle.
 * @module net/retry-config
 */
import type { RetryConfig } from "../interfaces/net.js";

/**
 * Materialize the navigation retry config.
 *
 * @param opts - Partial user overrides; unset keys keep their defaults.
 */
export function resolveRetry(opts?: Partial<RetryConfig>): RetryConfig {
  return {
    maxAttempts: opts?.maxAttempts ?? 3,
    baseMs: opts?.baseMs ?? 300,
    capMs: opts?.capMs ?? 10_000,
    throttleMs: opts?.throttleMs ?? 0,
  };
}
