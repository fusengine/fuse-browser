/**
 * `browser_metrics` tool: read the process-global scraping metrics snapshot
 * (probes ok/failed, durations, breaker/queue/budget rejects, live queue depth,
 * RSS, uptime). Pass `reset:true` to zero the counters after reading.
 * @module server/tools/metrics
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { metricsSnapshot, resetMetrics } from "../../net/metrics.js";
import { jsonResult } from "../result.js";

/** Shape of the `browser_metrics` success payload (mirrors `metricsSnapshot()`). */
export const METRICS_OUTPUT_SHAPE = {
  uptimeMs: z.number(),
  probesOk: z.number(),
  probesFailed: z.number(),
  avgDurationMs: z.number(),
  minDurationMs: z.number(),
  maxDurationMs: z.number(),
  breakerRejects: z.number(),
  queueRejects: z.number(),
  budgetRejects: z.number(),
  queue: z.object({ running: z.number(), admitted: z.number(), waiting: z.number() }),
  rssBytes: z.number(),
};

/** Register `browser_metrics`. */
export function registerMetricsTool(server: McpServer): void {
  server.registerTool(
    "browser_metrics",
    {
      title: "Scraping metrics",
      description:
        "Process-global scraping metrics: probes ok/failed, avg/min/max duration, circuit-breaker/queue/budget rejects, live queue depth, RSS, uptime. Pass reset:true to zero the counters after reading (e.g. at the start of a new job).",
      inputSchema: { reset: z.boolean().optional() },
      outputSchema: METRICS_OUTPUT_SHAPE,
    },
    async (args) => {
      const snapshot = metricsSnapshot();
      if ((args as { reset?: boolean }).reset === true) resetMetrics();
      return jsonResult(snapshot);
    },
  );
}
