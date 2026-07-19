import { describe, expect, test } from "bun:test";
import type { Locator, Page } from "playwright";
import { isComboboxTrigger, openComboboxAndPick } from "../../src/actions/combobox.js";

describe("isComboboxTrigger", () => {
  test("true for role=combobox on the element itself", async () => {
    const el = { getAttribute: (n: string) => (n === "role" ? "combobox" : null), parentElement: null };
    const locator = { evaluate: async (fn: (e: typeof el) => unknown) => fn(el) } as unknown as Locator;
    expect(await isComboboxTrigger(locator)).toBe(true);
  });

  test("false for a plain <select> or button (regression guardrail)", async () => {
    const el = { getAttribute: () => null, parentElement: null };
    const locator = { evaluate: async (fn: (e: typeof el) => unknown) => fn(el) } as unknown as Locator;
    expect(await isComboboxTrigger(locator)).toBe(false);
  });

  test("false when evaluate throws (detached element)", async () => {
    const locator = {
      evaluate: async () => {
        throw new Error("detached");
      },
    } as unknown as Locator;
    expect(await isComboboxTrigger(locator)).toBe(false);
  });
});

/** A locator stub recording click()/waitFor()/textContent() invocations. */
function makeOptionLocator(text: string): Locator {
  const self = {
    first: () => self,
    count: async () => 1,
    waitFor: async () => {},
    textContent: async () => text,
    click: async () => {},
  };
  return self as unknown as Locator;
}

describe("openComboboxAndPick", () => {
  test("opens the trigger via robustClick rung 1 only, waits for the listbox, and clicks the matching option", async () => {
    const clicks: string[] = [];
    const trigger = {
      click: async () => void clicks.push("trigger"),
      fill: async () => {},
      pressSequentially: async () => {},
    } as unknown as Locator;
    const listbox = { first: () => listbox, waitFor: async () => {} };
    const option = makeOptionLocator("Zurich");
    const page = {
      getByRole: (role: string) => (role === "listbox" ? listbox : option),
    } as unknown as Page;
    const result = await openComboboxAndPick(page, trigger, "Zurich");
    expect(result.ok).toBe(true);
    expect(result.strategy).toBe("combobox");
    expect(result.rung).toBe("direct");
    expect(clicks).toEqual(["trigger"]);
  });

  test("reports a single-line error when the entire robust-click ladder is exhausted (sticky/obscured trigger)", async () => {
    const fail = async () => {
      throw new Error("Element is not visible\nstack");
    };
    const trigger = { click: fail, scrollIntoViewIfNeeded: fail, boundingBox: fail } as unknown as Locator;
    const page = { locator: () => ({ first: () => ({ count: async () => 0 }) }) } as unknown as Page;
    const result = await openComboboxAndPick(page, trigger, "Zurich");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Error: Element is not visible");
  });
});
