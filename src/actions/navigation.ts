/**
 * Low-level page interactions: scroll, key press, select, history.
 * @module actions/navigation
 */
import type { Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";

/** Scroll the page by a pixel delta (positive = down/right). */
export async function scroll(page: Page, deltaY: number, deltaX = 0): Promise<ActionResult> {
  await page.mouse.wheel(deltaX, deltaY);
  return { type: "scroll", ok: true, deltaX, deltaY };
}

/** Press a key or shortcut (e.g. "Enter", "ArrowDown", "Control+a"). */
export async function pressKey(page: Page, key: string): Promise<ActionResult> {
  try {
    await page.keyboard.press(key);
    return { type: "press", ok: true, key };
  } catch (err) {
    return { type: "press", ok: false, key, error: String(err).split("\n")[0] ?? "error" };
  }
}

/** Select option(s) in a <select> by value, label or index. */
export async function selectOption(
  page: Page,
  target: string,
  value: string,
): Promise<ActionResult> {
  try {
    const selected = await page.locator(target).first().selectOption(value, { timeout: 5_000 });
    return { type: "select", ok: selected.length > 0, target, selected };
  } catch (err) {
    return { type: "select", ok: false, target, error: String(err).split("\n")[0] ?? "error" };
  }
}

/** Go back or forward in session history. */
export async function navigateHistory(
  page: Page,
  direction: "back" | "forward",
): Promise<ActionResult> {
  const response =
    direction === "back"
      ? await page.goBack({ waitUntil: "domcontentloaded", timeout: 20_000 })
      : await page.goForward({ waitUntil: "domcontentloaded", timeout: 20_000 });
  return { type: direction, ok: response !== null, url: page.url() };
}
