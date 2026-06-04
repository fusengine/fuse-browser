/**
 * Unit tests for the per-host circuit breaker state machine. Time is injected
 * (`now` arg), so no fake timers are needed — the assertions are deterministic.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import type { CircuitBreakerConfig } from "../../src/interfaces/net.js";
import { breakerCheck, breakerReport, originOf, resetBreaker } from "../../src/net/breaker.js";

const CFG: CircuitBreakerConfig = { threshold: 3, cooldownMs: 1_000, capMs: 8_000 };
const H = "https://a.example";

beforeEach(() => resetBreaker());

describe("originOf", () => {
  test("normalizes to scheme+host+port and rejects garbage", () => {
    expect(originOf("https://x.example/a/b?q=1")).toBe("https://x.example");
    expect(originOf("not a url")).toBeNull();
  });
});

describe("circuit breaker", () => {
  test("stays closed below the threshold, opens at it", () => {
    expect(breakerCheck(H, 0).open).toBe(false);
    breakerReport(H, false, CFG, 0);
    breakerReport(H, false, CFG, 1);
    expect(breakerCheck(H, 2).open).toBe(false); // 2 < threshold 3
    breakerReport(H, false, CFG, 2); // 3rd consecutive → open
    const gate = breakerCheck(H, 3);
    expect(gate.open).toBe(true);
    expect(gate.retryInMs).toBe(999); // openUntil = 2+1000, now 3
  });

  test("allows exactly one half-open trial after cooldown", () => {
    for (let i = 0; i < 3; i++) breakerReport(H, false, CFG, i); // open, openUntil = 1002
    expect(breakerCheck(H, 502).open).toBe(true); // still cooling
    expect(breakerCheck(H, 1_003).open).toBe(false); // this caller gets the single probe
    expect(breakerCheck(H, 1_004).open).toBe(true); // concurrent caller fails fast
  });

  test("closes and resets on a successful trial", () => {
    for (let i = 0; i < 3; i++) breakerReport(H, false, CFG, i);
    breakerCheck(H, 1_003); // claim half-open probe
    breakerReport(H, true, CFG, 1_004); // probe succeeds → close
    expect(breakerCheck(H, 1_005).open).toBe(false);
  });

  test("doubles the cooldown on repeated reopen, capped at capMs", () => {
    for (let i = 0; i < 3; i++) breakerReport(H, false, CFG, i); // open #1: cooldown 1000
    breakerCheck(H, 1_003); // half-open
    breakerReport(H, false, CFG, 1_003); // reopen: cooldown 2000
    expect(breakerCheck(H, 1_003).retryInMs).toBe(2_000);
    breakerCheck(H, 3_004); // half-open (openUntil 3003)
    breakerReport(H, false, CFG, 3_004); // reopen: cooldown 4000
    expect(breakerCheck(H, 3_004).retryInMs).toBe(4_000);
    breakerCheck(H, 7_005); // half-open
    breakerReport(H, false, CFG, 7_005); // reopen: 8000, capped at capMs
    expect(breakerCheck(H, 7_005).retryInMs).toBe(8_000);
  });

  test("honors a Retry-After floor on the cooldown", () => {
    for (let i = 0; i < 3; i++) breakerReport(H, false, CFG, i);
    breakerReport(H, false, CFG, 2, 5_000); // Retry-After 5s > backoff
    expect(breakerCheck(H, 2).retryInMs).toBe(5_000);
  });

  test("isolates state per origin", () => {
    for (let i = 0; i < 3; i++) breakerReport(H, false, CFG, i);
    expect(breakerCheck(H, 3).open).toBe(true);
    expect(breakerCheck("https://b.example", 3).open).toBe(false);
  });
});
