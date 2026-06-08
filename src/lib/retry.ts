/**
 * Generic async retry with full-jitter exponential backoff.
 * @module lib/retry
 */
import { randInt } from "./text.js";

/** Pause for `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Full-jitter exponential backoff delay (ms) for a zero-based attempt index. */
export function backoffDelay(attempt: number, baseMs: number, capMs: number): number {
  const expo = Math.min(capMs, baseMs * 2 ** attempt);
  return randInt(0, expo);
}

/**
 * A jittered delay around `baseMs` — uniform in `[baseMs/2, baseMs*1.5]` (mean
 * `baseMs`). A fixed gap is a bot fingerprint; this makes pacing look human.
 * Returns 0 when `baseMs <= 0`.
 */
export function jitterMs(baseMs: number): number {
  if (baseMs <= 0) return 0;
  return randInt(Math.floor(baseMs / 2), Math.ceil(baseMs * 1.5));
}

/** Outcome of one attempt passed to the classifier. */
export interface RetryOutcome<T> {
  value?: T;
  error?: unknown;
}

/** Classifier decision: whether to retry and an optional fixed delay override. */
export interface RetryDecision {
  retry: boolean;
  delayMs?: number;
}

/** Options for {@link withRetry}. */
export interface RetryOpts<T> {
  maxAttempts: number;
  baseMs: number;
  capMs: number;
  classify: (outcome: RetryOutcome<T>, attempt: number) => RetryDecision;
}

/**
 * Run `fn` up to `maxAttempts` times. The classifier inspects each attempt's
 * value or thrown error and decides whether to retry; backoff is full-jitter
 * unless the classifier supplies a `delayMs` (e.g. from a `Retry-After` header).
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOpts<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < opts.maxAttempts; attempt += 1) {
    const last = attempt === opts.maxAttempts - 1;
    try {
      const value = await fn(attempt);
      const decision = opts.classify({ value }, attempt);
      if (!decision.retry || last) return value;
      await sleep(decision.delayMs ?? backoffDelay(attempt, opts.baseMs, opts.capMs));
    } catch (error) {
      lastError = error;
      const decision = opts.classify({ error }, attempt);
      if (!decision.retry || last) throw error;
      await sleep(decision.delayMs ?? backoffDelay(attempt, opts.baseMs, opts.capMs));
    }
  }
  throw lastError;
}
