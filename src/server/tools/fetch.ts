/**
 * `browser_fetch` tool: HTTP fast-path (browser TLS impersonation, no browser
 * launch) for server-rendered HTML. Returns status, body text, optional prices.
 * @module server/tools/fetch
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { extractPrices } from "../../extraction/prices.js";
import { fetchFast } from "../../net/fetch-fast.js";
import { jsonResult } from "../result.js";

/** Register `browser_fetch`. */
export function registerFetchTool(server: McpServer): void {
  server.registerTool(
    "browser_fetch",
    {
      title: "HTTP fast fetch",
      description:
        "Fetch a URL with browser TLS/HTTP2 impersonation — NO browser launch, ~10x faster. For server-rendered HTML (price/index pages). Returns status, body text, optional prices. Not for JS/SPA pages — use browser_probe there.",
      inputSchema: {
        url: z.string(),
        extractPrices: z.boolean().optional(),
        proxyUrl: z.string().optional(),
        maxChars: z.number().int().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const r = await fetchFast(String(a.url), typeof a.proxyUrl === "string" ? a.proxyUrl : undefined);
      const max = typeof a.maxChars === "number" ? a.maxChars : 20_000;
      return jsonResult({
        status: r.status,
        url: r.url,
        text: r.text.slice(0, max),
        prices: a.extractPrices ? extractPrices(r.text) : undefined,
      });
    },
  );
}
