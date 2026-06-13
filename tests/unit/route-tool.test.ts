import { describe, expect, test } from "bun:test";
import type { BrowserContext, Route } from "playwright";
import { applyRoute } from "../../src/server/tools/route.js";

/** Fake context recording route/unroute calls and replaying a handler. */
function fakeContext() {
  const routes: Array<{ pattern: string; handler: (r: Route) => unknown }> = [];
  const unrouted: string[] = [];
  const context = {
    async route(pattern: string, handler: (r: Route) => unknown): Promise<void> {
      routes.push({ pattern, handler });
    },
    async unroute(pattern: string): Promise<void> {
      unrouted.push(pattern);
    },
  } as unknown as BrowserContext;
  return { context, routes, unrouted };
}

/** Fake Route capturing fulfill/abort. */
function fakeRoute() {
  const calls: { fulfill?: unknown; abort: number } = { abort: 0 };
  const route = {
    async fulfill(opts: unknown): Promise<void> {
      calls.fulfill = opts;
    },
    async abort(): Promise<void> {
      calls.abort += 1;
    },
  } as unknown as Route;
  return { route, calls };
}

describe("applyRoute", () => {
  test("mock installs a route that fulfills with the given options", async () => {
    const { context, routes } = fakeContext();
    await applyRoute(context, "**/api/**", "mock", {
      status: 201,
      body: "{}",
      contentType: "application/json",
    });
    expect(routes).toHaveLength(1);
    expect(routes[0]?.pattern).toBe("**/api/**");
    const { route, calls } = fakeRoute();
    await routes[0]?.handler(route);
    expect(calls.fulfill).toEqual({ status: 201, body: "{}", contentType: "application/json" });
  });

  test("abort installs a route that aborts the request", async () => {
    const { context, routes } = fakeContext();
    await applyRoute(context, "**/track", "abort");
    const { route, calls } = fakeRoute();
    await routes[0]?.handler(route);
    expect(calls.abort).toBe(1);
    expect(calls.fulfill).toBeUndefined();
  });

  test("unroute removes the route and installs nothing", async () => {
    const { context, routes, unrouted } = fakeContext();
    await applyRoute(context, "**/api/**", "unroute");
    expect(unrouted).toEqual(["**/api/**"]);
    expect(routes).toHaveLength(0);
  });
});
