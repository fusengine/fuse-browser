/**
 * `browser_site_shots` tool: full-site snapshot — crawl a site then screenshot
 * each discovered page, returning content (markdown) + responsive shots per page.
 * The crawl markdown is surfaced, not discarded. Heavy (a browser per page), so
 * keep maxPages modest.
 * @module server/tools/site-shots
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveConfig } from "../../agent/config.js";
import { siteShots } from "../../agent/site-shots.js";
import { parseViewports } from "../../engine/viewport.js";
import { toAgentOptions } from "../map-options.js";
import { progressReporter } from "../progress.js";
import { jsonResult } from "../result.js";

/** Register `browser_site_shots`. */
export function registerSiteShotsTool(server: McpServer): void {
  server.registerTool(
    "browser_site_shots",
    {
      title: "Full-site snapshot (content + screenshots)",
      description:
        "Snapshot a whole site in one call: crawl it (HTTP fast-path, same-origin, robots-honored) then screenshot each discovered page. Returns BOTH the page content (markdown, already extracted by the crawl) and responsive full-page PNGs per page. Great for visual QA/audit of an entire site, design review, or a regression baseline. Heavy — one real browser per page — so maxPages stays modest (default 25) and shots run at low concurrency (default 2).",
      inputSchema: {
        url: z.string(),
        maxPages: z.number().int().optional(),
        maxDepth: z.number().int().optional(),
        sameOrigin: z.boolean().optional(),
        respectRobots: z.boolean().optional(),
        throttleMs: z.number().int().optional(),
        viewports: z.string().optional(),
        settleMs: z.number().int().optional(),
        shotsConcurrency: z.number().int().optional(),
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
      const result = await siteShots(config, String(a.url), {
        onProgress: progressReporter(extra),
        maxPages: num(a.maxPages),
        maxDepth: num(a.maxDepth),
        sameOrigin: a.sameOrigin === false ? false : undefined,
        respectRobots: a.respectRobots === false ? false : undefined,
        throttleMs: num(a.throttleMs),
        viewports: parseViewports(typeof a.viewports === "string" ? a.viewports : undefined),
        settleMs: num(a.settleMs),
        shotsConcurrency: num(a.shotsConcurrency),
        proxyUrl: typeof a.proxyUrl === "string" ? a.proxyUrl : undefined,
      });
      return jsonResult({ ...result });
    },
  );
}
