/**
 * Wrap a browser-launching operation in the bounded probe queue: waits for a
 * slot (FIFO), fails fast when the queue is full or the budget is exhausted,
 * and always releases the slot. No-op when the queue is disabled.
 * @module net/queue-guard
 */
import type { ProbeQueueConfig } from "../interfaces/net.js";
import { acquireSlot, releaseSlot } from "./probe-queue.js";

/**
 * Run `fn` holding a probe slot for its whole duration.
 *
 * @param cfg - Resolved queue config, or null to disable (pass-through).
 * @param fn - The browser-launching operation to gate.
 * @throws {QueueFullError} when the waiting queue is full (transient).
 * @throws {BudgetExhaustedError} when the process probe budget is spent.
 */
export async function withQueue<T>(
  cfg: ProbeQueueConfig | null,
  fn: () => Promise<T>,
): Promise<T> {
  if (!cfg) return fn();
  await acquireSlot(cfg);
  try {
    return await fn();
  } finally {
    releaseSlot();
  }
}
