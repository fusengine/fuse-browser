/**
 * `browser_shots_batch` tool: responsive screenshots for many URLs in parallel
 * — the visual counterpart of `browser_fetch_batch`. Each URL is rendered in a
 * real browser; concurrency is low by default (full Chromium per page). Saved
 * PNG paths are returned per URL; a failed URL becomes `{ url, error }`.
 * @module server/tools/shots-batch
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveConfig } from "../../agent/config.js";
import { captureShotsBatch } from "../../agent/shots-batch.js";
import { parseViewports } from "../../engine/viewport.js";
import { toAgentOptions } from "../map-options.js";
import { progressReporter } from "../progress.js";
import { jsonResult } from "../result.js";
import { urlErrorSchema } from "./schemas-fetch-output.js";
import { shotSchema } from "./schemas-shots-output.js";

/** `browser_shots_batch` output shape: saved shots or `{url,error}` per input URL. */
export const SHOTS_BATCH_OUTPUT_SHAPE = {
  count: z.number(),
  results: z.array(z.union([z.object({ url: z.string(), shots: z.array(shotSchema) }), urlErrorSchema])),
};

/** Register `browser_shots_batch`. */
export function registerShotsBatchTool(server: McpServer): void {
  server.registerTool(
    "browser_shots_batch",
    {
      title: "Responsive screenshots (batch)",
      description:
        "Capture full-page responsive screenshots for MANY URLs in parallel — the visual counterpart of browser_fetch_batch. Each URL is rendered in a real browser at each viewport (default mobile,desktop) and saved as a PNG. Concurrency is low by default (2) since every page is a full Chromium instance. Returns saved file paths per URL; a failed URL becomes { url, error } without aborting the batch. Use this to see the DESIGN of a set of pages at once.",
      inputSchema: {
        urls: z.array(z.string()),
        viewports: z.string().optional(),
        settleMs: z.number().int().optional(),
        concurrency: z.number().int().optional(),
        engine: z.string().optional(),
        countryCode: z.string().optional(),
        headless: z.boolean().optional(),
        proxyUrl: z.string().optional(),
      },
      outputSchema: SHOTS_BATCH_OUTPUT_SHAPE,
    },
    async (args, extra) => {
      const a = args as Record<string, unknown>;
      const config = resolveConfig(toAgentOptions(a));
      const urls = Array.isArray(a.urls) ? a.urls.map(String) : [];
      const viewports = parseViewports(typeof a.viewports === "string" ? a.viewports : undefined);
      const results = await captureShotsBatch(
        config,
        urls,
        viewports,
        typeof a.settleMs === "number" ? a.settleMs : undefined,
        typeof a.concurrency === "number" ? a.concurrency : undefined,
        progressReporter(extra),
      );
      return jsonResult({ count: results.length, results });
    },
  );
}
