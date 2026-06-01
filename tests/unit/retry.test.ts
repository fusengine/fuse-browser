import { describe, expect, test } from "bun:test";
import { backoffDelay, withRetry } from "../../src/lib/retry.js";
import { parseRetryAfterMs } from "../../src/net/navigate.js";

describe("backoffDelay", () => {
  test("stays within [0, min(cap, base * 2^attempt)]", () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const expo = Math.min(5_000, 100 * 2 ** attempt);
      const d = backoffDelay(attempt, 100, 5_000);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(expo);
    }
  });
});

describe("parseRetryAfterMs", () => {
  test("delta-seconds -> ms, capped at 5 min", () => {
    expect(parseRetryAfterMs("2", 0)).toBe(2_000);
    expect(parseRetryAfterMs("99999", 0)).toBe(300_000);
  });
  test("HTTP-date -> remaining ms", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(parseRetryAfterMs("Thu, 01 Jan 2026 00:00:10 GMT", now)).toBe(10_000);
  });
  test("missing or past values -> null", () => {
    expect(parseRetryAfterMs(undefined, 0)).toBeNull();
    const now = Date.parse("2026-01-01T00:00:10Z");
    expect(parseRetryAfterMs("Thu, 01 Jan 2026 00:00:00 GMT", now)).toBeNull();
  });
});

describe("withRetry", () => {
  const opts = (classify: Parameters<typeof withRetry>[1]["classify"]) => ({
    maxAttempts: 3,
    baseMs: 1,
    capMs: 2,
    classify,
  });

  test("returns first value when not retryable", async () => {
    let calls = 0;
    const value = await withRetry(async () => {
      calls += 1;
      return "ok";
    }, opts(() => ({ retry: false })));
    expect(value).toBe("ok");
    expect(calls).toBe(1);
  });

  test("retries on value then succeeds", async () => {
    let calls = 0;
    const value = await withRetry(async () => {
      calls += 1;
      return calls;
    }, opts(({ value }) => ({ retry: value === 1, delayMs: 0 })));
    expect(value).toBe(2);
    expect(calls).toBe(2);
  });

  test("rethrows the last error after exhausting attempts", async () => {
    let calls = 0;
    const run = withRetry(async () => {
      calls += 1;
      throw new Error("boom");
    }, opts(() => ({ retry: true, delayMs: 0 })));
    await expect(run).rejects.toThrow("boom");
    expect(calls).toBe(3);
  });
});
