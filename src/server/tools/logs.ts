/**
 * `browser_console` / `browser_network`: query the console and network logs
 * already captured for a live session — debug JS errors and failed requests.
 * @module server/tools/logs
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { CONSOLE_LEVELS, filterConsole, filterNetwork, mergeNetwork } from "./logs-filter.js";
import { withSession } from "./with-session.js";

const CONSOLE_DESC =
  "Console messages captured in the session since open (last 80). Use to debug JS errors, CSP " +
  'violations, or why a page misbehaves. Filter with `level` (e.g. "error"); `limit` = last N (default 50).';

const NETWORK_DESC =
  "Network requests captured in the session since open (last 80): method, url, status, resourceType. " +
  "Use to debug why a page does not load: failed requests (`status: 404/500`), blocked APIs " +
  "(`urlContains`). `limit` = last N (default 50). Entries without `status` got no response (pending/failed).";

/** Register `browser_console` and `browser_network`. */
export function registerLogTools(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_console",
    {
      title: "Read console logs",
      description: CONSOLE_DESC,
      inputSchema: {
        sessionId: z.string(),
        level: z.enum(CONSOLE_LEVELS).optional(),
        limit: z.number().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const entries = filterConsole(
          s.logs.console,
          a.level as string | undefined,
          a.limit as number | undefined,
        );
        return jsonResult({ count: entries.length, entries });
      });
    },
  );
  server.registerTool(
    "browser_network",
    {
      title: "Read network logs",
      description: NETWORK_DESC,
      inputSchema: {
        sessionId: z.string(),
        status: z.number().optional(),
        urlContains: z.string().optional(),
        limit: z.number().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const requests = filterNetwork(mergeNetwork(s.logs.network), {
          status: a.status as number | undefined,
          urlContains: a.urlContains as string | undefined,
          limit: a.limit as number | undefined,
        });
        return jsonResult({ count: requests.length, requests });
      });
    },
  );
}
