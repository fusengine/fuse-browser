import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { BrowserContext } from "playwright";
import { z } from "zod";
import type { SessionManager } from "../../src/session/manager.js";
import type { SessionData } from "../../src/session/session.js";
import { COOKIES_OUTPUT_SHAPE, registerCookiesTool } from "../../src/server/tools/cookies.js";

/** The SDK's own runtime gate: throws if `structuredContent` violates the tool's `outputSchema`. */
const cookiesOutputSchema = z.object(COOKIES_OUTPUT_SHAPE);

type Handler = (args: Record<string, unknown>) => Promise<CallToolResult>;

/** Capture the registered handler from a fake McpServer. */
function captureHandler(): { server: McpServer; handler: () => Handler } {
  let captured: Handler | undefined;
  const server = {
    registerTool: (_name: string, _cfg: unknown, fn: Handler) => {
      captured = fn;
    },
  } as unknown as McpServer;
  return { server, handler: () => captured as Handler };
}

/** Spy context recording the cookie calls it received. */
function fakeContext() {
  const calls = {
    cookiesUrls: undefined as unknown,
    added: undefined as unknown,
    cleared: 0,
  };
  const context = {
    cookies: async (urls?: unknown) => {
      calls.cookiesUrls = urls;
      return [{ name: "sid", value: "1" }];
    },
    addCookies: async (cookies: unknown) => {
      calls.added = cookies;
    },
    clearCookies: async () => {
      calls.cleared += 1;
    },
  } as unknown as BrowserContext;
  return { context, calls };
}

/** Session manager wired to a given context. */
function fakeSessions(context: BrowserContext): SessionManager {
  const session = { id: "s", health: "ok", context } as unknown as SessionData;
  return {
    get: () => session,
    markBusy: () => {},
    markIdle: () => {},
  } as unknown as SessionManager;
}

describe("browser_cookies", () => {
  test("get -> calls context.cookies(urls) and returns them", async () => {
    const { context, calls } = fakeContext();
    const { server, handler } = captureHandler();
    registerCookiesTool(server, fakeSessions(context));
    const res = await handler()({ sessionId: "s", action: "get", urls: ["https://a.com"] });
    expect(calls.cookiesUrls).toEqual(["https://a.com"]);
    expect((res.structuredContent as Record<string, unknown>).cookies).toEqual([
      { name: "sid", value: "1" },
    ]);
    expect(() => cookiesOutputSchema.parse(res.structuredContent)).not.toThrow();
  });

  test("set -> calls addCookies and returns {added}", async () => {
    const { context, calls } = fakeContext();
    const { server, handler } = captureHandler();
    registerCookiesTool(server, fakeSessions(context));
    const cookies = [{ name: "t", value: "v", url: "https://a.com" }];
    const res = await handler()({ sessionId: "s", action: "set", cookies });
    expect(calls.added).toEqual(cookies);
    expect((res.structuredContent as Record<string, unknown>).added).toBe(1);
    expect(() => cookiesOutputSchema.parse(res.structuredContent)).not.toThrow();
  });

  test("clear -> calls clearCookies and returns {cleared}", async () => {
    const { context, calls } = fakeContext();
    const { server, handler } = captureHandler();
    registerCookiesTool(server, fakeSessions(context));
    const res = await handler()({ sessionId: "s", action: "clear" });
    expect(calls.cleared).toBe(1);
    expect((res.structuredContent as Record<string, unknown>).cleared).toBe(true);
    expect(() => cookiesOutputSchema.parse(res.structuredContent)).not.toThrow();
  });

  test("a thrown error becomes a cookies_failed error result", async () => {
    const context = {
      clearCookies: async () => {
        throw new Error("boom");
      },
    } as unknown as BrowserContext;
    const { server, handler } = captureHandler();
    registerCookiesTool(server, fakeSessions(context));
    const res = await handler()({ sessionId: "s", action: "clear" });
    expect(res.isError).toBe(true);
    expect((res.structuredContent as Record<string, unknown>).code).toBe("cookies_failed");
  });
});
