/**
 * `browser_fetch_batch` tool: fetch many URLs in parallel via the HTTP fast-path
 * (TLS impersonation, no browser launch). Bounded concurrency; each URL is
 * independent — a failed one yields `{ url, error }` without aborting the batch.
 * @module server/tools/fetch-batch
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchBatch } from "../../agent/fetch-batch.js";
import { jsonResult } from "../result.js";

/** Register `browser_fetch_batch`. */
export function registerFetchBatchTool(server: McpServer): void {
  server.registerTool(
    "browser_fetch_batch",
    {
      title: "HTTP fast fetch (batch)",
      description:
        "Fetch MANY URLs in parallel via the HTTP fast-path — browser TLS/HTTP2 impersonation, NO browser launch. Bounded concurrency (default 8). Each URL keeps the same semantics as browser_fetch: clean markdown for HTML, JSON/plain-text verbatim, optional browserFallback per URL for SPA/CSR shells. Results are returned in input order; a failed URL becomes { url, error } and never aborts the batch. Use this instead of N browser_fetch calls when an agent needs several pages at once.",
      inputSchema: {
        urls: z.array(z.string()),
        format: z.enum(["markdown", "text"]).optional(),
        maxChars: z.number().int().optional(),
        browserFallback: z.boolean().optional(),
        proxyUrl: z.string().optional(),
        concurrency: z.number().int().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const urls = Array.isArray(a.urls) ? a.urls.map(String) : [];
      const results = await fetchBatch(urls, {
        format: typeof a.format === "string" ? a.format : undefined,
        maxChars: typeof a.maxChars === "number" ? a.maxChars : undefined,
        browserFallback: a.browserFallback === true,
        proxyUrl: typeof a.proxyUrl === "string" ? a.proxyUrl : undefined,
        concurrency: typeof a.concurrency === "number" ? a.concurrency : undefined,
      });
      return jsonResult({ count: results.length, results });
    },
  );
}
