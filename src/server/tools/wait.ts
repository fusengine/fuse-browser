/**
 * `browser_wait_for`: semantic wait on a live session (text/selector/url/gone).
 * @module server/tools/wait
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { waitForCondition } from "../../actions/wait-for.js";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Register `browser_wait_for`. */
export function registerWaitTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_wait_for",
    {
      title: "Wait for condition",
      description:
        "Wait until a condition holds: text appears, selector visible, selector gone, or URL contains a substring. Use instead of fixed delays.",
      inputSchema: {
        sessionId: z.string(),
        text: z.string().optional(),
        selector: z.string().optional(),
        gone: z.string().optional(),
        urlContains: z.string().optional(),
        timeoutMs: z.number().int().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const result = await waitForCondition(s.page, {
          text: a.text as string | undefined,
          selector: a.selector as string | undefined,
          gone: a.gone as string | undefined,
          urlContains: a.urlContains as string | undefined,
          timeoutMs: a.timeoutMs as number | undefined,
        });
        return jsonResult({ result, url: s.page.url() });
      });
    },
  );
}
