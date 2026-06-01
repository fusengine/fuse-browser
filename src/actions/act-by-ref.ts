/**
 * Execute an action on an element referenced by its `data-fuse-ref`
 * (produced by {@link captureSnapshot}). Deterministic counterpart to the
 * text/heuristic targeting of smart-click/smart-fill.
 * @module actions/act-by-ref
 */
import type { Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";
import { pickAutocomplete } from "./autocomplete.js";
import { refLocator } from "./ref-locator.js";

/** Action kinds that can target a snapshot ref. */
export type RefActionKind = "click" | "fill" | "select" | "pick";

/** Run `kind` on the element carrying the frame-scoped `ref`. */
export async function actByRef(
  page: Page,
  ref: string | number,
  kind: RefActionKind,
  value = "",
  option = "",
): Promise<ActionResult> {
  const locator = refLocator(page, ref);
  try {
    if (!locator || (await locator.count()) === 0) {
      return { type: kind, ok: false, ref, error: "ref_not_found" };
    }
    if (kind === "pick") return { ...(await pickAutocomplete(page, locator, value, option)), ref };
    if (kind === "click") {
      await locator.click({ timeout: 5_000 });
    } else if (kind === "fill") {
      await locator.fill(value, { timeout: 5_000 });
    } else {
      await locator.selectOption(value, { timeout: 5_000 });
    }
    return { type: kind, ok: true, ref, strategy: "ref" };
  } catch (err) {
    return { type: kind, ok: false, ref, error: String(err).split("\n")[0] ?? "error" };
  }
}
