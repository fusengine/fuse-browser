import { describe, expect, test } from "bun:test";
import type { Page } from "playwright";
import { navigateHistory } from "../../src/actions/navigate-history.js";

/** No-op `on`/`off` so every fake `Page` below satisfies the `framenavigated` listener the fix adds. */
const NOOP_EVENTS = { on: () => {}, off: () => {} };

// P1 regression coverage: URL-diff based success, not Playwright's response value.
describe("navigateHistory — back", () => {
  test("SPA same-document history: response null but URL changed -> ok:true", async () => {
    let url = "https://x.test/b";
    const page = {
      url: () => url,
      goBack: async () => {
        url = "https://x.test/a";
        return null;
      },
      waitForLoadState: async () => {},
      ...NOOP_EVENTS,
    } as unknown as Page;
    expect(await navigateHistory(page, "back")).toEqual({ type: "back", ok: true, url: "https://x.test/a" });
  });

  test("slow page timeout with URL already changed -> ok:true + load_timeout warning, no throw", async () => {
    let url = "https://x.test/b";
    const page = {
      url: () => url,
      goBack: async () => {
        url = "https://x.test/a";
        throw new Error("Timeout 20000ms exceeded");
      },
      ...NOOP_EVENTS,
    } as unknown as Page;
    expect(await navigateHistory(page, "back")).toEqual({
      type: "back",
      ok: true,
      url: "https://x.test/a",
      warning: "load_timeout",
    });
  });

  test("no history: response null, URL unchanged, no navigation event -> ok:false, reason no_history", async () => {
    const page = {
      url: () => "https://x.test/a",
      goBack: async () => null,
      waitForLoadState: async () => {},
      ...NOOP_EVENTS,
    } as unknown as Page;
    expect(await navigateHistory(page, "back")).toEqual({
      type: "back",
      ok: false,
      url: "https://x.test/a",
      reason: "no_history",
    });
  });

  test("pushState to the SAME url then back: response null, URL unchanged, but framenavigated fires on the main frame -> ok:true (not no_history)", async () => {
    const listeners = new Map<string, (frame: unknown) => void>();
    const fakeMainFrame = {};
    const page = {
      url: () => "https://x.test/a",
      mainFrame: () => fakeMainFrame,
      goBack: async (): Promise<null> => {
        // Simulates Playwright firing `framenavigated` for a same-document
        // History-API commit even though the URL string is unchanged.
        listeners.get("framenavigated")?.(fakeMainFrame);
        return null;
      },
      waitForLoadState: async () => {},
      on: (event: string, handler: (frame: unknown) => void) => {
        listeners.set(event, handler);
      },
      off: () => {},
    } as unknown as Page;
    expect(await navigateHistory(page, "back")).toEqual({ type: "back", ok: true, url: "https://x.test/a" });
  });

  test("genuine failure with no URL change -> ok:false with a single-line error", async () => {
    const page = {
      url: () => "https://x.test/a",
      goBack: async () => {
        throw new Error("crashed\nstack trace here");
      },
      ...NOOP_EVENTS,
    } as unknown as Page;
    expect(await navigateHistory(page, "back")).toEqual({
      type: "back",
      ok: false,
      url: "https://x.test/a",
      error: "Error: crashed",
    });
  });
});
