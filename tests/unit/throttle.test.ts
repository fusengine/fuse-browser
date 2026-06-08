import { describe, expect, test } from "bun:test";
import { jitterMs } from "../../src/lib/retry.js";
import { throttleHost } from "../../src/net/throttle.js";

describe("jitterMs", () => {
  test("stays within [base/2, base*1.5] and varies", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const v = jitterMs(1000);
      expect(v).toBeGreaterThanOrEqual(500);
      expect(v).toBeLessThanOrEqual(1500);
      seen.add(v);
    }
    expect(seen.size).toBeGreaterThan(5); // not a constant — actually jitters
  });

  test("0 or negative base yields 0 (disabled)", () => {
    expect(jitterMs(0)).toBe(0);
    expect(jitterMs(-5)).toBe(0);
  });
});

describe("throttleHost", () => {
  test("spaces concurrent same-host calls by minGapMs (reserve-ahead, no burst)", async () => {
    const url = "https://throttle-a.example/";
    const start = Date.now();
    // 3 concurrent calls reserve slots at 0, 50, 100ms → last resolves ~100ms in.
    await Promise.all([throttleHost(url, 50), throttleHost(url, 50), throttleHost(url, 50)]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(90);
  });

  test("minGapMs <= 0 is a no-op", async () => {
    const start = Date.now();
    await throttleHost("https://throttle-b.example/", 0);
    expect(Date.now() - start).toBeLessThan(20);
  });

  test("different hosts are independent (no cross-host wait)", async () => {
    const start = Date.now();
    await Promise.all([throttleHost("https://throttle-c.example/", 100), throttleHost("https://throttle-d.example/", 100)]);
    expect(Date.now() - start).toBeLessThan(60);
  });

  test("invalid URL is a no-op", async () => {
    const start = Date.now();
    await throttleHost("not a url", 100);
    expect(Date.now() - start).toBeLessThan(20);
  });
});
