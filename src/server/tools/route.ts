/**
 * `browser_route`: intercept network requests on a live session — mock a
 * response, abort matching requests, or remove a previously installed route.
 * @module server/tools/route
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BrowserContext, Route } from "playwright";
import { z } from "zod";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Route action: fulfill with a canned response, block, or remove the route. */
export type RouteAction = "mock" | "abort" | "unroute";

/** Options for a `mock` fulfillment (all optional, Playwright defaults apply). */
export interface RouteMock {
  status?: number;
  body?: string;
  contentType?: string;
}

const DESC =
  "Intercept requests matching a glob/URL `pattern` on this session. `mock` fulfills them with a " +
  "canned response (status/body/contentType); `abort` blocks them; `unroute` removes a route set " +
  "earlier with the same pattern. Patterns are Playwright globs, e.g. `**/api/**` or `https://x/*`.";

/**
 * Install or remove a route on a context.
 * @param context - The session browser context.
 * @param pattern - Playwright URL glob to match.
 * @param action - mock, abort, or unroute.
 * @param mock - Response options when action is `mock`.
 */
export async function applyRoute(
  context: BrowserContext,
  pattern: string,
  action: RouteAction,
  mock: RouteMock = {},
): Promise<void> {
  if (action === "unroute") {
    await context.unroute(pattern);
    return;
  }
  if (action === "abort") {
    await context.route(pattern, (r: Route) => {
      void r.abort();
    });
    return;
  }
  await context.route(pattern, (r: Route) => {
    void r.fulfill({ status: mock.status, body: mock.body, contentType: mock.contentType });
  });
}

/** Register `browser_route`. */
export function registerRouteTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_route",
    {
      title: "Mock or block network",
      description: DESC,
      inputSchema: {
        sessionId: z.string(),
        pattern: z.string(),
        action: z.enum(["mock", "abort", "unroute"]),
        status: z.number().optional(),
        body: z.string().optional(),
        contentType: z.string().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const action = a.action as RouteAction;
        await applyRoute(s.context, String(a.pattern), action, {
          status: a.status as number | undefined,
          body: a.body as string | undefined,
          contentType: a.contentType as string | undefined,
        });
        return jsonResult({ routed: String(a.pattern), action });
      });
    },
  );
}
