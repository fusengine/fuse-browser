/**
 * Browser-free fakes for tabs unit tests: a context whose pages are plain
 * objects exposing only the surface session/tabs touches.
 * @module tests/unit/helpers/fake-tabs
 */
import type { Page } from "playwright";
import { resolveConfig } from "../../../src/agent/config.js";
import type { SessionData } from "../../../src/session/session.js";

/** Listener names registered per fake page (to assert no handler stacking). */
export const handlersOf = new WeakMap<Page, string[]>();

/** A fake context, its page factory, live page list and goto failure switch. */
export interface FakeCtx {
  ctx: { pages: () => Page[]; newPage: () => Promise<Page> };
  addPage: (url: string, failGoto?: boolean) => Page;
  pages: Page[];
  /** Make pages spawned by `newPage` reject their `goto` with "boom". */
  setNewPageGotoFails: (fail: boolean) => void;
}

/** Build a fake BrowserContext over plain in-memory pages. */
export function makeCtx(): FakeCtx {
  const pages: Page[] = [];
  const state = { failGoto: false };
  function addPage(url: string, failGoto = false): Page {
    let current = url;
    const handlers: string[] = [];
    const page = {
      url: () => current,
      title: async () => `t:${current}`,
      on: (ev: string) => handlers.push(ev),
      bringToFront: async () => {},
      goto: async (u: string) => {
        if (failGoto) throw new Error("boom");
        current = u;
        return { status: () => 200, headers: () => ({}) };
      },
      close: async () => {
        pages.splice(pages.indexOf(page as unknown as Page), 1);
      },
      mainFrame: () => null,
    } as unknown as Page;
    handlersOf.set(page, handlers);
    pages.push(page);
    return page;
  }
  const ctx = { pages: () => pages, newPage: async () => addPage("about:blank", state.failGoto) };
  return { ctx, addPage, pages, setNewPageGotoFails: (fail) => (state.failGoto = fail) };
}

/** Fake tabs session plus its context handles (mirrors openSession bookkeeping). */
export interface FakeTabsSession extends Omit<FakeCtx, "ctx"> {
  session: SessionData;
}

/** Build a session over a fake context with one tab on https://a.example/. */
export function makeSession(): FakeTabsSession {
  const { ctx, addPage, pages, setNewPageGotoFails } = makeCtx();
  const page = addPage("https://a.example/");
  const session = {
    id: "s1",
    context: ctx,
    browser: null,
    page,
    config: resolveConfig({}),
    logs: { network: [], console: [] },
    connected: true,
    health: "ok",
    lastUrl: "https://a.example/",
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
  } as unknown as SessionData;
  return { session, addPage, pages, setNewPageGotoFails };
}
