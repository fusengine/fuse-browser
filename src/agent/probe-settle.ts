/**
 * Settle helpers for the one-shot probe: a resilient load-state wait and a
 * single re-extraction pass when the first text/title came back empty — the
 * failure mode seen on heavy/consent-gated pages (e.g. Booking) where the DOM
 * was not ready at first extraction.
 * @module agent/probe-settle
 */
import type { Page } from "playwright";
import { mainText } from "../extraction/main-text.js";
import { waitForRealtimeSettle } from "../state/realtime.js";

/**
 * Wait for `networkidle`, falling back to `domcontentloaded` so a perpetually
 * busy page (analytics/websocket traffic) still yields a loaded DOM instead of
 * silently continuing on an empty page after the timeout.
 */
export async function settleLoad(page: Page): Promise<void> {
  await page
    .waitForLoadState("networkidle", { timeout: 8_000 })
    .catch(() => page.waitForLoadState("domcontentloaded").catch(() => {}));
}

/**
 * Re-extract `text` + `title` once when either came back empty: give the page
 * one more settle (domcontentloaded + realtime settle) then read again. No-op
 * when the first pass already produced content.
 *
 * @returns The original values, or the re-read ones when the first were empty.
 */
export async function reExtractIfEmpty(
  page: Page,
  text: string,
  title: string,
): Promise<{ text: string; title: string }> {
  if (text.length > 0 && title.trim().length > 0) return { text, title };
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await waitForRealtimeSettle(page, 4_000).catch(() => {});
  return { text: await mainText(page), title: await page.title() };
}
