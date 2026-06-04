/**
 * `browser_live_view` / `browser_live_view_stop`: stream a session's browser to
 * a local web page so a human can watch in real time (read-only). Starts an
 * ephemeral 127.0.0.1 server fed by a CDP screencast; the URL carries an access
 * token. Works for headless sessions too.
 * @module server/tools/live-view
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startLiveView, stopLiveView } from "../../live/manager.js";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Register the live-view tools. */
export function registerLiveViewTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_live_view",
    {
      title: "Live view (human)",
      description:
        "Stream a session's browser to a local web page (read-only) so a human can watch in real time — works headless too. Returns a 127.0.0.1 URL with an access token and opens it in the default browser (open:false to skip). Stop with browser_live_view_stop.",
      inputSchema: {
        sessionId: z.string(),
        quality: z.number().int().min(1).max(100).optional(),
        maxWidth: z.number().int().optional(),
        maxHeight: z.number().int().optional(),
        open: z.boolean().optional(),
      },
    },
    async (a) =>
      withSession(sessions, String(a.sessionId), async (s) => {
        const url = await startLiveView(s, {
          quality: typeof a.quality === "number" ? a.quality : 60,
          maxWidth: typeof a.maxWidth === "number" ? a.maxWidth : 1280,
          maxHeight: typeof a.maxHeight === "number" ? a.maxHeight : 720,
          open: a.open !== false,
        });
        return jsonResult({ url, note: "Read-only live view. Open the URL to watch; the token is embedded." });
      }),
  );

  server.registerTool(
    "browser_live_view_stop",
    {
      title: "Stop live view",
      description: "Stop the live view for a session and shut down its local server.",
      inputSchema: { sessionId: z.string() },
    },
    async (a) =>
      withSession(sessions, String(a.sessionId), async (s) => {
        const stopped = await stopLiveView(s.id);
        return jsonResult({ stopped });
      }),
  );
}
