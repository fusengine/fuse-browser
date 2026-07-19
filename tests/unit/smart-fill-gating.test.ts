import { describe, expect, test } from "bun:test";
import type { Locator, Page } from "playwright";
import { smartFill } from "../../src/actions/smart-fill.js";

/** A locator stub whose `evaluate` replays a fixed queue of results, in call order. */
function makeQueuedLocator(evalQueue: unknown[], extra: Record<string, unknown> = {}): Locator {
  let i = 0;
  const self = { first: () => self, count: async () => 1, evaluate: async () => evalQueue[i++], ...extra };
  return self as unknown as Locator;
}

describe("smartFill — regression guardrails + new gates", () => {
  test("normal text input still uses plain .fill() (regression guardrail)", async () => {
    let filledWith: string | undefined;
    const locator = makeQueuedLocator([false, false], {
      fill: async (v: string) => {
        filledWith = v;
      },
    });
    const page = { locator: () => locator } as unknown as Page;
    const result = await smartFill(page, "#name", "Bruno");
    expect(result).toEqual({ type: "fill", target: "#name", ok: true, strategy: "selector" });
    expect(filledWith).toBe("Bruno");
  });

  test("routes a range input to fillRange, keyboard unavailable on stub falls back to native-setter (FIX 4 gate)", async () => {
    const locator = makeQueuedLocator([true, { min: 0, max: 100, step: 10, current: 30 }, "50"]);
    const page = { locator: () => locator } as unknown as Page;
    const result = await smartFill(page, "#slider", "47");
    expect(result).toEqual({ type: "fill", target: "#slider", ok: true, strategy: "range", value: "50", reached: true });
  });

  test("element HAS combobox semantics (in-page probe true) — smartFill STILL does a plain .fill(), never diverts to pick (FIX 1 gate)", async () => {
    // On the OLD code this fails: `evalQueue[1]=true` fed the (now-removed)
    // isComboboxTrigger check, diverting to openComboboxAndPick, which throws
    // on this minimal page stub (no getByRole) and returns ok:false.
    let filledWith: string | undefined;
    const locator = makeQueuedLocator([false, true], {
      fill: async (v: string) => {
        filledWith = v;
      },
    });
    const page = { locator: () => locator } as unknown as Page;
    const result = await smartFill(page, "#destination", "Zurich");
    expect(result).toEqual({ type: "fill", target: "#destination", ok: true, strategy: "selector" });
    expect(filledWith).toBe("Zurich");
  });
});
