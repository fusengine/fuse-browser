import { describe, expect, test } from "bun:test";
import type { Page } from "playwright";
import { applyClipboard } from "../../src/server/tools/clipboard.js";

/**
 * Fake page whose `evaluate` mirrors Playwright's string mode: it receives a
 * JS expression string (an IIFE produced by `evalScript`/`evalScriptArg`) and
 * runs it with a stub `navigator.clipboard` in scope, like the real browser.
 */
function fakePage(initial = "") {
  let stored = initial;
  const navigator = {
    clipboard: {
      writeText: async (t: string): Promise<void> => {
        stored = t;
      },
      readText: async (): Promise<string> => stored,
    },
  };
  const page = {
    async evaluate(expression: string): Promise<unknown> {
      const run = new Function("navigator", `return (${expression});`);
      return run(navigator);
    },
  } as unknown as Page;
  return { page, read: () => stored };
}

describe("applyClipboard", () => {
  test("write stores the text and returns undefined", async () => {
    const { page, read } = fakePage();
    const out = await applyClipboard(page, "write", "hello");
    expect(out).toBeUndefined();
    expect(read()).toBe("hello");
  });

  test("write of missing text writes an empty string", async () => {
    const { page, read } = fakePage("old");
    await applyClipboard(page, "write");
    expect(read()).toBe("");
  });

  test("read returns the current clipboard text", async () => {
    const { page } = fakePage("copied");
    expect(await applyClipboard(page, "read")).toBe("copied");
  });
});
