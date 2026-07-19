import { describe, expect, test } from "bun:test";
import type { Locator, Page } from "playwright";
import { robustClick } from "../../src/actions/robust-click.js";

/** A click stub that throws for the first `failTimes` calls, then succeeds. */
function makeCounterClick(failTimes: number) {
  let calls = 0;
  return async () => {
    calls += 1;
    if (calls <= failTimes) throw new Error(`click failed (attempt ${calls})`);
  };
}

/** `page.locator(...).first().count()` used by the overlay-dismiss rung; 0 = no overlay found. */
function makePageWithOverlay(overlayCount: number, mouseClicks: Array<[number, number]> = []): Page {
  return {
    locator: () => ({ first: () => ({ count: async () => overlayCount, isVisible: async () => overlayCount > 0, click: async () => {} }) }),
    mouse: { click: async (x: number, y: number) => void mouseClicks.push([x, y]) },
  } as unknown as Page;
}

describe("robustClick — escalation ladder (regression guardrail: happy path unchanged)", () => {
  test("rung 'direct': a normally-clickable element only calls click() once, no escalation", async () => {
    let scrollCalled = false;
    const locator = {
      click: makeCounterClick(0),
      scrollIntoViewIfNeeded: async () => {
        scrollCalled = true;
      },
    } as unknown as Locator;
    const result = await robustClick(makePageWithOverlay(0), locator, 1_000);
    expect(result).toEqual({ ok: true, rung: "direct" });
    expect(scrollCalled).toBe(false);
  });

  test("rung 'scroll': click times out once, scrollIntoViewIfNeeded then a 2nd click succeeds", async () => {
    const locator = { click: makeCounterClick(1), scrollIntoViewIfNeeded: async () => {} } as unknown as Locator;
    const result = await robustClick(makePageWithOverlay(0), locator, 1_000);
    expect(result).toEqual({ ok: true, rung: "scroll" });
  });

  test("rung 'dismiss-overlay': scroll+retry still fails, dismissing a cookie banner unblocks the 3rd click", async () => {
    const locator = { click: makeCounterClick(2), scrollIntoViewIfNeeded: async () => {} } as unknown as Locator;
    const result = await robustClick(makePageWithOverlay(1), locator, 1_000);
    expect(result).toEqual({ ok: true, rung: "dismiss-overlay" });
  });

  test("rung 'force': overlay dismissal doesn't help, force:true click bypasses the hit-test mismatch", async () => {
    const locator = { click: makeCounterClick(3), scrollIntoViewIfNeeded: async () => {} } as unknown as Locator;
    const result = await robustClick(makePageWithOverlay(0), locator, 1_000);
    expect(result).toEqual({ ok: true, rung: "force" });
  });

  test("rung 'mouse-xy': even force:true fails, falls back to page.mouse.click at the element center", async () => {
    const mouseClicks: Array<[number, number]> = [];
    const locator = {
      click: makeCounterClick(4),
      scrollIntoViewIfNeeded: async () => {},
      boundingBox: async () => ({ x: 10, y: 20, width: 100, height: 50 }),
    } as unknown as Locator;
    const result = await robustClick(makePageWithOverlay(0, mouseClicks), locator, 1_000);
    expect(result).toEqual({ ok: true, rung: "mouse-xy" });
    expect(mouseClicks).toEqual([[60, 45]]);
  });

  test("'failed': every rung exhausted (element truly gone) reports the final error", async () => {
    const locator = {
      click: async () => {
        throw new Error("Element is not attached to the DOM\nstack");
      },
      scrollIntoViewIfNeeded: async () => {},
      boundingBox: async () => null,
    } as unknown as Locator;
    const result = await robustClick(makePageWithOverlay(0), locator, 1_000);
    expect(result.ok).toBe(false);
    expect(result.rung).toBe("failed");
    expect(result.error).toBe("Error: no_bounding_box");
  });
});

describe("robustClick — hit-test gate (FIX 3: force/mouse-xy must not report ok:true on the wrong element)", () => {
  test("rung 'force': hit-test confirms the target is on top — force click proceeds normally (no false block)", async () => {
    const locator = {
      click: makeCounterClick(3),
      scrollIntoViewIfNeeded: async () => {},
      boundingBox: async () => ({ x: 0, y: 0, width: 40, height: 20 }),
      evaluate: async () => true, // in-page hit-test: this element IS the top-most hit
    } as unknown as Locator;
    const result = await robustClick(makePageWithOverlay(0), locator, 1_000);
    expect(result).toEqual({ ok: true, rung: "force" });
  });

  test("a foreign element covers the target's center at both force and mouse-xy — reports ok:false instead of a false success", async () => {
    const mouseClicks: Array<[number, number]> = [];
    const locator = {
      click: makeCounterClick(4),
      scrollIntoViewIfNeeded: async () => {},
      boundingBox: async () => ({ x: 10, y: 20, width: 100, height: 50 }),
      evaluate: async () => false, // in-page hit-test: a foreign element is on top
    } as unknown as Locator;
    const result = await robustClick(makePageWithOverlay(0, mouseClicks), locator, 1_000);
    expect(result).toEqual({ ok: false, rung: "failed", error: "Error: obscured_by_foreign_element" });
    expect(mouseClicks).toEqual([]);
  });

  test("FIX 3-CLOSE: cross-frame locator (isMainFrame:false) — hit-test is skipped, force click proceeds even though evaluate would refuse", async () => {
    const locator = {
      click: makeCounterClick(3),
      scrollIntoViewIfNeeded: async () => {},
      boundingBox: async () => ({ x: 0, y: 0, width: 40, height: 20 }),
      evaluate: async () => false, // would refuse if the hit-test ran (wrong coordinate space for a child frame)
    } as unknown as Locator;
    const result = await robustClick(makePageWithOverlay(0), locator, 1_000, false);
    expect(result).toEqual({ ok: true, rung: "force" });
  });
});
