/**
 * Smart multi-strategy fill with human-like typing.
 * @module actions/smart-fill
 */
import type { Locator, Page } from "playwright";
import { captureSnapshot } from "../extraction/snapshot.js";
import type { ActionResult } from "../interfaces/types.js";
import { escapeRegExp, randInt } from "../lib/text.js";
import { fillRange, sliderKind } from "./fill-range.js";
import { healLocator } from "./heal-locator.js";
import { humanPause } from "./human.js";

async function humanType(page: Page, locator: Locator, value: string): Promise<void> {
  await humanPause(page);
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 2_000 });
    await locator.hover({ timeout: 2_000 });
    await locator.click({ timeout: 2_000 });
    await page.keyboard.type(value, { delay: randInt(35, 95) });
  } catch {
    // Some composite widgets expose a textbox but intercept pointer events:
    // keep the human attempt, then fall back to a direct fill.
    await locator.fill(value, { timeout: 2_000 });
  }
}

/**
 * Fill a field via selector, label or placeholder, with a preferred strategy.
 * Never diverts to the combobox pick flow — a `fill` always types the
 * literal value; use `kind:"pick"` to select a listbox option instead.
 */
export async function smartFill(
  page: Page,
  target: string,
  value: string,
  preferredStrategy = "",
  humanMode = false,
): Promise<ActionResult> {
  const rx = new RegExp(escapeRegExp(target), "i");
  const strategies: Array<[string, () => Locator]> = [
    ["selector", () => page.locator(target).first()],
    ["label", () => page.getByLabel(rx).first()],
    ["placeholder", () => page.getByPlaceholder(rx).first()],
  ];
  if (preferredStrategy) {
    strategies.sort((a, b) => (a[0] === preferredStrategy ? 0 : 1) - (b[0] === preferredStrategy ? 0 : 1));
  }
  let lastError = "not_tried";
  for (const [strategy, factory] of strategies) {
    try {
      const locator = factory();
      if ((await locator.count()) > 0) {
        const slider = await sliderKind(locator);
        if (slider) {
          const snapped = await fillRange(page, locator, value, slider);
          return { type: "fill", target, ok: snapped.reached, strategy: "range", value: snapped.value, reached: snapped.reached };
        }
        if (humanMode) await humanType(page, locator, value);
        else await locator.fill(value, { timeout: 2_000 });
        return { type: "fill", target, ok: true, strategy };
      }
    } catch (err) {
      lastError = String(err).split("\n")[0] ?? "error";
    }
  }
  try {
    const healed = await healLocator(page, target, captureSnapshot);
    if (healed) {
      const healedSlider = await sliderKind(healed);
      if (healedSlider) {
        const snapped = await fillRange(page, healed, value, healedSlider);
        return { type: "fill", target, ok: snapped.reached, strategy: "range-heal", value: snapped.value, reached: snapped.reached };
      }
      if (humanMode) await humanType(page, healed, value);
      else await healed.fill(value, { timeout: 2_000 });
      return { type: "fill", target, ok: true, strategy: "heal" };
    }
  } catch (err) {
    lastError = String(err).split("\n")[0] ?? "error";
  }
  return { type: "fill", target, ok: false, error: lastError };
}
