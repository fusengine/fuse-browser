/**
 * `browser_autoscroll`: drive a live session to the bottom of a long list,
 * triggering lazy-load / infinite-scroll until it stabilises.
 * @module server/tools/autoscroll
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { autoScroll } from "../../actions/auto-scroll.js";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Register `browser_autoscroll`. */
export function registerAutoScrollTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_autoscroll",
    {
      title: "Auto-scroll a long list",
      description:
        "Repeatedly scroll a long/infinite list to the bottom to load every item before extracting. Stops after `idleRounds` rounds without growth, at `maxScrolls`, or once `untilSelector` reaches `minCount` elements. Run this before browser_extract/collect on lazy-loaded result pages.",
      inputSchema: {
        sessionId: z.string(),
        maxScrolls: z.number().int().positive().optional(),
        idleRounds: z.number().int().positive().optional(),
        untilSelector: z.string().optional(),
        minCount: z.number().int().positive().optional(),
        delayMs: z.number().int().nonnegative().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const { rounds, height } = await autoScroll(s.page, {
          maxScrolls: a.maxScrolls as number | undefined,
          idleRounds: a.idleRounds as number | undefined,
          untilSelector: a.untilSelector as string | undefined,
          minCount: a.minCount as number | undefined,
          delayMs: a.delayMs as number | undefined,
        });
        return jsonResult({ rounds, height, url: s.page.url() });
      });
    },
  );
}
