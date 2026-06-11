/**
 * Multi-tab management tool (`browser_tabs`) for a live session.
 * @module server/tools/tabs
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { SessionManager } from "../../session/manager.js";
import type { SessionData } from "../../session/session.js";
import { closeTab, listTabs, openTab, selectTab } from "../../session/tabs.js";
import { errorResult, jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

const DESCRIPTION =
  "Manage the tabs of a live session: list them, open a new tab (optional url), " +
  "select one as the active target of every other browser_* tool, or close one. " +
  "Use it when a click spawned a popup (OAuth login, target=_blank link): 'list' " +
  "to find it, 'select' to drive it, 'close' then 'select' to come back. Always " +
  "returns the tab list plus the active index after the action. Closing the last " +
  "tab is refused — use browser_close to end the session.";

type TabAction = "list" | "new" | "select" | "close";

/** Apply a mutating tab action; `list` is a no-op (the listing happens after). */
async function applyAction(s: SessionData, action: TabAction, index: number, url?: string): Promise<void> {
  if (action === "new") await openTab(s, url);
  else if (action === "select") await selectTab(s, index);
  else if (action === "close") await closeTab(s, index);
}

/** Map tab-domain errors to MCP error results; rethrow everything else. */
function tabError(err: unknown): CallToolResult {
  if (err instanceof RangeError) return errorResult(err.message, "invalid_tab_index");
  if (err instanceof Error && err.message.startsWith("cannot_close_last_tab"))
    return errorResult(err.message, "cannot_close_last_tab");
  throw err;
}

/** Register `browser_tabs`. */
export function registerTabsTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_tabs",
    {
      title: "Tabs",
      description: DESCRIPTION,
      inputSchema: {
        sessionId: z.string(),
        action: z.enum(["list", "new", "select", "close"]),
        index: z.number().optional(),
        url: z.string().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const action = a.action as TabAction;
      return withSession(sessions, String(a.sessionId), async (s) => {
        if ((action === "select" || action === "close") && typeof a.index !== "number")
          return errorResult(`missing_index: action "${action}" requires an index`, "missing_index");
        try {
          await applyAction(s, action, Number(a.index ?? 0), a.url ? String(a.url) : undefined);
        } catch (err) {
          return tabError(err);
        }
        const tabs = await listTabs(s);
        return jsonResult({ tabs, active: tabs.find((t) => t.active)?.index ?? 0 });
      });
    },
  );
}
