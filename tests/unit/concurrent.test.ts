import { describe, expect, test } from "bun:test";
import { mapConcurrent } from "../../src/net/concurrent.js";

describe("mapConcurrent", () => {
  test("preserves input order regardless of completion order", async () => {
    const out = await mapConcurrent([30, 10, 20], 3, async (ms) => {
      await new Promise((r) => setTimeout(r, ms));
      return ms;
    });
    expect(out.map((o) => (o.ok ? o.value : null))).toEqual([30, 10, 20]);
  });

  test("isolates per-item errors (one failure does not abort the batch)", async () => {
    const out = await mapConcurrent([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n * 10;
    });
    expect(out[0]).toEqual({ ok: true, value: 10 });
    expect(out[1]?.ok).toBe(false);
    expect(out[2]).toEqual({ ok: true, value: 30 });
  });

  test("never exceeds the concurrency cap", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapConcurrent([1, 2, 3, 4, 5, 6], 2, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return 0;
    });
    expect(peak).toBeLessThanOrEqual(2);
  });

  test("empty input yields empty output", async () => {
    expect(await mapConcurrent([], 4, async (x) => x)).toEqual([]);
  });
});
