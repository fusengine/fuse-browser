/**
 * `browser_inspect`: computed styles + box model + WCAG text-contrast for one
 * element by `ref` — for design review (typography, color, spacing, contrast).
 * @module server/tools/inspect
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { captureSnapshot } from "../../extraction/snapshot.js";
import { inspectStyle } from "../../extraction/style-probe.js";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Register `browser_inspect`. */
export function registerInspectTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_inspect",
    {
      title: "Inspect element style",
      description:
        "Computed styles, box model and WCAG text-contrast (AA/AAA) for one element by `ref` (from browser_snapshot). For design review: typography, color, spacing, contrast. Main-frame refs.",
      inputSchema: { sessionId: z.string(), ref: z.union([z.number().int(), z.string()]) },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        await captureSnapshot(s.page);
        const report = await inspectStyle(s.page, String(a.ref));
        return report ? jsonResult({ ...report }) : errorResult("ref_not_found");
      });
    },
  );
}
