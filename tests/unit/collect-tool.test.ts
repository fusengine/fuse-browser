import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Page } from "playwright";
import { z } from "zod";
import { collectOutputShape } from "../../src/server/tools/collect-schema.js";
import { registerCollectTool } from "../../src/server/tools/collect.js";
import type { SessionManager } from "../../src/session/manager.js";
import type { SessionData } from "../../src/session/session.js";

/** The SDK's own runtime gate: throws if `structuredContent` violates `outputSchema`. */
const collectOutputSchema = z.object(collectOutputShape);

type Handler = (args: Record<string, unknown>) => Promise<CallToolResult>;

/** Capture the registered handler from a fake McpServer (inlined: see MEMORY/LESSON.md on the DRY hook). */
function grabHandler(): { server: McpServer; handler: () => Handler } {
  let captured: Handler | undefined;
  const server = {
    registerTool: (_name: string, _cfg: unknown, fn: Handler) => {
      captured = fn;
    },
  } as unknown as McpServer;
  return { server, handler: () => captured as Handler };
}

/** A page whose one scan step yields two rows then stops (reachedEnd). */
function fakePage(): Page {
  return {
    evaluate: async () => ({
      items: [
        { key: "1", text: "Row 1 — CHF 12.00", url: "https://a.com/1" },
        { key: "2", text: "Row 2 — CHF 8.00", url: "https://a.com/2" },
      ],
      geo: { moved: 0, atEnd: true, scrollHeight: 500 },
    }),
    waitForTimeout: async () => {},
  } as unknown as Page;
}

/** Session manager wired to one page. */
function fakeSessions(page: Page): SessionManager {
  const session = { id: "s", health: "ok", page } as unknown as SessionData;
  return {
    get: () => session,
    markBusy: () => {},
    markIdle: () => {},
  } as unknown as SessionManager;
}

describe("browser_collect", () => {
  test("plain (no pipeline) -> items/steps/reachedEnd conform to outputSchema", async () => {
    const { server, handler } = grabHandler();
    registerCollectTool(server, fakeSessions(fakePage()));
    const res = await handler()({ sessionId: "s", item: ".row" });
    const payload = res.structuredContent as Record<string, unknown>;
    expect(payload.count).toBe(2);
    expect(payload.reachedEnd).toBe(true);
    expect(() => collectOutputSchema.parse(res.structuredContent)).not.toThrow();
  });

  test("with a pipeline (extractPrices + numericFields) -> invalidCount/csv also conform", async () => {
    const { server, handler } = grabHandler();
    registerCollectTool(server, fakeSessions(fakePage()));
    const res = await handler()({
      sessionId: "s",
      item: ".row",
      extractPrices: true,
      pipeline: { columns: ["key", "text"], emit: "csv" },
    });
    const payload = res.structuredContent as Record<string, unknown>;
    expect(payload.csv).toContain("key");
    expect(() => collectOutputSchema.parse(res.structuredContent)).not.toThrow();
  });
});
