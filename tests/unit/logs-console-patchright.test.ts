import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { registerLogTools } from "../../src/server/tools/logs.js";
import type { SessionManager } from "../../src/session/manager.js";
import type { SessionData } from "../../src/session/session.js";

// P1 regression coverage: browser_console must not silently imply "no
// messages" when patchright disables the Console API upstream.
type Handler = (args: Record<string, unknown>) => Promise<CallToolResult>;

/** Capture only the `browser_console` handler from a fake McpServer (logs.ts registers two tools). */
function captureConsoleHandler(): { server: McpServer; handler: () => Handler } {
  let captured: Handler | undefined;
  const server = {
    registerTool: (name: string, _cfg: unknown, fn: Handler) => {
      if (name === "browser_console") captured = fn;
    },
  } as unknown as McpServer;
  return { server, handler: () => captured as Handler };
}

/** Minimal session manager with a fixed engine + console buffer. */
function fakeSessions(engine: string, consoleLogs: Array<{ type: string; text: string }>): SessionManager {
  const session = {
    id: "s",
    health: "ok",
    config: { engine },
    logs: { console: consoleLogs, network: [] },
  } as unknown as SessionData;
  return {
    get: () => session,
    markBusy: () => {},
    markIdle: () => {},
  } as unknown as SessionManager;
}

describe("browser_console — patchright limitation", () => {
  test("empty buffer on patchright engine returns the unavailable signal, not a bare count:0", async () => {
    const { server, handler } = captureConsoleHandler();
    registerLogTools(server, fakeSessions("patchright", []));
    const res = await handler()({ sessionId: "s" });
    expect(res.structuredContent).toEqual({
      count: 0,
      entries: [],
      unavailable: "console_disabled_on_patchright",
      hint: 'reopen the session with engine:"playwright" to capture console output',
    });
  });

  test("empty buffer on playwright engine stays a bare count:0 (no false unavailable signal)", async () => {
    const { server, handler } = captureConsoleHandler();
    registerLogTools(server, fakeSessions("playwright", []));
    const res = await handler()({ sessionId: "s" });
    expect(res.structuredContent).toEqual({ count: 0, entries: [] });
  });

  test("non-empty buffer on patchright returns the real entries (no unavailable signal)", async () => {
    const { server, handler } = captureConsoleHandler();
    registerLogTools(server, fakeSessions("patchright", [{ type: "log", text: "hi" }]));
    const res = await handler()({ sessionId: "s" });
    expect(res.structuredContent).toEqual({ count: 1, entries: [{ type: "log", text: "hi" }] });
  });
});
