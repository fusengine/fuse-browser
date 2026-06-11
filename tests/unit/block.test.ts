import { describe, expect, test } from "bun:test";
import type { BrowserContext, Route } from "playwright";
import { applyResourceBlocking } from "../../src/net/block.js";

type RouteHandler = (route: Route) => unknown;

/** Minimal typed BrowserContext mock capturing route registrations. */
function mockContext(): { context: BrowserContext; patterns: unknown[]; handlers: RouteHandler[] } {
  const patterns: unknown[] = [];
  const handlers: RouteHandler[] = [];
  const context = {
    route: async (pattern: unknown, handler: RouteHandler) => {
      patterns.push(pattern);
      handlers.push(handler);
    },
  } as unknown as BrowserContext;
  return { context, patterns, handlers };
}

/** Minimal typed Route mock recording abort/fallback calls. */
function mockRoute(resourceType: string): { route: Route; calls: string[] } {
  const calls: string[] = [];
  const route = {
    request: () => ({ resourceType: () => resourceType }),
    abort: async () => {
      calls.push("abort");
    },
    fallback: async () => {
      calls.push("fallback");
    },
  } as unknown as Route;
  return { route, calls };
}

describe("applyResourceBlocking", () => {
  test("aborts blocked types, falls back otherwise", async () => {
    const { context, patterns, handlers } = mockContext();
    await applyResourceBlocking(context, ["image", "font"]);
    expect(patterns).toEqual(["**/*"]);
    const handler = handlers[0] as RouteHandler;

    const img = mockRoute("image");
    await handler(img.route);
    expect(img.calls).toEqual(["abort"]);

    const doc = mockRoute("document");
    await handler(doc.route);
    expect(doc.calls).toEqual(["fallback"]);
  });

  test("type matching is case-insensitive", async () => {
    const { context, handlers } = mockContext();
    await applyResourceBlocking(context, ["Image"]);
    const img = mockRoute("image");
    await (handlers[0] as RouteHandler)(img.route);
    expect(img.calls).toEqual(["abort"]);
  });

  test("unknown types are ignored; nothing valid installs no route", async () => {
    const { context, handlers } = mockContext();
    await applyResourceBlocking(context, ["images", "gif", "bogus"]);
    expect(handlers).toHaveLength(0);
  });

  test("unknown types mixed with valid ones do not block extra traffic", async () => {
    const { context, handlers } = mockContext();
    await applyResourceBlocking(context, ["bogus", "media"]);
    const media = mockRoute("media");
    const xhr = mockRoute("xhr");
    const handler = handlers[0] as RouteHandler;
    await handler(media.route);
    await handler(xhr.route);
    expect(media.calls).toEqual(["abort"]);
    expect(xhr.calls).toEqual(["fallback"]);
  });
});
