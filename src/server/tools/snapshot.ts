/**
 * Snapshot + act-by-ref tools: the agentic targeting layer.
 * `browser_snapshot` returns indexed interactive elements (each with a `ref`);
 * `browser_act` executes an action on a chosen `ref` (or text fallback) and
 * returns a diff of what changed on the page (added/removed/text/url).
 * @module server/tools/snapshot
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Page } from "playwright";
import { z } from "zod";
import { actByRef, type RefActionKind } from "../../actions/act-by-ref.js";
import { pickAutocomplete } from "../../actions/autocomplete.js";
import { smartClick } from "../../actions/smart-click.js";
import { smartFill } from "../../actions/smart-fill.js";
import { annotatedScreenshot } from "../../extraction/annotate.js";
import { captureSnapshot } from "../../extraction/snapshot.js";
import { diffSnapshots } from "../../extraction/snapshot-diff.js";
import type { ActionResult } from "../../interfaces/types.js";
import type { SessionManager } from "../../session/manager.js";
import { runWithMemory } from "../../state/action-memory.js";
import { errorResult, imageJsonResult, jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

const KIND = z.enum(["click", "fill", "select", "pick"]);

/** Run the chosen action (by ref or text fallback), with site-memory assist. */
async function runAct(
  page: Page,
  a: Record<string, unknown>,
  human: boolean,
  dir: string,
): Promise<ActionResult | null> {
  const kind = a.kind as RefActionKind;
  const value = a.value ? String(a.value) : "";
  const option = a.option ? String(a.option) : "";
  if (typeof a.ref === "number" || typeof a.ref === "string") return actByRef(page, a.ref, kind, value, option);
  if (typeof a.target !== "string") return null;
  const target = a.target;
  if (kind === "pick") return pickAutocomplete(page, page.locator(target).first(), value, option);
  return runWithMemory(dir, page, { type: kind, target }, (act) => {
    const pref = String(act.preferredStrategy ?? "");
    return kind === "fill" ? smartFill(page, target, value, pref, human) : smartClick(page, target, pref, human);
  });
}

/** Register `browser_snapshot` and `browser_act`. */
export function registerSnapshotTools(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_snapshot",
    {
      title: "Snapshot",
      description:
        "Return the indexed interactive elements of the live page, including those inside open Shadow DOM and iframes (same- and cross-origin). Use each element's `ref` (e.g. \"12\" or \"3:4\" for a sub-frame) with browser_act for deterministic targeting. Pass `selectors:true` to also get a durable CSS `selector` per element. Pass `annotate:true` for a Set-of-Marks JPEG screenshot with numbered badges (= each `ref`) — for vision models: they see the page and target by ref.",
      inputSchema: { sessionId: z.string(), selectors: z.boolean().optional(), annotate: z.boolean().optional() },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const elements = await captureSnapshot(s.page, a.selectors === true);
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
        "Execute click/fill/select/pick on an element by `ref` (from browser_snapshot) or by `target` text. `pick` = type `value` into a combobox then click the matching suggestion (`option` text, defaults to `value`) — for airport/city autocompletes. Returns a diff of what changed.",
      inputSchema: {
        sessionId: z.string(),
        kind: KIND,
        ref: z.union([z.number().int(), z.string()]).optional(),
        target: z.string().optional(),
        value: z.string().optional(),
        option: z.string().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const before = await captureSnapshot(s.page);
        const urlBefore = s.page.url();
        const result = await runAct(s.page, a, s.config.humanMode, s.config.siteMemoryDir);
        if (!result) return errorResult("browser_act requires either `ref` or `target`");
        const after = await captureSnapshot(s.page);
        const diff = diffSnapshots(before, after, s.page.url() !== urlBefore);
        return jsonResult({ result, url: s.page.url(), diff });
      });
    },
  );
}
