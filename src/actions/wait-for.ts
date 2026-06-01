/**
 * Semantic waits: wait for a condition (text/selector/url/gone) instead of a
 * fixed delay. Essential for reliable agentic loops on slow pages and SPAs.
 * @module actions/wait-for
 */
import type { Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";

/**
 * A semantic wait condition. Set one field; if several are set they are
 * evaluated in priority order: text > selector > gone > urlContains.
 */
export interface WaitCondition {
  text?: string;
  selector?: string;
  urlContains?: string;
  gone?: string;
  timeoutMs?: number;
}

/** Wait until the condition holds; returns ok=false on timeout. */
export async function waitForCondition(page: Page, cond: WaitCondition): Promise<ActionResult> {
  const timeout = cond.timeoutMs ?? 15_000;
  try {
    if (cond.text !== undefined) {
      await page.getByText(cond.text).first().waitFor({ state: "visible", timeout });
      return { type: "wait_for", ok: true, condition: "text", value: cond.text };
    }
    if (cond.selector !== undefined) {
      await page.locator(cond.selector).first().waitFor({ state: "visible", timeout });
      return { type: "wait_for", ok: true, condition: "selector", value: cond.selector };
    }
    if (cond.gone !== undefined) {
      await page.locator(cond.gone).first().waitFor({ state: "hidden", timeout });
      return { type: "wait_for", ok: true, condition: "gone", value: cond.gone };
    }
    if (cond.urlContains !== undefined) {
      const needle = cond.urlContains;
      await page.waitForURL((url) => url.href.includes(needle), { timeout });
      return { type: "wait_for", ok: true, condition: "urlContains", value: needle };
    }
    return { type: "wait_for", ok: false, error: "no_condition_provided" };
  } catch (err) {
    return { type: "wait_for", ok: false, error: String(err).split("\n")[0] ?? "timeout" };
  }
}
