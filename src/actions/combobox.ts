/**
 * ARIA combobox interaction: a click-to-open combobox/listbox only renders
 * its options after a click, so a plain `fill`/`pick` on the display element
 * silently no-ops or throws. This clicks the trigger, waits for the
 * listbox/option(s) to appear, then selects the matching option.
 * @module actions/combobox
 */
import type { Locator, Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";
import { escapeRegExp } from "../lib/text.js";
import { robustClick } from "./robust-click.js";

/**
 * Minimal duck-typed shape of a DOM element as seen inside `locator.evaluate()`.
 * This tsconfig has no `dom` lib, so `Element` isn't declared — matching this
 * codebase's existing convention of untyped/string-based evaluate scripts.
 */
interface RoleElement {
  getAttribute(name: string): string | null;
  parentElement: RoleElement | null;
}

/**
 * True when `locator` — or one of its up-to-2 ancestors — exposes a
 * combobox/listbox ARIA role or `aria-haspopup`. Checked in-page so plain
 * inputs, `<select>` and buttons are never misidentified.
 */
export async function isComboboxTrigger(locator: Locator): Promise<boolean> {
  return locator
    .evaluate((el) => {
      let node = el as unknown as RoleElement | null;
      for (let i = 0; i <= 2 && node; i += 1) {
        const role = node.getAttribute("role");
        const popup = node.getAttribute("aria-haspopup");
        if (role === "combobox" || role === "listbox" || popup === "listbox" || popup === "true") return true;
        node = node.parentElement;
      }
      return false;
    })
    .catch(() => false);
}

/**
 * Click `trigger` to open its combobox, type `searchText` (many comboboxes —
 * booking/airport pickers, and any type-to-filter ARIA combobox — only
 * populate their listbox on a real keystroke `input` event, not on click
 * alone; a non-editable trigger just ignores the keystrokes), wait for the
 * listbox (or first option) to appear, then click the option matching
 * `optionName` (falling back to a plain text match when no ARIA `option`
 * role is rendered).
 */
export async function openComboboxAndPick(
  page: Page,
  trigger: Locator,
  searchText: string,
  optionName = searchText,
): Promise<ActionResult> {
  let stage = "trigger";
  const clicked = await robustClick(page, trigger, 5_000);
  if (!clicked.ok) {
    return { type: "pick", ok: false, strategy: "combobox", stage, value: searchText, error: clicked.error ?? "click_failed" };
  }
  const rung = clicked.rung;
  try {
    await trigger.fill("").catch(() => {});
    await trigger.pressSequentially(searchText, { delay: 30, timeout: 5_000 }).catch(() => {});
    stage = "listbox";
    try {
      await page.getByRole("listbox").first().waitFor({ state: "visible", timeout: 5_000 });
    } catch {
      stage = "option";
      await page.getByRole("option").first().waitFor({ state: "visible", timeout: 5_000 });
    }
    const rx = new RegExp(escapeRegExp(optionName), "i");
    let choice = page.getByRole("option", { name: rx }).first();
    if ((await choice.count()) === 0) {
      stage = "text-fallback";
      choice = page.getByText(rx).first();
    }
    await choice.waitFor({ state: "visible", timeout: 5_000 });
    const label = (await choice.textContent())?.trim().slice(0, 80) ?? "";
    await choice.click({ timeout: 5_000 });
    return { type: "pick", ok: true, strategy: "combobox", stage, value: searchText, option: label, rung };
  } catch (err) {
    return { type: "pick", ok: false, strategy: "combobox", stage, value: searchText, error: String(err).split("\n")[0] ?? "error" };
  }
}
