/**
 * `browser_visual_diff` tool: pixel-compare the live page against a baseline PNG
 * (created on first run), or two explicit PNG paths. Returns diff stats +
 * changed-region boxes; writes the highlighted diff PNG next to the baseline.
 * @module server/tools/visual-diff
 */
import { existsSync, readFileSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFileBytes } from "../../lib/fs.js";
import { diffPng } from "../../lib/pixel-diff.js";
import { assertPngPath } from "../../lib/safe-png.js";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Register `browser_visual_diff`. */
export function registerVisualDiffTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_visual_diff",
    {
      title: "Visual diff",
      description:
        "Pixel-compare the live page against a `baseline` PNG (created on first call, then diffed on later calls), or two explicit PNGs (`a` + `b`). Returns diffPixels/diffRatio and changed-region boxes, and writes a highlighted diff PNG. Fails if image sizes differ. For visual regression / page-change monitoring.",
      inputSchema: {
        sessionId: z.string().optional(),
        baseline: z.string().optional(),
        a: z.string().optional(),
        b: z.string().optional(),
        fullPage: z.boolean().optional(),
        threshold: z.number().optional(),
      },
    },
    async (args) => {
      const x = args as Record<string, unknown>;
      const threshold = typeof x.threshold === "number" ? x.threshold : 0.1;
      if (typeof x.a === "string" && typeof x.b === "string") {
        let a: string;
        let b: string;
        try {
          a = assertPngPath(x.a, "a");
          b = assertPngPath(x.b, "b");
        } catch (e) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
        const d = diffPng(readFileSync(a), readFileSync(b), threshold);
        writeFileBytes(`${b}.diff.png`, d.diffPng);
        return jsonResult({ ...stats(d), diffImage: `${b}.diff.png` });
      }
      if (typeof x.sessionId !== "string" || typeof x.baseline !== "string") {
        return errorResult("browser_visual_diff needs either `a`+`b` paths, or `sessionId`+`baseline`");
      }
      let baseline: string;
      try {
        baseline = assertPngPath(x.baseline, "baseline");
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
      return withSession(sessions, x.sessionId, async (s) => {
        const shot = await s.page.screenshot({ fullPage: x.fullPage === true });
        if (!existsSync(baseline)) {
          writeFileBytes(baseline, shot);
          return jsonResult({ baselineCreated: true, baseline });
        }
        const d = diffPng(readFileSync(baseline), shot, threshold);
        writeFileBytes(`${baseline}.diff.png`, d.diffPng);
        return jsonResult({ ...stats(d), baseline, diffImage: `${baseline}.diff.png` });
      });
    },
  );
}

/** Serializable diff stats (without the raw PNG bytes). */
function stats(d: ReturnType<typeof diffPng>): Record<string, unknown> {
  return { width: d.width, height: d.height, diffPixels: d.diffPixels, diffRatio: d.diffRatio, regions: d.regions };
}
