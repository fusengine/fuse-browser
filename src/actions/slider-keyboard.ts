/**
 * Trusted-event keyboard stepping for `<input type=range>` and ARIA
 * `role=slider` widgets (custom widgets only re-render on a real trusted
 * key event, not a synthetic setter+dispatch). Presses in bounded batches,
 * re-reading after each one, so a stalled widget reports an honest
 * undershoot instead of a silent false success.
 * @module actions/slider-keyboard
 */
import type { Locator, Page } from "playwright";

/** Key presses attempted per read-back cycle. */
const BATCH_SIZE = 200;
/** Hard safety cap across all batches, guarding against a pathological range. */
const HARD_PRESS_CAP = 2_000;

/** Outcome of {@link stepSliderByKeyboard}: the element's real final value, and whether it actually reached `target`. */
export interface SliderStepResult {
  value: string;
  reached: boolean;
}

/**
 * Float-tolerant target match (half a step; a tiny epsilon for step<=0) — a
 * strict `===` falsely undershoots when `clampToStep`'s float target
 * (`0.30000000000000004`) meets a string read-back (`"0.3"`); an integer
 * step (`1`) never absorbs a genuinely different integer target.
 */
export function reachedTarget(value: number, target: number, step: number): boolean {
  const tolerance = step > 0 ? step / 2 : 1e-9;
  return Math.abs(value - target) <= tolerance;
}

/** Read the element's current value (native range) or `aria-valuenow` (ARIA slider). */
async function readValue(locator: Locator, isRange: boolean): Promise<string | null> {
  return isRange
    ? await locator.evaluate((el) => (el as unknown as { value: string }).value)
    : await locator.getAttribute("aria-valuenow");
}

/**
 * Focus `locator` and press Arrow keys in batches (Right/Up to increase,
 * Left/Down to decrease), re-reading the value after each batch, until it
 * reaches `target` (within {@link reachedTarget}'s tolerance), stops
 * changing (min/max reached, or the widget ignores the keys), or
 * `HARD_PRESS_CAP` presses have been sent.
 *
 * @param page - Active page (owns the trusted `keyboard.press`).
 * @param locator - The range input or `role=slider` element.
 * @param current - Current numeric value.
 * @param target - Clamped/snapped target value.
 * @param step - Step size (already defaulted to 1 by the caller).
 * @param isRange - True for a native `<input type=range>`, false for `role=slider`.
 * @returns `{ value, reached }` — the real final value, or `null` if the
 *   first batch produced no movement (caller falls back to native-setter).
 */
export async function stepSliderByKeyboard(
  page: Page,
  locator: Locator,
  current: number,
  target: number,
  step: number,
  isRange: boolean,
): Promise<SliderStepResult | null> {
  const size = step || 1;
  if (reachedTarget(current, target, size)) return { value: String(current), reached: true };
  const key = target > current ? "ArrowRight" : "ArrowLeft";
  try {
    await locator.focus();
  } catch {
    return null;
  }
  let last = current;
  let pressed = 0;
  while (pressed < HARD_PRESS_CAP) {
    const remaining = Math.round(Math.abs(target - last) / size);
    if (remaining === 0) break;
    const batch = Math.min(BATCH_SIZE, remaining, HARD_PRESS_CAP - pressed);
    try {
      for (let i = 0; i < batch; i += 1) await page.keyboard.press(key);
    } catch {
      return pressed === 0 ? null : { value: String(last), reached: false };
    }
    pressed += batch;
    let readBack: string | null;
    try {
      readBack = await readValue(locator, isRange);
    } catch {
      return pressed === batch ? null : { value: String(last), reached: false };
    }
    if (readBack === null) return pressed === batch ? null : { value: String(last), reached: false };
    const moved = Number(readBack);
    if (moved === last) {
      return pressed === batch && moved === current ? null : { value: readBack, reached: reachedTarget(moved, target, size) };
    }
    last = moved;
    if (reachedTarget(moved, target, size)) return { value: readBack, reached: true };
  }
  return { value: String(last), reached: false };
}
