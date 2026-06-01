/**
 * Wait for real-time stabilization after an action.
 * @module state/realtime
 */
import type { Page } from "playwright";
import { domSignature } from "./dom-signature.js";

/** Recompute the DOM signature, surviving a full navigation. */
async function safeSignature(page: Page): Promise<string> {
  try {
    return await domSignature(page);
  } catch {
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    return domSignature(page);
  }
}

/**
 * Wait until JS mutations settle (2 identical ticks) or the max delay elapses.
 * A full navigation is handled without failing the mission.
 */
export async function waitForRealtimeSettle(
  page: Page,
  totalMs = 2_500,
  intervalMs = 150,
): Promise<void> {
  let last = await safeSignature(page);
  let stableTicks = 0;
  const deadline = Date.now() + totalMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(intervalMs);
    const current = await safeSignature(page);
    if (current === last) {
      stableTicks += 1;
      if (stableTicks >= 2) return;
    } else {
      stableTicks = 0;
      last = current;
    }
  }
}
