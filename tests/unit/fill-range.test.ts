import { describe, expect, test } from "bun:test";
import type { Locator, Page } from "playwright";
import { clampToStep, fillRange, isRangeInput, sliderKind } from "../../src/actions/fill-range.js";

describe("isRangeInput", () => {
  test("false for a plain element (regression guardrail: text inputs untouched)", async () => {
    const locator = { evaluate: async (fn: (el: unknown) => unknown) => fn({}) } as unknown as Locator;
    expect(await isRangeInput(locator)).toBe(false);
  });

  test("false when evaluate throws (detached element)", async () => {
    const locator = {
      evaluate: async () => {
        throw new Error("detached");
      },
    } as unknown as Locator;
    expect(await isRangeInput(locator)).toBe(false);
  });
});

describe("clampToStep (pure snap/clamp arithmetic, no DOM)", () => {
  test("snaps to the nearest step within bounds", () => {
    expect(clampToStep(0, 100, 10, 47)).toBe(50);
    expect(clampToStep(0, 100, 10, 44)).toBe(40);
  });

  test("clamps above max down to max", () => {
    expect(clampToStep(0, 50, 5, 999)).toBe(50);
  });

  test("clamps below min up to min", () => {
    expect(clampToStep(10, 100, 5, -20)).toBe(10);
  });

  test("falls back to min for a non-finite requested value", () => {
    expect(clampToStep(5, 100, 1, Number.NaN)).toBe(5);
  });

  test("defaults a zero/falsy step to 1", () => {
    expect(clampToStep(0, 10, 0, 7)).toBe(7);
  });
});

describe("sliderKind (single detection pass, never re-detected by fillRange)", () => {
  test("'range' for a native range input, without touching getAttribute", async () => {
    let getAttributeCalled = false;
    const locator = {
      evaluate: async () => true,
      getAttribute: async () => {
        getAttributeCalled = true;
        return null;
      },
    } as unknown as Locator;
    expect(await sliderKind(locator)).toBe("range");
    expect(getAttributeCalled).toBe(false);
  });

  test("'aria' for a role=slider widget", async () => {
    const locator = { evaluate: async () => false, getAttribute: async () => "slider" } as unknown as Locator;
    expect(await sliderKind(locator)).toBe("aria");
  });

  test("null for a plain element (no getAttribute at all — regression guardrail)", async () => {
    const locator = { evaluate: async () => false } as unknown as Locator;
    expect(await sliderKind(locator)).toBeNull();
  });
});

describe("fillRange — keyboard-first success path (no native-setter fallback needed)", () => {
  test("native range: keyboard step moves the value, read back via evaluate", async () => {
    const evalQueue = [{ min: 0, max: 100, step: 5, current: 40 }, "45"];
    let i = 0;
    const presses: string[] = [];
    const locator = {
      focus: async () => {},
      evaluate: async () => evalQueue[i++],
    } as unknown as Locator;
    const page = { keyboard: { press: async (key: string) => void presses.push(key) } } as unknown as Page;
    const result = await fillRange(page, locator, "47", "range");
    expect(presses).toEqual(["ArrowRight"]);
    expect(result).toEqual({ value: "45", reached: true });
  });

  test("role=slider: keyboard step moves aria-valuenow, read back via getAttribute", async () => {
    let now = 5;
    const presses: string[] = [];
    const locator = {
      focus: async () => {},
      getAttribute: async (name: string) => {
        if (name === "aria-valuemin") return "0";
        if (name === "aria-valuemax") return "10";
        if (name === "aria-valuenow") {
          const v = now;
          now = 8;
          return String(v);
        }
        return null;
      },
    } as unknown as Locator;
    const page = { keyboard: { press: async (key: string) => void presses.push(key) } } as unknown as Page;
    const result = await fillRange(page, locator, "8", "aria");
    expect(presses).toEqual(["ArrowRight", "ArrowRight", "ArrowRight"]);
    expect(result).toEqual({ value: "8", reached: true });
  });
});

describe("fillRange — FIX 4-CLOSE: float-step rounding on the native-setter fallback path", () => {
  test('step=0.1, requested "0.3" clamps to a float-noisy target; native-setter read-back "0.3" → reached:true (fails on the old `Number(finalValue) === target` strict-equality code)', async () => {
    const evalQueue: unknown[] = [{ min: 0, max: 1, step: 0.1, current: 0.2 }, "0.3"];
    let i = 0;
    const locator = {
      focus: async () => {
        throw new Error("no focus"); // forces stepSliderByKeyboard -> null -> native-setter fallback
      },
      evaluate: async () => evalQueue[i++],
    } as unknown as Locator;
    const page = { keyboard: { press: async () => {} } } as unknown as Page;
    const result = await fillRange(page, locator, "0.3", "range");
    expect(result).toEqual({ value: "0.3", reached: true });
  });
});
