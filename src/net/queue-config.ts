/**
 * Resolve user probe-queue overrides into an effective config (or null when
 * disabled). Defaults: 2 concurrent probes, 8 queued waiters, no budget cap.
 * @module net/queue-config
 */
import type { ProbeQueueConfig, ProbeQueueOptions } from "../interfaces/net.js";

/**
 * Materialize the probe queue config.
 *
 * @param opts - User overrides; when absent the queue stays disabled.
 * @returns The resolved config, or null to disable the queue.
 */
export function resolveProbeQueue(opts?: ProbeQueueOptions): ProbeQueueConfig | null {
  if (!opts) return null;
  return {
    concurrency: opts.concurrency ?? 2,
    maxQueue: opts.maxQueue ?? 8,
    maxProbes: opts.maxProbes ?? 0,
  };
}
