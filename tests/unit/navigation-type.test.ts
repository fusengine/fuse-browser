import { describe, expect, test } from "bun:test";
import type { Page } from "playwright";
import { typeText } from "../../src/actions/navigation.js";

describe("typeText", () => {
  test("types into whatever currently has focus (ref-less) and tags the result", async () => {
    const typed: Array<{ text: string; opts?: unknown }> = [];
    const page = {
      keyboard: { type: async (text: string, opts?: unknown) => void typed.push({ text, opts }) },
    } as unknown as Page;
    expect(await typeText(page, "iphone")).toEqual({ type: "type", ok: true, text: "iphone" });
    expect(typed).toEqual([{ text: "iphone", opts: { delay: 20 } }]);
  });

  test("captures a single-line error on failure", async () => {
    const page = {
      keyboard: {
        type: async () => {
          throw new Error("Target closed\nstack");
        },
      },
    } as unknown as Page;
    expect(await typeText(page, "x")).toEqual({ type: "type", ok: false, text: "x", error: "Error: Target closed" });
  });
});
