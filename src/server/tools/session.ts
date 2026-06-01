/**
 * Session lifecycle tools: open / status / close.
 * @module server/tools/session
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveConfig } from "../../agent/config.js";
import { buildIdentity } from "../../identity/identity.js";
import type { SessionManager } from "../../session/manager.js";
import { toAgentOptions } from "../map-options.js";
import { jsonResult } from "../result.js";
import { agentOptionShape } from "../schemas.js";
import { withSession } from "./with-session.js";

/** Register `browser_open`, `browser_status`, `browser_close`. */
export function registerSessionTools(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_open",
    { title: "Open browser session", description: "Open a persistent browser session and return its id.", inputSchema: agentOptionShape },
    async (args) => {
      const config = resolveConfig(toAgentOptions(args as Record<string, unknown>));
      const s = await sessions.open(config);
      const identity = buildIdentity({
        identity: config.identity,
        realisticProfile: config.realisticProfile,
        userDataDir: config.userDataDir,
        proxyUrl: config.proxyUrl,
        proxySource: config.proxySource,
      });
      return jsonResult({ sessionId: s.id, expiresAt: s.expiresAt, identity });
    },
  );

  server.registerTool(
    "browser_status",
    { title: "Session status", description: "Status of one session (sessionId) or all sessions.", inputSchema: { sessionId: z.string().optional() } },
    async (args) => {
      const id = (args as Record<string, unknown>).sessionId as string | undefined;
      if (!id) {
        return jsonResult({
          sessions: sessions.list().map((s) => ({ sessionId: s.id, url: s.page.url(), expiresAt: s.expiresAt })),
        });
      }
      return withSession(sessions, id, async (s) =>
        jsonResult({ sessionId: s.id, url: s.page.url(), createdAt: s.createdAt, expiresAt: s.expiresAt }),
      );
    },
  );

  server.registerTool(
    "browser_close",
    { title: "Close session", description: "Close a browser session by id.", inputSchema: { sessionId: z.string() } },
    async (args) => jsonResult({ closed: await sessions.close(String((args as Record<string, unknown>).sessionId)) }),
  );
}
