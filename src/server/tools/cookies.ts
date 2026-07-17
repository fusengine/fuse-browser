/**
 * `browser_cookies`: read, set, or clear cookies on a live session's context.
 * Cookies use the Playwright shape ({name,value,domain?,url?,path?,…}); `get`
 * may be filtered by `urls`.
 * @module server/tools/cookies
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BrowserContext } from "playwright";
import { z } from "zod";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, jsonResult } from "../result.js";
import { COOKIES_OUTPUT_SHAPE } from "./cookies-output.js";
import { withSession } from "./with-session.js";

export { COOKIES_OUTPUT_SHAPE } from "./cookies-output.js";

/** A Playwright cookie object as accepted by `context.addCookies()`. */
type CookieInput = Parameters<BrowserContext["addCookies"]>[0][number];

const COOKIE_SCHEMA = z
  .object({
    name: z.string(),
    value: z.string(),
    url: z.string().optional(),
    domain: z.string().optional(),
    path: z.string().optional(),
    expires: z.number().optional(),
    httpOnly: z.boolean().optional(),
    secure: z.boolean().optional(),
    sameSite: z.enum(["Strict", "Lax", "None"]).optional(),
  })
  .passthrough();

/** Run the requested cookie action against `context`. */
async function runAction(
  context: BrowserContext,
  a: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const action = a.action as "get" | "set" | "clear";
  if (action === "set") {
    const cookies = (a.cookies ?? []) as CookieInput[];
    await context.addCookies(cookies);
    return { added: cookies.length };
  }
  if (action === "clear") {
    await context.clearCookies();
    return { cleared: true };
  }
  const urls = a.urls as string[] | undefined;
  return { cookies: await context.cookies(urls) };
}

/** Register `browser_cookies`. */
export function registerCookiesTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_cookies",
    {
      title: "Cookies",
      description:
        "Read, set, or clear cookies on this session's context. `get` returns {cookies} (optionally filtered by `urls`); `set` adds Playwright cookies and returns {added}; `clear` removes all and returns {cleared}.",
      inputSchema: {
        sessionId: z.string(),
        action: z.enum(["get", "set", "clear"]),
        cookies: z.array(COOKIE_SCHEMA).optional(),
        urls: z.array(z.string()).optional(),
      },
      outputSchema: COOKIES_OUTPUT_SHAPE,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        try {
          return jsonResult(await runAction(s.context, a));
        } catch (err) {
          return errorResult(err instanceof Error ? err.message : String(err), "cookies_failed");
        }
      });
    },
  );
}
