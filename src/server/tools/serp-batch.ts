/**
 * `browser_serp_batch` tool: run multiple Google searches in one session.
 * @module server/tools/serp-batch
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveConfig } from "../../agent/config.js";
import { serpBatch } from "../../agent/serp-batch.js";
import { toAgentOptions } from "../map-options.js";
import { jsonResult } from "../result.js";
import { agentOptionShape } from "../schemas.js";

/** Register `browser_serp_batch`. */
export function registerSerpBatchTool(server: McpServer): void {
  server.registerTool(
    "browser_serp_batch",
    {
      title: "Google SERP batch",
      description:
        "Run several Google searches in one session; returns per-query organic results and optional domain rank. Sequential + throttled (small batches; high volume needs proxies).",
      inputSchema: {
        queries: z.array(z.string()),
        rankDomain: z.string().optional(),
        pages: z.number().int().optional(),
        hl: z.string().optional(),
        gl: z.string().optional(),
        delayMs: z.number().int().optional(),
        ...agentOptionShape,
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const config = resolveConfig(toAgentOptions(a));
      const rows = await serpBatch(config, {
        queries: a.queries as string[],
        rankDomain: a.rankDomain as string | undefined,
        pages: a.pages as number | undefined,
        hl: a.hl as string | undefined,
        gl: a.gl as string | undefined,
        delayMs: a.delayMs as number | undefined,
      });
      return jsonResult({ rows });
    },
  );
}
