/**
 * A warm browser pool for batch work: launch ONE browser, hand each task a fresh
 * isolated context (cheap) instead of cold-launching a browser per URL. Patchright
 * stealth is browser-level so every context inherits it. Falls back to a full
 * per-task open for non-poolable configs (persistent `userDataDir`, CDP attach).
 * @module engine/browser-pool
 */
import type { Browser, Page } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import { newConfiguredContext } from "./launch.js";
import { selectEngineForConfig } from "./registry.js";
import { teardownOpened } from "./teardown.js";

/** Run batch tasks on a shared warm browser, one fresh context per task. */
export class BrowserPool {
  readonly #config: ResolvedConfig;
  /** Poolable only when a real browser with multiple contexts is possible. */
  readonly #poolable: boolean;
  #browser: Browser | null = null;
  #browserP: Promise<Browser> | null = null;

  constructor(config: ResolvedConfig) {
    this.#config = config;
    this.#poolable = !config.userDataDir && !config.cdpEndpoint;
  }

  /** Lazily launch (once) the shared browser; concurrent callers share one promise. */
  #warmBrowser(): Promise<Browser> {
    this.#browserP ??= (async () => {
      const opened = await selectEngineForConfig(this.#config).open(this.#config);
      await opened.context.close().catch(() => {}); // discard the throwaway context
      if (!opened.browser) throw new Error("BrowserPool requires a launched browser");
      this.#browser = opened.browser;
      return opened.browser;
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

  /** Close the shared browser (no-op if never warmed or non-poolable). */
  async close(): Promise<void> {
    if (this.#browser) await this.#browser.close().catch(() => {});
    this.#browser = null;
    this.#browserP = null;
  }
}
