/**
 * Human-like behaviors: random pauses.
 * @module actions/human
 */
import type { Page } from "playwright";
import { randInt } from "../lib/text.js";

/** Short random pause to mimic a real user. */
export async function humanPause(page: Page): Promise<void> {
  await page.waitForTimeout(randInt(120, 420));
}
