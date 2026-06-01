/**
 * Action tools for a live session: click / fill / login / wait / scroll /
 * press / select / back / forward.
 * @module server/tools/act
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type ActionInput, performAction } from "../../actions/perform.js";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

type Shape = Record<string, z.ZodTypeAny>;
type Build = (a: Record<string, unknown>) => ActionInput;

function actTool(
  server: McpServer,
  sessions: SessionManager,
  name: string,
  description: string,
  inputSchema: Shape,
  build: Build,
): void {
  server.registerTool(name, { title: name, description, inputSchema }, async (args) => {
    const a = args as Record<string, unknown>;
    return withSession(sessions, String(a.sessionId), async (s) => {
      const result = await performAction(s.page, build(a), s.config.humanMode);
      return jsonResult({ result, url: s.page.url() });
    });
  });
}

/** Register every per-session action tool. */
export function registerActTools(server: McpServer, sessions: SessionManager): void {
  const sessionId = z.string();
  actTool(server, sessions, "browser_click", "Click a target in the session.", { sessionId, target: z.string() }, (a) => ({
    type: "click",
    target: String(a.target),
  }));
  actTool(server, sessions, "browser_fill", "Fill a field in the session.", { sessionId, target: z.string(), value: z.string() }, (a) => ({
    type: "fill",
    target: String(a.target),
    value: String(a.value),
  }));
  actTool(server, sessions, "browser_scroll", "Scroll by a pixel delta (positive deltaY scrolls down). Pass `selector` to scroll a specific scrollable container (auto-detected if omitted with `to`), or `to:\"end\"` to jump to its bottom.", { sessionId, deltaY: z.number().optional(), deltaX: z.number().optional(), selector: z.string().optional(), to: z.enum(["end"]).optional() }, (a) => ({
    type: "scroll",
    deltaY: a.deltaY ?? 600,
    deltaX: a.deltaX ?? 0,
    selector: a.selector as string | undefined,
    to: a.to as string | undefined,
  }));
  actTool(server, sessions, "browser_press", "Press a key or shortcut (Enter, ArrowDown, Control+a...).", { sessionId, key: z.string() }, (a) => ({
    type: "press",
    key: String(a.key),
  }));
  actTool(server, sessions, "browser_select", "Select an option in a <select> by value, label or index.", { sessionId, target: z.string(), value: z.string() }, (a) => ({
    type: "select",
    target: String(a.target),
    value: String(a.value),
  }));
  actTool(server, sessions, "browser_back", "Navigate back in session history.", { sessionId }, () => ({ type: "back" }));
  actTool(server, sessions, "browser_forward", "Navigate forward in session history.", { sessionId }, () => ({ type: "forward" }));
  actTool(server, sessions, "browser_wait", "Wait for a number of milliseconds.", { sessionId, ms: z.number().int() }, (a) => ({
    type: "wait",
    ms: Number(a.ms),
  }));
  actTool(
    server,
    sessions,
    "browser_login",
    "Structured login (username + password + submit).",
    {
      sessionId,
      username: z.string(),
      password: z.string(),
      usernameTarget: z.string().optional(),
      passwordTarget: z.string().optional(),
      submitTarget: z.string().optional(),
    },
    (a) => ({
      type: "login",
      username: String(a.username),
      password: String(a.password),
      usernameTarget: a.usernameTarget as string | undefined,
      passwordTarget: a.passwordTarget as string | undefined,
      submitTarget: a.submitTarget as string | undefined,
    }),
  );
}
