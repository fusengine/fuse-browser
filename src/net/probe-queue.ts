/**
 * Bounded FIFO probe queue + process-lifetime budget for mass scraping.
 * At most `concurrency` browser probes run at once; excess callers wait in a
 * bounded FIFO queue (`maxQueue`) and are rejected immediately when it is full
 * (QueueFullError, transient). An optional admission budget (`maxProbes`)
 * rejects further probes for the process lifetime (BudgetExhaustedError,
 * terminal). Single-process, in-memory, zero-dependency.
 * @module net/probe-queue
 */
import type { ProbeQueueConfig } from "../interfaces/net.js";
import { BudgetExhaustedError, QueueFullError } from "../lib/errors.js";

let running = 0;
let admitted = 0;
const waiters: Array<() => void> = [];

/**
 * Acquire a probe slot. Resolves when the slot is granted; rejects fast with
 * {@link QueueFullError} (retry later) or {@link BudgetExhaustedError}.
 * Pair every resolved acquire with {@link releaseSlot} in a `finally`.
 *
 * @param cfg - Resolved queue config (concurrency, maxQueue, maxProbes).
 */
export function acquireSlot(cfg: ProbeQueueConfig): Promise<void> {
  // Admission-based lifetime budget: counted on acceptance, never decremented.
  if (cfg.maxProbes > 0 && admitted >= cfg.maxProbes) {
    return Promise.reject(new BudgetExhaustedError(cfg.maxProbes));
  }
  if (running < cfg.concurrency) {
    running += 1;
    admitted += 1;
    return Promise.resolve();
  }
  if (waiters.length >= cfg.maxQueue) {
    return Promise.reject(new QueueFullError(cfg.maxQueue));
  }
  admitted += 1;
  return new Promise<void>((resolve) => {
    waiters.push(resolve);
  });
}

/**
 * Release a held slot: hands it to the oldest waiter (FIFO) or frees it.
 * Must be called exactly once per resolved {@link acquireSlot}.
 */
export function releaseSlot(): void {
  const next = waiters.shift();
  if (next) next(); // slot transferred — `running` unchanged
  else running = Math.max(0, running - 1);
}

/** Reset queue and budget state (tests only). */
export function resetQueue(): void {
  running = 0;
  admitted = 0;
  waiters.length = 0;
}
