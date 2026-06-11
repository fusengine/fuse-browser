import { describe, expect, test } from "bun:test";
import type { Locator, Page } from "playwright";
import { healLocator } from "../../src/actions/heal-locator.js";
import { REF_ATTRIBUTE } from "../../src/extraction/snapshot.js";
import type { InteractiveElement } from "../../src/interfaces/extraction.js";

/** A locator stub: configurable count + visibility, records its selector. */
function makeLocator(count: number, visible: boolean): Locator {
  const self = {
    first: () => self,
    count: async () => count,
    isVisible: async () => visible,
  };
  return self as unknown as Locator;
}

const MISS = makeLocator(0, false);

/** Minimal element factory for snapshot-based healing. */
function el(ref: string, text: string): InteractiveElement {
  return {
    index: 0,
    ref,
    tag: "button",
    text,
    role: null,
    id: null,
    name: null,
    type: null,
    href: null,
    visible: true,
    box: { x: 0, y: 0, width: 1, height: 1 },
  };
}

/** Build a typed Page mock with overridable locating methods. */
function makePage(over: Partial<Record<keyof Page, unknown>>): Page {
  const base = {
    getByRole: () => MISS,
    getByText: () => MISS,
    frames: () => [{ isDetached: () => false, locator: () => makeLocator(1, true) }],
  };
  return { ...base, ...over } as unknown as Page;
}

const emptySnapshot = async (): Promise<InteractiveElement[]> => [];

describe("healLocator", () => {
  test("returns null for a blank target without touching the page", async () => {
    const page = makePage({});
    expect(await healLocator(page, "   ", emptySnapshot)).toBeNull();
  });

  test("recovers via accessible role+name (button)", async () => {
    const hit = makeLocator(1, true);
    const page = makePage({ getByRole: (role: string) => (role === "button" ? hit : MISS) });
    expect(await healLocator(page, "Save", emptySnapshot)).toBe(hit);
  });

  test("falls through role to visible text", async () => {
    const hit = makeLocator(1, true);
    const page = makePage({ getByText: () => hit });
    expect(await healLocator(page, "Continue", emptySnapshot)).toBe(hit);
  });

  test("ignores a role match that is present but not visible", async () => {
    const page = makePage({ getByRole: () => makeLocator(1, false) });
    expect(await healLocator(page, "Hidden", emptySnapshot)).toBeNull();
  });

  test("re-snapshots and re-matches the original label via its ref", async () => {
    const frameLoc = makeLocator(1, true);
    const page = makePage({
      frames: () => [{ isDetached: () => false, locator: () => frameLoc }],
    });
    const snapshot = async () => [el("0", "Other"), el("0", "Add to cart now")];
    const out = await healLocator(page, "add to cart", snapshot);
    expect(out).toBe(frameLoc);
  });

  test("returns null when nothing recovers the target", async () => {
    const page = makePage({});
    expect(await healLocator(page, "Nope", emptySnapshot)).toBeNull();
  });

  test("REF_ATTRIBUTE is exported for ref resolution", () => {
    expect(typeof REF_ATTRIBUTE).toBe("string");
  });
});
