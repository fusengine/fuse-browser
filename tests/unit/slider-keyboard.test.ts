import { describe, expect, test } from "bun:test";
import type { Locator, Page } from "playwright";
import { reachedTarget, stepSliderByKeyboard } from "../../src/actions/slider-keyboard.js";

/** A page stub recording every `keyboard.press` key. */
function makePage(): { page: Page; presses: string[] } {
  const presses: string[] = [];
  const page = { keyboard: { press: async (key: string) => void presses.push(key) } } as unknown as Page;
  return { page, presses };
}

describe("stepSliderByKeyboard — press-count math (regression guardrail: normal range untouched by this new path)", () => {
  test("presses ArrowRight round(abs(target-current)/step) times when increasing, native range read-back", async () => {
    const { page, presses } = makePage();
    const locator = { focus: async () => {}, evaluate: async () => "45" } as unknown as Locator;
    const result = await stepSliderByKeyboard(page, locator, 40, 45, 5, true);
    expect(presses).toEqual(["ArrowRight"]);
    expect(result).toEqual({ value: "45", reached: true });
  });

  test("presses ArrowLeft when decreasing", async () => {
    const { page, presses } = makePage();
    const locator = { focus: async () => {}, evaluate: async () => "3" } as unknown as Locator;
    const result = await stepSliderByKeyboard(page, locator, 10, 3, 1, true);
    expect(presses).toEqual(Array(7).fill("ArrowLeft"));
    expect(result).toEqual({ value: "3", reached: true });
  });

  test("role=slider reads back via getAttribute, not evaluate", async () => {
    const { page } = makePage();
    const locator = { focus: async () => {}, getAttribute: async () => "8" } as unknown as Locator;
    const result = await stepSliderByKeyboard(page, locator, 5, 8, 1, false);
    expect(result).toEqual({ value: "8", reached: true });
  });

  test("returns null (caller falls back to native-setter) when the widget ignored the keys", async () => {
    const { page } = makePage();
    const locator = { focus: async () => {}, evaluate: async () => "40" } as unknown as Locator;
    const result = await stepSliderByKeyboard(page, locator, 40, 45, 5, true);
    expect(result).toBeNull();
  });

  test("returns null when focus()/keyboard aren't usable on the element (safe fallback path)", async () => {
    const { page } = makePage();
    const locator = {} as unknown as Locator;
    const result = await stepSliderByKeyboard(page, locator, 40, 45, 5, true);
    expect(result).toBeNull();
  });

  test("no-op (already at target): returns current value without pressing any key", async () => {
    const { page, presses } = makePage();
    const locator = { focus: async () => {}, evaluate: async () => "50" } as unknown as Locator;
    const result = await stepSliderByKeyboard(page, locator, 50, 50, 5, true);
    expect(presses).toEqual([]);
    expect(result).toEqual({ value: "50", reached: true });
  });
});

describe("stepSliderByKeyboard — FIX 4 (SEV-3): honest undershoot instead of a silent ok:true at 200 presses", () => {
  test("stops when a batch produces no read-back change (widget stuck at a boundary) and reports reached:false", async () => {
    const { page, presses } = makePage();
    // Always reports "50": the first batch shows real movement from 0 -> 50
    // (a genuine step), the second batch shows no further movement at all
    // (the widget hit a boundary) — must stop there, not loop forever.
    const locator = { focus: async () => {}, evaluate: async () => "50" } as unknown as Locator;
    const result = await stepSliderByKeyboard(page, locator, 0, 999_999, 1, true);
    expect(presses.length).toBe(400);
    expect(result).toEqual({ value: "50", reached: false });
  });

  test("hard safety cap: a slider that keeps reporting (slow) movement without ever reaching a pathological target stops at 2000 presses, reached:false", async () => {
    const { page, presses } = makePage();
    let value = 0;
    const locator = {
      focus: async () => {},
      evaluate: async () => {
        value += 1;
        return String(value);
      },
    } as unknown as Locator;
    const result = await stepSliderByKeyboard(page, locator, 0, 999_999, 1, true);
    expect(presses.length).toBe(2_000);
    expect(result).toEqual({ value: "10", reached: false });
  });
});

describe("reachedTarget (pure tolerance check)", () => {
  test("integer step stays exact: a genuinely different integer is NOT within tolerance", () => {
    expect(reachedTarget(3, 5, 1)).toBe(false);
    expect(reachedTarget(5, 5, 1)).toBe(true);
  });

  test("float step 0.1: clampToStep's 0.30000000000000004 vs a \"0.3\" read-back is within tolerance", () => {
    expect(reachedTarget(0.3, 0.30000000000000004, 0.1)).toBe(true);
  });
});

describe("stepSliderByKeyboard — FIX 4-CLOSE: float-step rounding must not report a false undershoot", () => {
  test("step=0.1, target=0.30000000000000004 (clampToStep float noise), widget reads back \"0.3\" → reached:true (fails on the old `moved === target` strict-equality code)", async () => {
    const { page } = makePage();
    const locator = { focus: async () => {}, evaluate: async () => "0.3" } as unknown as Locator;
    const result = await stepSliderByKeyboard(page, locator, 0.2, 0.30000000000000004, 0.1, true);
    expect(result).toEqual({ value: "0.3", reached: true });
  });
});
