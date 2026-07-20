import { describe, expect, test } from "bun:test";
import type { Page } from "playwright";
import { navigateHistory } from "../../src/actions/navigate-history.js";

/** No-op `on`/`off` so every fake `Page` below satisfies the `framenavigated` listener the fix adds. */
const NOOP_EVENTS = { on: () => {}, off: () => {} };

// Split out of navigate-history.test.ts (back-direction cases) to stay under
// the project's 100-line test-file limit.
describe("navigateHistory — forward", () => {
  test("uses goForward and reports the new URL on success", async () => {
    let url = "https://x.test/a";
    const page = {
      url: () => url,
      goForward: async () => {
        url = "https://x.test/b";
        return { ok: true };
      },
      waitForLoadState: async () => {},
      ...NOOP_EVENTS,
    } as unknown as Page;
    expect(await navigateHistory(page, "forward")).toEqual({ type: "forward", ok: true, url: "https://x.test/b" });
  });

  test("no history: response null, URL unchanged, no navigation event -> ok:false, reason no_history", async () => {
    const page = {
      url: () => "https://x.test/a",
      goForward: async () => null,
      waitForLoadState: async () => {},
      ...NOOP_EVENTS,
    } as unknown as Page;
    expect(await navigateHistory(page, "forward")).toEqual({
      type: "forward",
      ok: false,
      url: "https://x.test/a",
      reason: "no_history",
    });
  });
});
