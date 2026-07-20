/**
 * Low-level page interactions: scroll, key press, select, history.
 * @module actions/navigation
 */
import type { Page } from "playwright";
import { SCROLL_SCRIPT } from "../extraction/scroll-script.js";
import type { ActionResult } from "../interfaces/types.js";
import { evalScriptArg } from "../lib/evaluate.js";

/** Geometry returned by the in-page container scroll. */
interface ScrollGeo {
  found: boolean;
  scrollTop?: number;
  moved?: number;
  atEnd?: boolean;
}

/** Optional scroll target: a specific container and/or jump to its end. */
export interface ScrollOpts {
  selector?: string;
  to?: "end";
}

/**
 * Scroll by a pixel delta (window, positive = down/right). With `selector` or
 * `to:"end"`, scroll the matching (or auto-detected) scrollable container.
 */
export async function scroll(
  page: Page,
  deltaY: number,
  deltaX = 0,
  opts: ScrollOpts = {},
): Promise<ActionResult> {
  if (opts.selector || opts.to === "end") {
    const arg = { selector: opts.selector ?? null, to: opts.to ?? null, delta: deltaY };
    const geo = await evalScriptArg<ScrollGeo, typeof arg>(page, SCROLL_SCRIPT, arg);
    return { type: "scroll", ok: geo.found, deltaY, selector: opts.selector ?? null, scrollTop: geo.scrollTop, atEnd: geo.atEnd };
  }
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

/**
 * Type text into whatever element currently has focus — no ref/locator
 * needed. For targets a locator can't reach (e.g. a closed shadow-DOM input):
 * click the field first (`browser_click`), then call this.
 */
export async function typeText(page: Page, text: string): Promise<ActionResult> {
  try {
    await page.keyboard.type(text, { delay: 20 });
    return { type: "type", ok: true, text };
  } catch (err) {
    return { type: "type", ok: false, text, error: String(err).split("\n")[0] ?? "error" };
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
