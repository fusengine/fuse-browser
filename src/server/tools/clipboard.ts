/**
 * `browser_clipboard`: read from or write to the page clipboard via the
 * `navigator.clipboard` API. Requires the clipboard-read/clipboard-write
 * permissions — granted best-effort here, but you can also call
 * `browser_permissions` first to grant them explicitly.
 * @module server/tools/clipboard
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BrowserContext, Page } from "playwright";
import { z } from "zod";
import { evalScript, evalScriptArg } from "../../lib/evaluate.js";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

const WRITE_SCRIPT = "(t) => navigator.clipboard.writeText(t)";
const READ_SCRIPT = "() => navigator.clipboard.readText()";

/** read returns clipboard text; write puts `text` on the clipboard. */
export type ClipboardAction = "read" | "write";

const DESC =
  "Read from or write to the page clipboard (navigator.clipboard). `read` returns the current " +
  "text; `write` sets it to `text`. Needs clipboard permissions — granted best-effort, or call " +
  "browser_permissions with clipboard-read/clipboard-write first if the browser denies it.";

/** Best-effort grant of clipboard permissions (failures are ignored). */
async function ensureClipboard(context: BrowserContext): Promise<void> {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
}

/**
 * Read or write the page clipboard via `navigator.clipboard`.
 * @param page - The session page.
 * @param action - read or write.
 * @param text - Text to write (required for `write`).
 * @returns The clipboard text on read, or `undefined` on write.
 */
export async function applyClipboard(
  page: Page,
  action: ClipboardAction,
  text?: string,
): Promise<string | undefined> {
  if (action === "write") {
    await evalScriptArg<void, string>(page, WRITE_SCRIPT, text ?? "");
    return undefined;
  }
  return evalScript<string>(page, READ_SCRIPT);
}

/** Merged success shape across the 2 actions (read/write). */
export const CLIPBOARD_OUTPUT_SHAPE = {
  written: z.literal(true).optional(),
  text: z.string().optional(),
};

/** Register `browser_clipboard`. */
export function registerClipboardTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_clipboard",
    {
      title: "Read or write clipboard",
      description: DESC,
      inputSchema: {
        sessionId: z.string(),
        action: z.enum(["read", "write"]),
        text: z.string().optional(),
      },
      outputSchema: CLIPBOARD_OUTPUT_SHAPE,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const action = a.action as ClipboardAction;
        await ensureClipboard(s.context);
        try {
          const text = await applyClipboard(s.page, action, a.text as string | undefined);
          return action === "write" ? jsonResult({ written: true }) : jsonResult({ text });
        } catch (err) {
          const why = err instanceof Error ? err.message : String(err);
          return errorResult(
            `clipboard_denied: ${why} — grant clipboard-read/clipboard-write via browser_permissions`,
            "clipboard_denied",
          );
        }
      });
    },
  );
}
