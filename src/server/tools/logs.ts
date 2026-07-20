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
import { CONSOLE_OUTPUT_SHAPE, NETWORK_OUTPUT_SHAPE } from "./logs-output.js";
import { withSession } from "./with-session.js";

export { CONSOLE_OUTPUT_SHAPE, NETWORK_OUTPUT_SHAPE } from "./logs-output.js";

const CONSOLE_DESC =
  "Console messages captured in the session since open (last 80). Use to debug JS errors, CSP " +
  'violations, or why a page misbehaves. Filter with `level` (e.g. "error"); `limit` = last N (default 50). ' +
  "LIMITATION: the default `patchright` engine disables Chromium's Console API upstream (anti-detection " +
  'patch) — on that engine an empty buffer returns `unavailable:"console_disabled_on_patchright"` instead ' +
  'of a bare `count:0`; reopen the session with engine:"playwright" to actually capture console output.';

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
      outputSchema: CONSOLE_OUTPUT_SHAPE,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const entries = filterConsole(
          s.logs.console,
          a.level as string | undefined,
          a.limit as number | undefined,
        );
        // Patchright (default engine) deliberately disables the whole Console
        // API upstream (anti-detection patch) — an empty buffer there means
        // "unavailable", not "no console messages", so say so explicitly.
        if (entries.length === 0 && s.config.engine === "patchright") {
          return jsonResult({
            count: 0,
            entries: [],
            unavailable: "console_disabled_on_patchright",
            hint: 'reopen the session with engine:"playwright" to capture console output',
          });
        }
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
      outputSchema: NETWORK_OUTPUT_SHAPE,
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
