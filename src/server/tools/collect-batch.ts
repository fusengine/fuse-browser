/**
 * `browser_collect_batch` tool: exhaust the infinite-scroll/paginated list of
 * many listing URLs in parallel (one real browser per URL, low concurrency).
 * The collect side of "crawl + collect" — pair with browser_crawl to discover
 * the listing URLs, then drain each here.
 * @module server/tools/collect-batch
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { collectBatch } from "../../agent/collect-batch.js";
import { resolveConfig } from "../../agent/config.js";
import { toAgentOptions } from "../map-options.js";
import { progressReporter } from "../progress.js";
import { jsonResult } from "../result.js";

/** Register `browser_collect_batch`. */
export function registerCollectBatchTool(server: McpServer): void {
  server.registerTool(
    "browser_collect_batch",
    {
      title: "Collect lists (batch)",
      description:
        "Exhaust the infinite-scroll / paginated list of MANY listing URLs in parallel — drains each page (scroll + dedup by row key) and returns all items. One real browser per URL, low concurrency (default 2), jittered per-host throttle. The collect side of crawl+collect: use browser_crawl to find category/search pages, then drain each here. A failed URL becomes { url, error } without aborting the batch.",
      inputSchema: {
        urls: z.array(z.string()),
        item: z.string(),
        container: z.string().optional(),
        maxSteps: z.number().int().optional(),
        extractPrices: z.boolean().optional(),
        concurrency: z.number().int().optional(),
        throttleMs: z.number().int().optional(),
        engine: z.string().optional(),
        countryCode: z.string().optional(),
        headless: z.boolean().optional(),
        proxyUrl: z.string().optional(),
      },
    },
    async (args, extra) => {
      const a = args as Record<string, unknown>;
      const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
      const config = resolveConfig(toAgentOptions(a));
      const urls = Array.isArray(a.urls) ? a.urls.map(String) : [];
      const results = await collectBatch(config, urls, {
        item: String(a.item),
        container: typeof a.container === "string" ? a.container : undefined,
        maxSteps: num(a.maxSteps),
        extractPrices: a.extractPrices === true,
        concurrency: num(a.concurrency),
        throttleMs: num(a.throttleMs),
        onProgress: progressReporter(extra),
      });
      return jsonResult({ count: results.length, results });
    },
  );
}
