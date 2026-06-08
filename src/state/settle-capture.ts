/**
 * Prepare a page for a full-page screenshot of an animated site: idle-wait,
 * auto-scroll top→bottom (re-measuring the growing document) to trigger
 * scroll-reveal animations and lazy media, wait for late network + fonts/images,
 * then return to the top and settle.
 * @module state/settle-capture
 */
import type { Page } from "playwright";
import { evalScript } from "../lib/evaluate.js";
import { sleep } from "../lib/retry.js";

const AUTOSCROLL = `() => new Promise((resolve) => {
  const maxH = () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  const step = Math.max(200, Math.floor((window.innerHeight || 800) * 0.85));
  let y = 0, idle = 0, guard = 0;
  const timer = setInterval(() => {
    window.scrollTo(0, y); y += step; guard += 1;
    if (y >= maxH()) idle += 1;
    if (idle >= 2 || guard > 60) { clearInterval(timer); window.scrollTo(0, 0); resolve(true); }
  }, 150);
})`;

const AWAIT_MEDIA = `() => {
  const imgs = Array.from(document.images).filter((i) => !i.complete).map((i) => new Promise((r) => {
    i.addEventListener('load', r, { once: true });
    i.addEventListener('error', r, { once: true });
  }));
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const all = Promise.all([fonts, ...imgs]).then(() => true);
  return Promise.race([all, new Promise((r) => setTimeout(() => r(true), 5000))]);
}`;

const SCROLLJACK = `() =>
  Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) <= (window.innerHeight || 0) * 1.2`;

/** Idle-wait, trigger scroll-reveal + lazy media, await fonts/images, then settle. */
export async function settleForCapture(page: Page, settleMs = 400): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  await evalScript<boolean>(page, AUTOSCROLL).catch(() => false);
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  await evalScript<boolean>(page, AWAIT_MEDIA).catch(() => false);
  await sleep(settleMs);
}

/**
 * True when the document is ~one viewport tall (scroll-jacked / canvas-driven):
 * `fullPage` can only capture the hero, so callers can flag the shot as partial.
 */
export function detectScrollJack(page: Page): Promise<boolean> {
  return evalScript<boolean>(page, SCROLLJACK).catch(() => false);
}
