/**
 * Unit tests for the opt-in `prune` pruning logic: the DOM-hiding predicate
 * (`isHiddenForAriaMirror`, a Node-testable mirror of the browser-side
 * `isElementHiddenForAria`) and the pure keep/drop decision (`shouldKeep`).
 */
import { describe, expect, test } from "bun:test";
import { isHiddenForAriaMirror } from "../../src/extraction/snapshot-hidden.js";
import { shouldKeep } from "../../src/extraction/snapshot.js";

describe("isHiddenForAriaMirror", () => {
  test("visible leaf node is not hidden", () => {
    expect(isHiddenForAriaMirror({})).toBe(false);
  });

  test("aria-hidden=true on the node itself hides it", () => {
    expect(isHiddenForAriaMirror({ ariaHidden: "true" })).toBe(true);
  });

  test("aria-hidden=true on an ancestor hides it (sticky, cannot be undone)", () => {
    const node = { ariaHidden: "false", parent: { ariaHidden: "true" } };
    expect(isHiddenForAriaMirror(node)).toBe(true);
  });

  test("display:none on an ancestor hides it (sticky)", () => {
    const node = { parent: { parent: { display: "none" } } };
    expect(isHiddenForAriaMirror(node)).toBe(true);
  });

  test("display:contents on an ancestor does NOT hide it", () => {
    const node = { parent: { display: "contents" } };
    expect(isHiddenForAriaMirror(node)).toBe(false);
  });

  test("visibility:hidden on the node itself hides it", () => {
    expect(isHiddenForAriaMirror({ visibility: "hidden" })).toBe(true);
  });

  test("visibility:collapse on the node itself hides it", () => {
    expect(isHiddenForAriaMirror({ visibility: "collapse" })).toBe(true);
  });

  test("an ancestor's visibility:hidden does not hide this node (overridable, non-sticky)", () => {
    // getComputedStyle already resolves inheritance/override; a node whose OWN
    // resolved visibility is "visible" (e.g. a descendant re-enabled it) must
    // stay visible regardless of what an ancestor originally declared.
    const node = { visibility: "visible", parent: { visibility: "hidden" } };
    expect(isHiddenForAriaMirror(node)).toBe(false);
  });
});

describe("shouldKeep", () => {
  test("keeps a hidden element when prune is off (default, unchanged behavior)", () => {
    expect(shouldKeep(true, false)).toBe(true);
  });

  test("drops a hidden element when prune is on", () => {
    expect(shouldKeep(true, true)).toBe(false);
  });

  test("keeps a visible element regardless of prune", () => {
    expect(shouldKeep(false, false)).toBe(true);
    expect(shouldKeep(false, true)).toBe(true);
  });

  test("keeps an element with no ariaHidden flag (undefined) regardless of prune", () => {
    expect(shouldKeep(undefined, true)).toBe(true);
  });
});
