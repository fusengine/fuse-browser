/**
 * Unit tests for the process-global scraping metrics counters.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import {
  metricsSnapshot,
  recordBreakerReject,
  recordBudgetReject,
  recordProbeFailed,
  recordProbeOk,
  recordQueueReject,
  resetMetrics,
} from "../../src/net/metrics.js";

beforeEach(() => resetMetrics());

describe("metrics", () => {
  test("counts probes and computes duration stats", () => {
    recordProbeOk(100);
    recordProbeOk(300);
    recordProbeFailed(200);
    const s = metricsSnapshot();
    expect(s.probesOk).toBe(2);
    expect(s.probesFailed).toBe(1);
    expect(s.avgDurationMs).toBe(200); // (100+300+200)/3
    expect(s.minDurationMs).toBe(100);
    expect(s.maxDurationMs).toBe(300);
  });

  test("zero completed probes reports zeroed durations (no Infinity leak)", () => {
    const s = metricsSnapshot();
    expect(s.avgDurationMs).toBe(0);
    expect(s.minDurationMs).toBe(0);
    expect(s.maxDurationMs).toBe(0);
  });

  test("tracks reject counters independently of probe counts", () => {
    recordBreakerReject();
    recordQueueReject();
    recordQueueReject();
    recordBudgetReject();
    const s = metricsSnapshot();
    expect(s.breakerRejects).toBe(1);
    expect(s.queueRejects).toBe(2);
    expect(s.budgetRejects).toBe(1);
    expect(s.probesFailed).toBe(0); // rejects are not probe failures
  });

  test("exposes live queue depth, rss and uptime", () => {
    const s = metricsSnapshot();
    // `admitted` is a lifetime counter shared across test files; only the
    // in-flight gauges (running/waiting) are guaranteed zero when idle.
    const q = s.queue as { running: number; admitted: number; waiting: number };
    expect(q.running).toBe(0);
    expect(q.waiting).toBe(0);
    expect(typeof q.admitted).toBe("number");
    expect(typeof s.rssBytes).toBe("number");
    expect(typeof s.uptimeMs).toBe("number");
  });

  test("reset zeroes every counter", () => {
    recordProbeOk(50);
    recordBreakerReject();
    resetMetrics();
    const s = metricsSnapshot();
    expect(s.probesOk).toBe(0);
    expect(s.breakerRejects).toBe(0);
    expect(s.maxDurationMs).toBe(0);
  });
});
