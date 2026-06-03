/**
 * Screenshot tool: returns a PNG as MCP image content. Optionally targets a
 * single element by `ref`, or captures across one/several viewports (responsive).
 * @module server/tools/screenshot
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { refLocator } from "../../actions/ref-locator.js";
import { applyColorScheme } from "../../lib/color-scheme.js";
import { type ViewportInput, resolveViewport, viewportLabel } from "../../engine/viewport.js";
import type { SessionManager } from "../../session/manager.js";
import { settleForCapture } from "../../state/settle-capture.js";
import { errorResult, imageResult, multiImageResult } from "../result.js";
import { withSession } from "./with-session.js";

const VIEWPORT_SCHEMA = z.union([
  z.enum(["mobile", "tablet", "desktop"]),
  z.object({ width: z.number().int(), height: z.number().int() }),
]);

/** Register `browser_screenshot`. */
export function registerScreenshotTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_screenshot",
    {
      title: "Screenshot",
      description:
        "Capture the live page as PNG(s) for vision. Pass `ref` for one element, `viewport` for one size, or `viewports` (e.g. [\"mobile\",\"desktop\"]) for a responsive set. Pass `colorScheme` (\"light\"|\"dark\") to capture a theme — emulates `prefers-color-scheme` AND toggles the `themeClass` (default \"dark\") on <html> for Tailwind/shadcn class themes, then restores.",
      inputSchema: {
        sessionId: z.string(),
        fullPage: z.boolean().optional(),
        ref: z.union([z.number().int(), z.string()]).optional(),
        viewport: VIEWPORT_SCHEMA.optional(),
        viewports: z.array(VIEWPORT_SCHEMA).optional(),
        colorScheme: z.enum(["light", "dark"]).optional(),
        themeClass: z.string().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const scheme = a.colorScheme as "light" | "dark" | undefined;
        const restore = scheme
          ? await applyColorScheme(s.page, scheme, a.themeClass ? String(a.themeClass) : undefined)
          : null;
        try {
          if (typeof a.ref === "number" || typeof a.ref === "string") {
            const locator = refLocator(s.page, a.ref);
            if (!locator || (await locator.count()) === 0) return errorResult("ref_not_found");
            const buf = await locator.screenshot({ timeout: 5_000 });
            return imageResult(buf.toString("base64"), `element ref=${a.ref}`);
          }
          const fullPage = Boolean(a.fullPage);
          const list = (Array.isArray(a.viewports) ? a.viewports : a.viewport ? [a.viewport] : []) as ViewportInput[];
          if (list.length === 0) {
            const buffer = await s.page.screenshot({ fullPage });
            return imageResult(buffer.toString("base64"), `screenshot of ${s.page.url()}`);
          }
          const original = s.page.viewportSize();
          const shots: Array<{ base64: string; note: string }> = [];
          for (const v of list) {
            await s.page.setViewportSize(resolveViewport(v));
            await settleForCapture(s.page);
            const buf = await s.page.screenshot({ fullPage, animations: "disabled" });
            shots.push({ base64: buf.toString("base64"), note: viewportLabel(v) });
          }
          if (original) await s.page.setViewportSize(original);
          return multiImageResult(shots);
        } finally {
          if (restore) await restore();
        }
      });
    },
  );
}
