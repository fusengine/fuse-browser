/**
 * Autocomplete / combobox "pick": type a value, wait for the suggestion
 * dropdown, then click the matching option. Handles airport/city pickers where
 * filling alone never commits the selection (the form stays empty/disabled).
 * @module actions/autocomplete
 */
import type { Locator, Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";

/** Type `value` into `locator`, wait for a suggestion, click the best match. */
export async function pickAutocomplete(
  page: Page,
  locator: Locator,
  value: string,
  option = "",
): Promise<ActionResult> {
  const wanted = option || value;
  try {
    await locator.click({ timeout: 5_000 });
    await locator.fill("", { timeout: 5_000 });
    await locator.pressSequentially(value, { delay: 30, timeout: 5_000 });
    const named = page.getByRole("option", { name: wanted }).first();
    let choice = named;
    try {
      await named.waitFor({ state: "visible", timeout: 6_000 });
    } catch {
      choice = page.getByRole("option").first();
      await choice.waitFor({ state: "visible", timeout: 4_000 });
    }
    const label = (await choice.textContent())?.trim().slice(0, 80) ?? "";
    await choice.click({ timeout: 5_000 });
    return { type: "pick", ok: true, strategy: "autocomplete", value, option: label };
  } catch (err) {
    return { type: "pick", ok: false, value, error: String(err).split("\n")[0] ?? "error" };
  }
}
