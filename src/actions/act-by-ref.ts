/**
 * Execute an action on an element referenced by its `data-fuse-ref`
 * (produced by {@link captureSnapshot}). Deterministic counterpart to the
 * text/heuristic targeting of smart-click/smart-fill.
 * @module actions/act-by-ref
 */
import type { Locator, Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";
import { pickAutocomplete } from "./autocomplete.js";
import { dragLocator, hoverLocator } from "./hover-drag.js";
import { refLocator } from "./ref-locator.js";
import { type FilesInput, setFiles } from "./upload.js";

/** Action kinds that can target a snapshot ref. */
export type RefActionKind = "click" | "fill" | "select" | "pick" | "upload" | "hover" | "drag";

/** Snapshot refs are numeric (`"5"` or frame-scoped `"3:4"`); anything else is a CSS selector. */
function isRef(value: string): boolean {
  return /^\d+(:\d+)?$/.test(value);
}

/** Resolve a drag destination: a snapshot ref via {@link refLocator}, else a CSS selector. */
function destLocator(page: Page, to: string): Locator {
  return (isRef(to) ? refLocator(page, to) : null) ?? page.locator(to).first();
}

/**
 * Run `kind` on the element carrying the frame-scoped `ref`.
 *
 * @param page - Active Playwright page.
 * @param ref - Snapshot ref (bare or frame-scoped).
 * @param kind - Action to perform.
 * @param value - Text for fill/select/pick (ignored for click/upload).
 * @param option - Suggestion text for `pick`.
 * @param files - Paths for `upload` (string, CSV string, or array).
 * @param to - Destination ref/selector for `drag` (ref string/number or CSS selector).
 * @returns Action result tagged with the `ref`.
 */
export async function actByRef(
  page: Page,
  ref: string | number,
  kind: RefActionKind,
  value = "",
  option = "",
  files: FilesInput = "",
  to = "",
): Promise<ActionResult> {
  const locator = refLocator(page, ref);
  try {
    if (!locator || (await locator.count()) === 0) {
      return { type: kind, ok: false, ref, error: "ref_not_found" };
    }
    if (kind === "pick") return { ...(await pickAutocomplete(page, locator, value, option)), ref };
    if (kind === "upload") return { ...(await setFiles(locator, files)), ref };
    if (kind === "hover") return { ...(await hoverLocator(locator)), ref };
    if (kind === "drag") {
      return { ...(await dragLocator(locator, destLocator(page, to))), ref, to };
    }
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
