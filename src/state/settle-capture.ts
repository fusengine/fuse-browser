/**
 * Prepare a page for a full-page screenshot of an animated site: wait for the
 * network to idle, auto-scroll top→bottom to trigger scroll-reveal animations
 * (IntersectionObserver / AOS / whileInView), then return to the top and settle.
 * @module state/settle-capture
 */
import type { Page } from "playwright";
import { evalScript } from "../lib/evaluate.js";
import { sleep } from "../lib/retry.js";

const AUTOSCROLL = `() => new Promise((resolve) => {
  const step = window.innerHeight || 800;
  let y = 0;
  const timer = setInterval(() => {
    window.scrollBy(0, step);
    y += step;
    if (y >= document.body.scrollHeight) {
      clearInterval(timer);
      window.scrollTo(0, 0);
      resolve(true);
    }
  }, 120);
})`;

/** Idle-wait, trigger scroll-reveal animations, return to top, then settle. */
export async function settleForCapture(page: Page, settleMs = 400): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  await evalScript<boolean>(page, AUTOSCROLL).catch(() => false);
  await sleep(settleMs);
}
