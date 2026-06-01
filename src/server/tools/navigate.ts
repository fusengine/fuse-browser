/**
 * Navigation tool for a live session.
 * @module server/tools/navigate
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Register `browser_navigate`. */
export function registerNavigateTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_navigate",
    {
      title: "Navigate",
      description: "Navigate a live session to a URL and return the resulting title.",
      inputSchema: { sessionId: z.string(), url: z.string(), waitMs: z.number().int().optional() },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        await s.page.goto(String(a.url), { waitUntil: "domcontentloaded", timeout: 30_000 });
        try {
          await s.page.waitForLoadState("networkidle", { timeout: 10_000 });
        } catch {
          /* networkidle is best-effort */
        }
        if (a.waitMs) await s.page.waitForTimeout(Number(a.waitMs));
        return jsonResult({ url: s.page.url(), title: await s.page.title() });
      });
    },
  );
}
