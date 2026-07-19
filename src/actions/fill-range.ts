/**
 * Slider fill for `<input type="range">` AND ARIA `role="slider"` widgets.
 * Playwright's `locator.fill()` sets `.value` then asserts a strict string
 * round-trip (Playwright 1.61 `injectedScript.ts`: `range` is in
 * `kInputTypesToSetValue`); a native range input clamps/snaps to
 * `min`/`max`/`step`, so the post-clamp value never equals the raw input and
 * the assertion throws `"Malformed value"`. Custom slider widgets (e.g. a
 * bucketed `role=slider`) only re-render on a real trusted key event, so a
 * synthetic setter+dispatch is silently ignored. This clamps+snaps the target
 * in Node (pure, unit-tested), PREFERS trusted keyboard stepping
 * ({@link stepSliderByKeyboard}), and falls back to the native-setter +
 * dispatch path only if the keyboard step didn't move the value.
 * @module actions/fill-range
 */
import type { Locator, Page } from "playwright";
import { reachedTarget, stepSliderByKeyboard } from "./slider-keyboard.js";
import { fallbackNativeSet, isRangeInput, readAriaSliderState, readRangeState } from "./slider-state.js";

export { isRangeInput } from "./slider-state.js";

/** Which slider flavor `locator` resolves to, or `null` for neither. */
export type SliderKind = "range" | "aria" | null;

/**
 * Detect a native range input OR ARIA `role="slider"` widget in ONE
 * detection pass. Callers pass the result straight into {@link fillRange}
 * so the kind is never re-detected (no duplicate DOM round-trip).
 * `getAttribute` resolving `null` means "attribute absent" (not an error);
 * the catch here only guards a genuinely rejected/thrown lookup.
 */
export async function sliderKind(locator: Locator): Promise<SliderKind> {
  if (await isRangeInput(locator)) return "range";
  try {
    return (await locator.getAttribute("role")) === "slider" ? "aria" : null;
  } catch {
    return null;
  }
}

/** Clamp+snap `value` to `min..max` on `step` increments (pure — no DOM). */
export function clampToStep(min: number, max: number, step: number, value: number): number {
  const s = step || 1;
  const n = Number.isFinite(value) ? value : min;
  const steps = Math.round((n - min) / s);
  return Math.min(max, Math.max(min, min + steps * s));
}

/**
 * Clamp+snap `value` to the slider's bounds, PREFER trusted keyboard
 * stepping (custom widgets only re-render on real key events), and fall
 * back to the native-setter/attribute path if the keyboard step didn't move it.
 *
 * @param page - Active page (keyboard events are dispatched via `page.keyboard`).
 * @param locator - Locator resolved to the range input or `role=slider` element.
 * @param value - Requested value (parsed as a number; invalid falls back to `min`).
 * @param kind - Result of a prior {@link sliderKind} call (never re-detected here).
 * @returns The element's real final value and whether it actually reached the
 *   clamped target (within {@link reachedTarget}'s tolerance) — never claim
 *   success on a genuine undershot value.
 */
export async function fillRange(
  page: Page,
  locator: Locator,
  value: string,
  kind: "range" | "aria",
): Promise<{ value: string; reached: boolean }> {
  const isRange = kind === "range";
  const state = isRange ? await readRangeState(locator) : await readAriaSliderState(locator);
  const target = clampToStep(state.min, state.max, state.step, Number(value));
  const stepped = await stepSliderByKeyboard(page, locator, state.current, target, state.step, isRange);
  if (stepped) return stepped;
  const finalValue = await fallbackNativeSet(locator, isRange, target);
  return { value: finalValue, reached: reachedTarget(Number(finalValue), target, state.step) };
}
