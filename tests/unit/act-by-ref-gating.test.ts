import { describe, expect, test } from "bun:test";
import type { Locator, Page } from "playwright";
import { actByRef } from "../../src/actions/act-by-ref.js";

/** A ref-resolved locator stub: fixed count, an `evaluate` result queue, and overrides. */
function makeLocator(evalQueue: unknown[], extra: Record<string, unknown> = {}): Locator {
  let i = 0;
  const self = { first: () => self, count: async () => 1, evaluate: async () => evalQueue[i++], ...extra };
  return self as unknown as Locator;
}

function makePage(locator: Locator): Page {
  return { frames: () => [{ locator: () => locator }] } as unknown as Page;
}

describe("actByRef — regression guardrails + new gates", () => {
  test("native <select> still uses selectOption (kind: select, untouched)", async () => {
    let selectedWith: string | undefined;
    const locator = makeLocator([], {
      selectOption: async (v: string) => {
        selectedWith = v;
        return [v];
      },
    });
    const result = await actByRef(makePage(locator), "5", "select", "CH");
    expect(result).toEqual({ type: "select", ok: true, ref: "5", strategy: "ref" });
    expect(selectedWith).toBe("CH");
  });

  test("kind:fill on a plain input still uses locator.fill() (regression guardrail)", async () => {
    let filledWith: string | undefined;
    const locator = makeLocator([false], {
      fill: async (v: string) => {
        filledWith = v;
      },
    });
    const result = await actByRef(makePage(locator), "3", "fill", "Bruno");
    expect(result).toEqual({ type: "fill", ok: true, ref: "3", strategy: "ref" });
    expect(filledWith).toBe("Bruno");
  });

  test("kind:fill on a range input routes through fillRange, keyboard unavailable on stub falls back to native-setter (FIX 4 gate)", async () => {
    const locator = makeLocator([true, { min: 0, max: 100, step: 5, current: 40 }, "45"]);
    const result = await actByRef(makePage(locator), "3", "fill", "47");
    expect(result).toEqual({ type: "fill", ok: true, ref: "3", strategy: "range", value: "45", reached: true });
  });

  test("kind:click routes through robustClick and reports the succeeding rung (FIX 2 gate)", async () => {
    const locator = makeLocator([], { click: async () => {} });
    const result = await actByRef(makePage(locator), "9", "click");
    expect(result).toEqual({ type: "click", ok: true, ref: "9", strategy: "ref", rung: "direct" });
  });
});
