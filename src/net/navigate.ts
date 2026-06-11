/**
 * Navigation with retry/backoff that honors HTTP 429/5xx and `Retry-After`.
 * `page.goto` does not throw on 4xx/5xx, so the status is inspected explicitly.
 * @module net/navigate
 */
import type { Page, Response } from "playwright";
import type { RetryConfig } from "../interfaces/net.js";
import { withRetry } from "../lib/retry.js";

/** Default navigation resilience (3 attempts, no throttle). */
export const DEFAULT_RETRY: RetryConfig = { maxAttempts: 3, baseMs: 300, capMs: 10_000, throttleMs: 0 };

const RETRY_STATUS = new Set([429, 502, 503, 504]);
const RETRYABLE_ERROR =
  /timeout|ERR_CONNECTION|ERR_NETWORK_CHANGED|ERR_INTERNET_DISCONNECTED|ERR_ABORTED/i;

/** Parse an RFC 7231 `Retry-After` value (delta-seconds or HTTP-date) to ms. */
export function parseRetryAfterMs(value: string | undefined, nowMs: number): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Math.min(300_000, Number(value) * 1000);
  const delta = Date.parse(value) - nowMs;
  return delta > 0 ? Math.min(300_000, delta) : null;
}

/** Options forwarded to `page.goto`. */
export interface GotoOptions {
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  timeout?: number;
}

/** Default goto options shared by every navigation call site. */
export const DEFAULT_GOTO: GotoOptions = { waitUntil: "domcontentloaded", timeout: 30_000 };

/** Navigate to `url`, retrying transient failures and rate-limit responses. */
export function gotoWithRetry(
  page: Page,
  url: string,
  opts: GotoOptions,
  retry: RetryConfig = DEFAULT_RETRY,
): Promise<Response | null> {
  return withRetry<Response | null>(() => page.goto(url, opts), {
    maxAttempts: retry.maxAttempts,
    baseMs: retry.baseMs,
    capMs: retry.capMs,
    classify: ({ value, error }) => {
      if (error) return { retry: RETRYABLE_ERROR.test(String((error as Error)?.message ?? error)) };
      const status = value?.status() ?? 0;
      if (!RETRY_STATUS.has(status)) return { retry: false };
      const after = parseRetryAfterMs(value?.headers()["retry-after"], Date.now());
      return { retry: true, delayMs: after ?? undefined };
    },
  });
}
