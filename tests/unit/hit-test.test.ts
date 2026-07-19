import { describe, expect, test } from "bun:test";
import type { Locator } from "playwright";
import { isTopElement } from "../../src/actions/hit-test.js";

/** Minimal fake DOM node matching hit-test.ts's duck-typed `TopHit` shape. */
interface FakeNode {
  nodeType: number;
  host?: FakeNode;
  contains(other: FakeNode | null): boolean;
  getRootNode?(): FakeNode | null;
}

/** A plain light-DOM node: `nodeType` 1 (`ELEMENT_NODE`), no ancestor/descendant relation by default. */
function node(overrides: Partial<FakeNode> = {}): FakeNode {
  return { nodeType: 1, contains: () => false, ...overrides };
}

/**
 * A locator stub whose `evaluate` genuinely RUNS `isTopElement`'s in-page
 * callback against `fakeSelf`, with `globalThis.document` stubbed to serve
 * `stack` via BOTH `elementsFromPoint` (current predicate) AND the singular
 * `elementFromPoint` (the pre-fix predicate) — so a test run against the OLD
 * source genuinely exercises its real (buggy) logic instead of just throwing
 * on a missing API and defaulting "true" for the wrong reason. Exercises the
 * real predicate, unlike `robust-click.test.ts`'s `evaluate: async () =>
 * true/false` stubs (those only test `robustClick`'s USE of the boolean).
 */
function makeLocator(fakeSelf: FakeNode, stack: FakeNode[]): Locator {
  return {
    evaluate: async (fn: (el: unknown, args: [number, number]) => unknown) => {
      const g = globalThis as unknown as { document?: unknown };
      const prev = g.document;
      g.document = { elementsFromPoint: () => stack, elementFromPoint: () => stack[0] ?? null };
      try {
        return await fn(fakeSelf, [0, 0]);
      } finally {
        g.document = prev;
      }
    },
  } as unknown as Locator;
}

describe("isTopElement — FIX 3-CLOSE (shadow-DOM / cross-frame false negatives)", () => {
  test("open shadow-DOM element: elementsFromPoint retargets to the host — must ALLOW (fails on the old single-elementFromPoint + plain Node.contains predicate)", async () => {
    const host = node();
    const shadowRoot: FakeNode = { nodeType: 11, host, contains: () => false };
    const button = node({ getRootNode: () => shadowRoot });
    const locator = makeLocator(button, [host]);
    expect(await isTopElement(locator, 5, 5)).toBe(true);
  });

  test("nested shadow roots: the host chain is walked more than one level up", async () => {
    const outerHost = node();
    const outerRoot: FakeNode = { nodeType: 11, host: outerHost, contains: () => false };
    const innerHost = node({ getRootNode: () => outerRoot });
    const innerRoot: FakeNode = { nodeType: 11, host: innerHost, contains: () => false };
    const button = node({ getRootNode: () => innerRoot });
    const locator = makeLocator(button, [outerHost]);
    expect(await isTopElement(locator, 5, 5)).toBe(true);
  });

  test("genuine foreign overlay covering the point, same frame (no shadow root at all) — still REFUSE", async () => {
    const overlay = node();
    const button = node({ getRootNode: () => node({ nodeType: 9 }) }); // Document, not a ShadowRoot
    const locator = makeLocator(button, [overlay]);
    expect(await isTopElement(locator, 5, 5)).toBe(false);
  });

  test("cross-frame locator (isMainFrame:false): hit-test is skipped entirely, evaluate never runs", async () => {
    let evaluated = false;
    const locator = {
      evaluate: async () => {
        evaluated = true;
        return false;
      },
    } as unknown as Locator;
    expect(await isTopElement(locator, 5, 5, false)).toBe(true);
    expect(evaluated).toBe(false);
  });

  test("empty hit stack (nothing at that point) defaults to allow, same as a probe failure", async () => {
    const locator = makeLocator(node(), []);
    expect(await isTopElement(locator, 5, 5)).toBe(true);
  });
});
