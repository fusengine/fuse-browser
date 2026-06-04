/**
 * Process-global scraping metrics: in-memory counters bumped by the agent and
 * read via the `browser_metrics` tool. Single-process, zero-dependency, no
 * external telemetry. Reset explicitly at the start of a job.
 * @module net/metrics
 */
import { queueStats } from "./probe-queue.js";

let startedAt = Date.now();
let probesOk = 0;
let probesFailed = 0;
let durTotalMs = 0;
let durMinMs = Number.POSITIVE_INFINITY;
let durMaxMs = 0;
let breakerRejects = 0;
let queueRejects = 0;
let budgetRejects = 0;

function recordDuration(ms: number): void {
  durTotalMs += ms;
  if (ms < durMinMs) durMinMs = ms;
  if (ms > durMaxMs) durMaxMs = ms;
}

/** Record a successful browser probe and its wall-clock duration (ms). */
export function recordProbeOk(ms: number): void {
  probesOk += 1;
  recordDuration(ms);
}

/** Record a failed browser probe (threw a non-resilience error) and its duration. */
export function recordProbeFailed(ms: number): void {
  probesFailed += 1;
  recordDuration(ms);
}

/** Record a request rejected fast by an open circuit breaker. */
export function recordBreakerReject(): void {
  breakerRejects += 1;
}

/** Record a request rejected because the probe queue was full. */
export function recordQueueReject(): void {
  queueRejects += 1;
}

/** Record a request rejected because the per-process probe budget was spent. */
export function recordBudgetReject(): void {
  budgetRejects += 1;
}

/** Point-in-time snapshot of all metrics (adds live queue depth + RSS). */
export function metricsSnapshot(): Record<string, unknown> {
  const completed = probesOk + probesFailed;
  return {
    uptimeMs: Date.now() - startedAt,
    probesOk,
    probesFailed,
    avgDurationMs: completed ? Math.round(durTotalMs / completed) : 0,
    minDurationMs: completed ? durMinMs : 0,
    maxDurationMs: durMaxMs,
    breakerRejects,
    queueRejects,
    budgetRejects,
    queue: queueStats(),
    rssBytes: process.memoryUsage().rss,
  };
}

/** Reset all counters (call at job start, or via the tool's `reset` flag). */
export function resetMetrics(): void {
  startedAt = Date.now();
  probesOk = 0;
  probesFailed = 0;
  durTotalMs = 0;
  durMinMs = Number.POSITIVE_INFINITY;
  durMaxMs = 0;
  breakerRejects = 0;
  queueRejects = 0;
  budgetRejects = 0;
}
