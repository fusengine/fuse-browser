/**
 * `browser_tabs` output-schema validation: the handler's `structuredContent`
 * must parse against the declared `outputSchema` (see server/tools/tabs.js).
 * @module tests/unit/tabs-tool-output
 */
import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { registerTabsTool, tabsOutputShape } from "../../src/server/tools/tabs.js";
import type { SessionManager } from "../../src/session/manager.js";
import { makeSession } from "./helpers/fake-tabs.js";

type Handler = (args: Record<string, unknown>) => Promise<CallToolResult>;

describe("browser_tabs outputSchema", () => {
  test("structuredContent parses against the declared shape", async () => {
    const { session } = makeSession();
    const sessions = { get: () => session, markBusy: () => {}, markIdle: () => {} } as unknown as SessionManager;

    let handler: Handler | undefined;
    const server = {
      registerTool: (_n: string, _c: unknown, fn: Handler) => {
        handler = fn;
      },
    } as unknown as McpServer;
    registerTabsTool(server, sessions);

    const res = await (handler as Handler)({ sessionId: "s1", action: "list" });
    expect(() => z.object(tabsOutputShape).parse(res.structuredContent)).not.toThrow();
  });
});
