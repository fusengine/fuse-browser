/**
 * Screenshot tool: returns a PNG as MCP image content. Optionally targets a
 * single element by its snapshot `ref` (focused vision, fewer image tokens).
 * @module server/tools/screenshot
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { REF_ATTRIBUTE } from "../../extraction/snapshot.js";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, imageResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Register `browser_screenshot`. */
export function registerScreenshotTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_screenshot",
    {
      title: "Screenshot",
      description:
        "Capture the live page as a PNG for vision. Pass `ref` (from browser_snapshot) to capture only that element instead of the page.",
      inputSchema: { sessionId: z.string(), fullPage: z.boolean().optional(), ref: z.number().int().optional() },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        if (typeof a.ref === "number") {
          const locator = s.page.locator(`[${REF_ATTRIBUTE}="${a.ref}"]`).first();
          if ((await locator.count()) === 0) return errorResult("ref_not_found");
          const buf = await locator.screenshot({ timeout: 5_000 });
          return imageResult(buf.toString("base64"), `element ref=${a.ref}`);
        }
        const buffer = await s.page.screenshot({ fullPage: Boolean(a.fullPage) });
        return imageResult(buffer.toString("base64"), `screenshot of ${s.page.url()}`);
      });
    },
  );
}
