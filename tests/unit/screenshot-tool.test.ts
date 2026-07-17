/**
 * Proves every `browser_screenshot` return branch emits a `structuredContent`
 * payload that parses against `screenshotOutputShape` — required once the
 * tool declares an `outputSchema`, or the SDK (^1.29) throws `McpError` at
 * runtime for any branch missing/mismatching it.
 * @module tests/unit/screenshot-tool
 */
import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { screenshotOutputShape } from "../../src/server/tools/screenshot-result.js";
import { registerScreenshotTool } from "../../src/server/tools/screenshot.js";
import type { SessionManager } from "../../src/session/manager.js";
import type { SessionData } from "../../src/session/session.js";

type Handler = (args: Record<string, unknown>) => Promise<CallToolResult>;
const outputSchema = z.object(screenshotOutputShape);

/** Fake McpServer that just stores the registered handler. */
function mockServer(): { server: McpServer; getHandler: () => Handler } {
  let stored: Handler | undefined;
  const server = {
    registerTool: (_name: string, _cfg: unknown, fn: Handler) => {
      stored = fn;
    },
  } as unknown as McpServer;
  return { server, getHandler: () => stored as Handler };
}

/** Locator/Frame/Page fakes covering ref-locator, snapshot, and annotate paths. */
function fakePage() {
  const locator = { count: async () => 1, screenshot: async () => Buffer.from("PNG-ELEMENT") };
  const frame = {
    locator: () => ({ first: () => locator }),
    isDetached: () => false,
    evaluate: async () => [],
  };
  const page = {
    frames: () => [frame],
    evaluate: async () => 2,
    screenshot: async () => Buffer.from("PNG-PAGE"),
    url: () => "https://example.test/",
    viewportSize: () => ({ width: 1280, height: 800 }),
    setViewportSize: async () => {},
    waitForLoadState: async () => {},
  };
  return page;
}

function fakeSessions(page: ReturnType<typeof fakePage>): SessionManager {
  const session = { id: "s", health: "ok", page } as unknown as SessionData;
  return {
    get: () => session,
    markBusy: () => {},
    markIdle: () => {},
  } as unknown as SessionManager;
}

describe("browser_screenshot outputSchema", () => {
  test("element ref branch: structuredContent parses against the schema", async () => {
    const { server, getHandler } = mockServer();
    registerScreenshotTool(server, fakeSessions(fakePage()));
    const res = await getHandler()({ sessionId: "s", ref: 3 });
    expect(res.structuredContent).toBeDefined();
    expect(() => outputSchema.parse(res.structuredContent)).not.toThrow();
    expect(outputSchema.parse(res.structuredContent).kind).toBe("element");
  });

  test("full-page branch: structuredContent parses against the schema", async () => {
    const { server, getHandler } = mockServer();
    registerScreenshotTool(server, fakeSessions(fakePage()));
    const res = await getHandler()({ sessionId: "s", fullPage: true });
    expect(res.structuredContent).toBeDefined();
    expect(() => outputSchema.parse(res.structuredContent)).not.toThrow();
    expect(outputSchema.parse(res.structuredContent).kind).toBe("page");
  });

  test("multi-viewport branch: structuredContent parses against the schema", async () => {
    const { server, getHandler } = mockServer();
    registerScreenshotTool(server, fakeSessions(fakePage()));
    const res = await getHandler()({ sessionId: "s", viewports: ["mobile", "desktop"] });
    expect(res.structuredContent).toBeDefined();
    const parsed = outputSchema.parse(res.structuredContent);
    expect(() => outputSchema.parse(res.structuredContent)).not.toThrow();
    expect(parsed).toMatchObject({ kind: "multi", count: 2 });
  });

  test("annotate branch: structuredContent parses against the schema", async () => {
    const { server, getHandler } = mockServer();
    registerScreenshotTool(server, fakeSessions(fakePage()));
    const res = await getHandler()({ sessionId: "s", annotate: true });
    expect(res.structuredContent).toBeDefined();
    expect(() => outputSchema.parse(res.structuredContent)).not.toThrow();
    expect(outputSchema.parse(res.structuredContent).kind).toBe("annotated");
  });
});
