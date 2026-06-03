/**
 * CDP attach engine: connect to an already-running Chromium browser — a user's
 * local browser (--remote-debugging-port) or a remote endpoint (Browserless,
 * ws/wss). Local attach reuses the user's context and never closes it. A remote
 * endpoint gets a fresh identity-configured context, optional auth headers, and
 * is closed on teardown when `cdpCloseOnDone`. CDP is Chromium-only.
 * @module engine/cdp-engine
 */
import type { BrowserContext, Page } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import type { BrowserEngine, OpenedContext } from "../interfaces/engine.js";
import { assertCdpEndpoint, isRemoteCdp } from "./cdp-url.js";
import { buildContextOptions } from "./context.js";
import { loadBrowserType } from "./loader.js";
import { applyStealthInit } from "./stealth-init.js";

/**
 * Pick a usable page from a freshly-attached context. A just-launched browser
 * may expose a transient about:blank tab that closes during init, or no page at
 * all — so we skip closed pages, briefly wait for one, then create a fresh tab.
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

/**
 * Attach to a running browser over the Chrome DevTools Protocol. Remote (ws/wss)
 * endpoints get a fresh identity context + stealth re-injection and are flagged
 * for close-on-done; local attaches reuse the user's context untouched.
 */
export async function attachOverCdp(config: ResolvedConfig): Promise<OpenedContext> {
  const endpoint = config.cdpEndpoint as string;
  assertCdpEndpoint(endpoint);
  const chromium = await loadBrowserType("playwright");
  const browser = await chromium.connectOverCDP(endpoint, {
    timeout: config.cdpTimeoutMs,
    headers: config.cdpHeaders ?? undefined,
  });
  const remote = isRemoteCdp(endpoint);
  const context = remote
    ? await browser.newContext(buildContextOptions(config.identity, config.realisticProfile))
    : (browser.contexts()[0] ?? (await browser.newContext()));
  if (config.realisticProfile) await applyStealthInit(context, config.identity);
  const page = await pickReliablePage(context);
  const closeOnDone = remote && config.cdpCloseOnDone;
  return { context, browser, connected: !closeOnDone, page };
}

/** Engine that attaches to an existing browser via `config.cdpEndpoint`. */
export const cdpEngine: BrowserEngine = {
  name: "cdp",
  async open(config: ResolvedConfig): Promise<OpenedContext> {
    if (!config.cdpEndpoint) {
      throw new Error("cdpEndpoint is required for the CDP attach engine");
    }
    return attachOverCdp(config);
  },
};
