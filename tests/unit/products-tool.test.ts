import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Page } from "playwright";
import { z } from "zod";
import { PRODUCTS_OUTPUT_SHAPE, registerProductsTool } from "../../src/server/tools/products.js";
import type { SessionManager } from "../../src/session/manager.js";
import type { SessionData } from "../../src/session/session.js";

/** The SDK's own runtime gate: throws if `structuredContent` violates `outputSchema`. */
const productsOutputSchema = z.object(PRODUCTS_OUTPUT_SHAPE);

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

/** A page whose DOM script always returns two fixed product cards. */
function fakePage(): Page {
  return {
    url: () => "https://shop.example.com/search",
    evaluate: async () => [
      { title: "Widget A", price: 19.9, currency: "CHF" },
      { title: "Widget B", price: 24.5, currency: "CHF", url: "https://shop.example.com/b" },
    ],
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

describe("browser_products", () => {
  test("returns {url, count, products} conforming to outputSchema", async () => {
    const { server, handler } = grabHandler();
    registerProductsTool(server, fakeSessions(fakePage()));
    const res = await handler()({ sessionId: "s" });
    const payload = res.structuredContent as Record<string, unknown>;
    expect(payload.count).toBe(2);
    expect(payload.url).toBe("https://shop.example.com/search");
    expect(() => productsOutputSchema.parse(res.structuredContent)).not.toThrow();
  });
});
