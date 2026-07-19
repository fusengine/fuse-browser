/**
 * Low-level DOM read/write for slider-like elements: native
 * `<input type="range">` and ARIA `role="slider"` custom widgets.
 * Split out of `fill-range.ts` to keep each file under the SRP line limit.
 * @module actions/slider-state
 */
import type { Locator } from "playwright";

/**
 * Minimal duck-typed shape of an `<input>` as seen inside `locator.evaluate()`.
 * This tsconfig has no `dom` lib (Node-only `lib`), so DOM interfaces like
 * `HTMLInputElement`/`Element`/`window` aren't declared — matching this
 * codebase's existing convention of untyped/string-based evaluate scripts.
 */
export interface InputLike {
  tagName: string;
  type: string;
  min: string;
  max: string;
  step: string;
  value: string;
  dispatchEvent(event: unknown): void;
}

/** True when `locator` resolves to an `<input type="range">` element. */
export async function isRangeInput(locator: Locator): Promise<boolean> {
  return locator
    .evaluate((el) => {
      const node = el as unknown as InputLike;
      return node.tagName === "INPUT" && node.type === "range";
    })
    .catch(() => false);
}

/** Read `min`/`max`/`step`/current `value` off a native range input. */
export async function readRangeState(locator: Locator) {
  return locator.evaluate((el) => {
    const node = el as unknown as InputLike;
    return {
      min: Number(node.min || 0),
      max: Number(node.max || 100),
      step: Number(node.step || 1),
      current: Number(node.value || 0),
    };
  });
}

/** Read `aria-valuemin`/`aria-valuemax`/`aria-valuenow` off a `role="slider"` widget (step defaults to 1). */
export async function readAriaSliderState(locator: Locator) {
  const [min, max, now] = await Promise.all([
    locator.getAttribute("aria-valuemin"),
    locator.getAttribute("aria-valuemax"),
    locator.getAttribute("aria-valuenow"),
  ]);
  return { min: Number(min ?? 0), max: Number(max ?? 100), step: 1, current: Number(now ?? 0) };
}

/** Native-setter/attribute fallback when trusted keyboard stepping didn't move the value. */
export async function fallbackNativeSet(locator: Locator, isRange: boolean, target: number): Promise<string> {
  if (isRange) {
    return locator.evaluate((el, v) => {
      const node = el as unknown as InputLike;
      const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), "value") as
        | { set?: (value: string) => void }
        | undefined;
      desc?.set?.call(node, String(v));
      node.dispatchEvent(new Event("input", { bubbles: true }));
      node.dispatchEvent(new Event("change", { bubbles: true }));
      return node.value;
    }, target);
  }
  return locator.evaluate((el, v) => {
    const node = el as unknown as {
      setAttribute(n: string, val: string): void;
      getAttribute(n: string): string | null;
      dispatchEvent(e: unknown): void;
    };
    node.setAttribute("aria-valuenow", String(v));
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    return node.getAttribute("aria-valuenow") ?? String(v);
  }, target);
}
