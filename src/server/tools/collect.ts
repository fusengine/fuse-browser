/**
 * `browser_collect` tool: exhaust a (virtualized/infinite) list by scrolling its
 * container and merging the rows it mounts along the way — perception beyond the
 * fold. Returns DATA (key/text/url/prices), not actionable refs: virtualization
 * recycles nodes, so to act on a found row use browser_act by `target` text or
 * browser_scroll(selector) then browser_snapshot.
 * @module server/tools/collect
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runPipeline } from "../../extraction/pipeline/run.js";
import type { PipelineSpec } from "../../interfaces/pipeline.js";
import { scrollCollect } from "../../state/scroll-collect.js";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { collectOutputShape, pipelineInputSchema } from "./collect-schema.js";
import { withSession } from "./with-session.js";

/** Register `browser_collect`. */
export function registerCollectTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_collect",
    {
      title: "Collect a scrolling list",
      description:
        "Scroll a (virtualized/infinite) list and return the deduped union of its rows — items beyond the first screen that a single snapshot misses (hotel/flight results, feeds). `item` is the CSS selector for one row; `container` is optional (auto-detected otherwise). Returns data (key/text/url, optional prices), NOT refs — to act on a row, use browser_act by text.",
      inputSchema: {
        sessionId: z.string(),
        item: z.string(),
        container: z.string().optional(),
        maxSteps: z.number().int().optional(),
        extractPrices: z.boolean().optional(),
        pipeline: pipelineInputSchema,
      },
      outputSchema: collectOutputShape,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const result = await scrollCollect(s.page, {
          item: String(a.item),
          container: typeof a.container === "string" ? a.container : undefined,
          maxSteps: typeof a.maxSteps === "number" ? a.maxSteps : undefined,
          extractPrices: a.extractPrices === true,
        });
        if (a.pipeline) {
          const rows = result.items as unknown as Record<string, unknown>[];
          const pr = runPipeline(rows, a.pipeline as PipelineSpec);
          return jsonResult({
            count: pr.rows.length,
            steps: result.steps,
            reachedEnd: result.reachedEnd,
            invalidCount: pr.invalid.length,
            items: pr.rows,
            csv: pr.csv,
          });
        }
        return jsonResult({
          count: result.items.length,
          steps: result.steps,
          reachedEnd: result.reachedEnd,
          items: result.items,
        });
      });
    },
  );
}
