/**
 * A warm browser pool for batch work: launch ONE browser (server-backed), hand
 * each task a fresh isolated context (cheap) instead of cold-launching a browser
 * per URL. Patchright stealth is browser-level so every context inherits it.
 * The browser runs as a launchServer process so {@link BrowserPool.close} can
 * force-kill it if a graceful close stalls — no zombie Chromium on a loaded
 * host. Falls back to a full per-task open for non-poolable configs (persistent
 * `userDataDir`, CDP attach).
 * @module engine/browser-pool
 */
import type { Browser, BrowserServer, Page } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import { closeServerHardened } from "./close-server.js";
import { launchServerAndConnect, newConfiguredContext } from "./launch.js";
import { loadBrowserType } from "./loader.js";
import { selectEngineForConfig } from "./registry.js";
import { teardownOpened } from "./teardown.js";

/** Run batch tasks on a shared warm browser, one fresh context per task. */
export class BrowserPool {
  readonly #config: ResolvedConfig;
  /** Poolable only when a real browser with multiple contexts is possible. */
  readonly #poolable: boolean;
  #browser: Browser | null = null;
  #browserP: Promise<Browser> | null = null;
  /** The launchServer process behind the warm browser, killable on stalled close. */
  #server: BrowserServer | null = null;

  constructor(config: ResolvedConfig) {
    this.#config = config;
    this.#poolable = !config.userDataDir && !config.cdpEndpoint;
  }

  /** Lazily launch (once) the shared server-backed browser; callers share one promise. */
  #warmBrowser(): Promise<Browser> {
    this.#browserP ??= (async () => {
      const browserType = await loadBrowserType(this.#config.engine);
      const { server, browser } = await launchServerAndConnect(browserType, this.#config);
      this.#server = server;
      this.#browser = browser;
      return browser;
    })();
    return this.#browserP;
  }

  /**
   * Run `fn` with a fresh page in its own isolated context. The context is closed
   * after `fn`; the shared browser stays warm for the next task.
   *
   * @param fn - Task receiving a ready page.
   * @returns Whatever `fn` returns.
   */
  async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    if (!this.#poolable) {
      const opened = await selectEngineForConfig(this.#config).open(this.#config);
      const page = opened.page ?? (await opened.context.newPage());
      try {
        return await fn(page);
      } finally {
        await teardownOpened(opened);
      }
    }
    const browser = await this.#warmBrowser();
    const context = await newConfiguredContext(browser, this.#config);
    const page = await context.newPage();
    try {
      return await fn(page);
    } finally {
      await context.close().catch(() => {});
    }
  }

  /**
   * Close the shared browser (no-op if never warmed or non-poolable). Closes the
   * server gracefully, force-killing its process if the close stalls so no zombie
   * Chromium is left behind.
   */
  async close(): Promise<void> {
    if (this.#server) await closeServerHardened(this.#server);
    else if (this.#browser) await this.#browser.close().catch(() => {});
    this.#server = null;
    this.#browser = null;
    this.#browserP = null;
  }
}
