/**
 * One-shot collect: open a real browser, navigate to `url`, run the infinite-
 * scroll/pagination collect loop, and close — no manual session management.
 * The browser counterpart of a single fetch, for exhausting a listing page.
 * @module agent/collect-run
 */
import type { Page } from "playwright";
import { selectEngineForConfig } from "../engine/registry.js";
import { teardownOpened } from "../engine/teardown.js";
import { DEFAULT_GOTO, gotoWithRetry } from "../net/navigate.js";
import { type CollectOptions, type CollectResult, scrollCollect } from "../state/scroll-collect.js";
import type { ResolvedConfig } from "./config.js";

/**
 * Navigate `page` to `url` and drain its list via {@link scrollCollect} — the
 * page-level work with no browser lifecycle (so a pool can drive it).
 */
export async function collectOnPage(page: Page, config: ResolvedConfig, url: string, opts: CollectOptions): Promise<CollectResult> {
  await gotoWithRetry(page, url, DEFAULT_GOTO, config.retry);
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  return scrollCollect(page, opts);
}

/**
 * Open `url` in its own browser, drain its list, then tear down.
 *
 * @param config - Resolved browser config (engine, retry, identity…).
 * @param url - Listing/search page to exhaust.
 * @param opts - Collect options (`item` row selector, container, maxSteps…).
 * @returns The collected items + loop stats.
 */
export async function runCollect(config: ResolvedConfig, url: string, opts: CollectOptions): Promise<CollectResult> {
  const opened = await selectEngineForConfig(config).open(config);
  const page = opened.page ?? (await opened.context.newPage());
  try {
    return await collectOnPage(page, config, url, opts);
  } finally {
    await teardownOpened(opened);
  }
}
