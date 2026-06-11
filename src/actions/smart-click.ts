/**
 * Smart multi-strategy click with heuristic fallback.
 * @module actions/smart-click
 */
import type { Locator, Page } from "playwright";
import { captureSnapshot } from "../extraction/snapshot.js";
import type { ActionResult } from "../interfaces/types.js";
import { evalScriptArg } from "../lib/evaluate.js";
import { escapeRegExp } from "../lib/text.js";
import { healLocator } from "./heal-locator.js";
import { humanPause } from "./human.js";
import { humanMoveTo } from "./human-mouse.js";

const HEURISTIC_CLICK = `(target) => {
  const needle = target.toLowerCase();
  const els = [...document.querySelectorAll('button,a,[role=button],input[type=button],input[type=submit]')];
  const el = els.find(e => (
    (e.innerText || '') + ' ' + (e.value || '') + ' ' + (e.getAttribute('aria-label') || '')
  ).toLowerCase().includes(needle));
  if (!el) return false;
  el.click();
  return true;
}`;

/** Try several locating strategies, ordered by the preferred strategy. */
export async function smartClick(
  page: Page,
  target: string,
  preferredStrategy = "",
  humanMode = false,
): Promise<ActionResult> {
  const rx = new RegExp(escapeRegExp(target), "i");
  const strategies: Array<[string, () => Locator]> = [
    ["selector", () => page.locator(target).first()],
    ["role", () => page.getByRole("button", { name: rx }).first()],
    ["text", () => page.getByText(rx).first()],
    ["label", () => page.getByLabel(rx).first()],
  ];
  if (preferredStrategy) {
    strategies.sort((a, b) => (a[0] === preferredStrategy ? 0 : 1) - (b[0] === preferredStrategy ? 0 : 1));
  }
  let lastError = "not_tried";
  for (const [strategy, factory] of strategies) {
    try {
      const locator = factory();
      if ((await locator.count()) > 0) {
        if (humanMode) {
          await humanPause(page);
          await locator.scrollIntoViewIfNeeded({ timeout: 2_000 });
          await humanMoveTo(page, locator);
          await locator.hover({ timeout: 2_000 });
          await humanPause(page);
        }
        await locator.click({ timeout: 2_000 });
        return { type: "click", target, ok: true, strategy };
      }
    } catch (err) {
      lastError = String(err).split("\n")[0] ?? "error";
    }
  }
  try {
    const healed = await healLocator(page, target, captureSnapshot);
    if (healed) {
      await healed.click({ timeout: 2_000 });
      return { type: "click", target, ok: true, strategy: "heal" };
    }
  } catch (err) {
    lastError = String(err).split("\n")[0] ?? "error";
  }
  try {
    const clicked = await evalScriptArg<boolean, string>(page, HEURISTIC_CLICK, target);
    if (clicked) return { type: "click", target, ok: true, strategy: "heuristic" };
  } catch (err) {
    lastError = String(err).split("\n")[0] ?? "error";
  }
  return { type: "click", target, ok: false, error: lastError };
}
