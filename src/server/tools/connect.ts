/**
 * `browser_connect`: launch an installed browser (by name or path) with a
 * remote-debugging port, wait for CDP, then open an attached session.
 * @module server/tools/connect
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveConfig } from "../../agent/config.js";
import type { BrowserName } from "../../engine/browser-paths.js";
import { resolveBrowserBinary } from "../../engine/browser-paths.js";
import { spawnBrowser, waitForCdp } from "../../engine/cdp-launch.js";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, jsonResult } from "../result.js";

const BROWSERS = ["dia", "chrome", "edge", "brave", "arc"] as const;

const connectOutputShape = {
  sessionId: z.string(),
  endpoint: z.string(),
  url: z.string(),
  connected: z.boolean(),
};

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
      outputSchema: connectOutputShape,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const port = (a.port as number | undefined) ?? 9222;
      let binary = a.executablePath as string | undefined;
      if (!binary) {
        const name = ((a.browser as string) ?? "chrome") as BrowserName;
        const resolved = resolveBrowserBinary(name);
        if (!resolved.binary) {
          return errorResult(
            `No installed browser found for "${name}" on ${process.platform} (tried: ${resolved.tried.join(", ")}). Pass \`executablePath\` explicitly.`,
            "browser_not_found",
          );
        }
        binary = resolved.binary;
      }
      if (a.launch !== false) {
        const spawned = await spawnBrowser(binary, port, a.userDataDir as string | undefined);
        if (!spawned.ok) {
          return errorResult(`Failed to launch browser at "${binary}": ${spawned.error}`, "browser_spawn_failed");
        }
      }
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
