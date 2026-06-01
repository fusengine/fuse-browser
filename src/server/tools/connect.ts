/**
 * `browser_connect`: launch an installed browser (by name or path) with a
 * remote-debugging port, wait for CDP, then open an attached session.
 * @module server/tools/connect
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveConfig } from "../../agent/config.js";
import { KNOWN_BROWSERS, spawnBrowser, waitForCdp } from "../../engine/cdp-launch.js";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, jsonResult } from "../result.js";

const BROWSERS = ["dia", "chrome", "edge", "brave", "arc"] as const;

/** Register `browser_connect`. */
export function registerConnectTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_connect",
    {
      title: "Connect to installed browser",
      description:
        "Launch an installed browser (dia/chrome/edge/brave/arc or executablePath) with remote debugging, attach to it, and return a session id. Drives the user's real browser.",
      inputSchema: {
        browser: z.enum(BROWSERS).optional(),
        executablePath: z.string().optional(),
        port: z.number().int().optional(),
        userDataDir: z.string().optional(),
        launch: z.boolean().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const port = (a.port as number | undefined) ?? 9222;
      const binary = (a.executablePath as string | undefined) ?? KNOWN_BROWSERS[(a.browser as string) ?? "chrome"];
      if (!binary) return errorResult(`Unknown browser: ${String(a.browser)}`);
      if (a.launch !== false) spawnBrowser(binary, port, a.userDataDir as string | undefined);
      let endpoint: string;
      try {
        endpoint = await waitForCdp(port);
      } catch (err) {
        return errorResult(String(err));
      }
      const s = await sessions.open(resolveConfig({ cdpEndpoint: endpoint }));
      return jsonResult({ sessionId: s.id, endpoint, url: s.page.url(), connected: s.connected });
    },
  );
}
