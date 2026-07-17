/**
 * Snapshot + act-by-ref tools: the agentic targeting layer.
 * `browser_snapshot` returns indexed interactive elements (each with a `ref`);
 * `browser_act` executes an action on a chosen `ref` (or text fallback) and
 * returns a diff of what changed on the page (added/removed/text/url).
 * @module server/tools/snapshot
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { annotatedScreenshot } from "../../extraction/annotate.js";
import { redactElements } from "../../extraction/redact.js";
import { captureSnapshot } from "../../extraction/snapshot.js";
import { diffSnapshots } from "../../extraction/snapshot-diff.js";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, imageJsonResult, jsonResult } from "../result.js";
import { KIND, runAct } from "./run-act.js";
import { actOutputShape, snapshotOutputShape } from "./snapshot-output.js";
import { withSession } from "./with-session.js";

/** Register `browser_snapshot` and `browser_act`. */
export function registerSnapshotTools(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_snapshot",
    {
      title: "Snapshot",
      description:
        "Return the indexed interactive elements of the live page, including those inside open Shadow DOM and iframes (same- and cross-origin). Use each element's `ref` (e.g. \"12\" or \"3:4\" for a sub-frame) with browser_act for deterministic targeting. Pass `selectors:true` to also get a durable CSS `selector` per element. Pass `prune:true` to drop only genuinely hidden or decorative elements: CSS-hidden (`display:none`/`visibility:hidden`/`content-visibility`, self or ancestor, via `checkVisibility()`) OR decorative (under an `aria-hidden` ancestor AND not focusable). A visible, focusable element is KEPT even under an `aria-hidden` ancestor — so an open modal's controls stay in the snapshot. Off by default, output unchanged. Pass `annotate:true` for a Set-of-Marks JPEG screenshot with numbered badges (= each `ref`) — for vision models: they see the page and target by ref.",
      inputSchema: {
        sessionId: z.string(),
        selectors: z.boolean().optional(),
        annotate: z.boolean().optional(),
        prune: z.boolean().optional(),
      },
      outputSchema: snapshotOutputShape,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const elements = redactElements(
          await captureSnapshot(s.page, a.selectors === true, a.prune === true),
          s.secrets,
        );
        const payload = { url: s.page.url(), count: elements.length, elements };
        if (a.annotate !== true) return jsonResult(payload);
        const shot = await annotatedScreenshot(s.page);
        return imageJsonResult(shot.base64, { ...payload, marks: shot.marks });
      });
    },
  );

  server.registerTool(
    "browser_act",
    {
      title: "Act on element",
      description:
        "Execute click/fill/select/pick/upload/hover/drag on an element by `ref` (from browser_snapshot) or by `target` text. `pick` = type `value` into a combobox then click the matching suggestion (`option` text, defaults to `value`) — for airport/city autocompletes. `upload` = set local file path(s) on an `<input type=file>` via `files` (a single path, a comma-separated string, or an array). `hover` = move the pointer over the element (reveals hover menus/tooltips). `drag` = drag the source element onto a destination given by `to` (a snapshot `ref` or a CSS selector). Returns a diff of what changed. Pass `annotate:true` to also get a Set-of-Marks screenshot of the NEW state (re-marked, anti-drift) for vision models.",
      inputSchema: {
        sessionId: z.string(),
        kind: KIND,
        ref: z.union([z.number().int(), z.string()]).optional(),
        target: z.string().optional(),
        value: z.string().optional(),
        option: z.string().optional(),
        files: z.union([z.string(), z.array(z.string())]).optional(),
        to: z.string().optional(),
        annotate: z.boolean().optional(),
      },
      outputSchema: actOutputShape,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const before = redactElements(await captureSnapshot(s.page), s.secrets);
        const urlBefore = s.page.url();
        const result = await runAct(s.page, a, s.config.humanMode, s.config.siteMemoryDir);
        if (!result) return errorResult("browser_act requires either `ref` or `target`");
        const after = redactElements(await captureSnapshot(s.page), s.secrets);
        const diff = diffSnapshots(before, after, s.page.url() !== urlBefore);
        const out = { result, url: s.page.url(), diff };
        if (a.annotate !== true) return jsonResult(out);
        const shot = await annotatedScreenshot(s.page);
        return imageJsonResult(shot.base64, { ...out, marks: shot.marks });
      });
    },
  );
}
