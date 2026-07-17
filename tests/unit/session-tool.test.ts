/**
 * `browser_open` output-schema validation: the handler's `structuredContent`
 * must parse against the declared `outputSchema` (see server/tools/session.ts).
 * @module tests/unit/session-tool
 */
import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { resolveConfig } from "../../src/agent/config.js";
import { openOutputShape, registerSessionTools } from "../../src/server/tools/session.js";
import type { SessionManager } from "../../src/session/manager.js";
import type { SessionData } from "../../src/session/session.js";

type Handler = (args: Record<string, unknown>) => Promise<CallToolResult>;

describe("browser_open outputSchema", () => {
  test("structuredContent parses against the declared shape", async () => {
    const config = resolveConfig({});
    const session = { id: "s1", page: { url: () => "about:blank" }, expiresAt: Date.now() + 60_000, config } as unknown as SessionData;
    const sessions = { open: async () => session } as unknown as SessionManager;

    let handler: Handler | undefined;
    const server = {
      registerTool: (name: string, _c: unknown, fn: Handler) => {
        if (name === "browser_open") handler = fn;
      },
    } as unknown as McpServer;
    registerSessionTools(server, sessions);

    const res = await (handler as Handler)({});
    expect(() => z.object(openOutputShape).parse(res.structuredContent)).not.toThrow();
  });
});
