/**
 * CDP attach engine: connect to a user's already-running Chromium browser
 * (Chrome, Edge, Dia, Arc, Brave…) started with --remote-debugging-port.
 * Reuses the existing default context and a reliable tab; never closes the
 * user's browser. CDP is Chromium-only (Firefox/WebKit not supported).
 * @module engine/cdp-engine
 */
import type { BrowserContext, Page } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import type { BrowserEngine, OpenedContext } from "../interfaces/engine.js";
import { loadBrowserType } from "./loader.js";

/**
 * Pick a usable page from a freshly-attached context. A just-launched browser
 * may expose a transient about:blank tab that closes during init, or no page at
 * all — so we skip closed pages, briefly wait for one to appear, then fall back
 * to creating a fresh tab.
 */
export async function pickReliablePage(context: BrowserContext): Promise<Page> {
  const open = (): Page | undefined => context.pages().find((p) => !p.isClosed());
  let page = open();
  if (!page) {
    page = await context.waitForEvent("page", { timeout: 3_000 }).catch(() => undefined);
  }
  if (!page || page.isClosed()) page = await context.newPage();
  return page;
}

/** Attach to a running browser over the Chrome DevTools Protocol. */
export async function attachOverCdp(endpoint: string): Promise<OpenedContext> {
  const chromium = await loadBrowserType("playwright");
  const browser = await chromium.connectOverCDP(endpoint, { timeout: 20_000 });
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = await pickReliablePage(context);
  return { context, browser, connected: true, page };
}

/** Engine that attaches to an existing browser via `config.cdpEndpoint`. */
export const cdpEngine: BrowserEngine = {
  name: "cdp",
  async open(config: ResolvedConfig): Promise<OpenedContext> {
    if (!config.cdpEndpoint) {
      throw new Error("cdpEndpoint is required for the CDP attach engine");
    }
    return attachOverCdp(config.cdpEndpoint);
  },
};
