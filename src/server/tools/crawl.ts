/**
 * `browser_crawl` tool: bounded same-origin crawl from a seed URL via the HTTP
 * fast-path — BFS, parallel per depth level, each page rendered to markdown.
 * Conservative defaults (25 pages, depth 2, robots honored) keep it polite.
 * @module server/tools/crawl
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crawl } from "../../agent/crawl.js";
import { jsonResult } from "../result.js";

/** Register `browser_crawl`. */
export function registerCrawlTool(server: McpServer): void {
  server.registerTool(
    "browser_crawl",
    {
      title: "HTTP crawl (fast-path)",
      description:
        "Crawl a site from a seed URL via the HTTP fast-path — NO browser launch. Breadth-first, fetching each depth level in parallel, returning clean markdown per page. Same-origin and robots.txt-honored by default; bounded by maxPages (default 25) and maxDepth (default 2). Use this to grab a whole docs section / blog / set of pages in one call. For JS/SPA pages set browserFallback:true (renders empty shells in a real browser, per page).",
      inputSchema: {
        url: z.string(),
        maxPages: z.number().int().optional(),
        maxDepth: z.number().int().optional(),
        sameOrigin: z.boolean().optional(),
        concurrency: z.number().int().optional(),
        format: z.enum(["markdown", "text"]).optional(),
        maxChars: z.number().int().optional(),
        browserFallback: z.boolean().optional(),
        respectRobots: z.boolean().optional(),
        proxyUrl: z.string().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
      const result = await crawl(String(a.url), {
        maxPages: num(a.maxPages),
        maxDepth: num(a.maxDepth),
        sameOrigin: a.sameOrigin === false ? false : undefined,
        concurrency: num(a.concurrency),
        format: typeof a.format === "string" ? a.format : undefined,
        maxChars: num(a.maxChars),
        browserFallback: a.browserFallback === true,
        respectRobots: a.respectRobots === false ? false : undefined,
        proxyUrl: typeof a.proxyUrl === "string" ? a.proxyUrl : undefined,
      });
      return jsonResult({ ...result });
    },
  );
}
