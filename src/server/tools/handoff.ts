/**
 * `browser_handoff` tool: pause the agent and let a HUMAN drive the live browser
 * (login / 2FA / hard captcha), then resume on a completion condition. The agent
 * and human share the same session, so cookies/auth carry over seamlessly.
 * Requires a visible window (`headless:false`); in headless mode it still waits
 * but no human can act — surfaced as a warning.
 * @module server/tools/handoff
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Register `browser_handoff`. */
export function registerHandoffTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_handoff",
    {
      title: "Human handoff",
      description:
        "Pause for a human to complete a step in the live browser (login/2FA/captcha), then resume when `url` (substring/regex) or `selector` appears. Same session → auth carries over. Needs headless:false for a human to actually interact.",
      inputSchema: {
        sessionId: z.string(),
        reason: z.string().optional(),
        url: z.string().optional(),
        selector: z.string().optional(),
        timeoutMs: z.number().int().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const timeout = typeof a.timeoutMs === "number" ? a.timeoutMs : 300_000;
        const warn = s.config.headless ? "headless: no human can interact — launch with headless:false" : undefined;
        try {
          if (typeof a.url === "string") {
            await s.page.waitForURL(a.url.includes("*") ? new RegExp(a.url.replace(/\*/g, ".*")) : (u) => u.href.includes(a.url as string), { timeout });
          } else if (typeof a.selector === "string") {
            await s.page.waitForSelector(a.selector, { timeout });
          } else {
            await s.page.waitForNavigation({ timeout });
          }
          return jsonResult({ status: "resumed", url: s.page.url(), warning: warn });
        } catch {
          return jsonResult({ status: "timeout", url: s.page.url(), warning: warn });
        }
      });
    },
  );
}
