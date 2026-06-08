/**
 * One-shot collect: open a real browser, navigate to `url`, run the infinite-
 * scroll/pagination collect loop, and close — no manual session management.
 * The browser counterpart of a single fetch, for exhausting a listing page.
 * @module agent/collect-run
 */
import { selectEngineForConfig } from "../engine/registry.js";
import { teardownOpened } from "../engine/teardown.js";
import { gotoWithRetry } from "../net/navigate.js";
import { type CollectOptions, type CollectResult, scrollCollect } from "../state/scroll-collect.js";
import type { ResolvedConfig } from "./config.js";

/**
 * Open `url`, drain its list via {@link scrollCollect}, then tear down.
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
    await gotoWithRetry(page, url, { waitUntil: "domcontentloaded", timeout: 30_000 }, config.retry);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    return await scrollCollect(page, opts);
  } finally {
    await teardownOpened(opened);
  }
}
