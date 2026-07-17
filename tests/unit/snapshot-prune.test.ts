/**
 * Unit tests for the opt-in `prune` pruning logic (the "C4" rule): the
 * DOM-hiding predicate (`isPrunableMirror`, a Node-testable mirror of the
 * browser-side `isPrunable`) and the pure keep/drop decision (`shouldKeep`).
 */
import { describe, expect, test } from "bun:test";
import { isPrunableMirror } from "../../src/extraction/snapshot-hidden.js";
import { shouldKeep } from "../../src/extraction/snapshot.js";

describe("isPrunableMirror", () => {
  test("visible leaf node is not prunable", () => {
    expect(isPrunableMirror({})).toBe(false);
  });

  test("display:none on an ancestor is prunable (CSS-hidden, sticky)", () => {
    const node = { parent: { parent: { display: "none" } } };
    expect(isPrunableMirror(node)).toBe(true);
  });

  test("display:contents on an ancestor is NOT prunable", () => {
    const node = { parent: { display: "contents" } };
    expect(isPrunableMirror(node)).toBe(false);
  });

  test("visibility:hidden on the node itself is prunable", () => {
    expect(isPrunableMirror({ visibility: "hidden" })).toBe(true);
  });

  test("visibility:collapse on the node itself is prunable", () => {
    expect(isPrunableMirror({ visibility: "collapse" })).toBe(true);
  });

  test("an ancestor's visibility:hidden does not prune this node (overridable, non-sticky)", () => {
    // getComputedStyle already resolves inheritance/override; a node whose OWN
    // resolved visibility is "visible" (e.g. a descendant re-enabled it) must
    // stay non-prunable regardless of what an ancestor originally declared.
    const node = { visibility: "visible", parent: { visibility: "hidden" } };
    expect(isPrunableMirror(node)).toBe(false);
  });

  test("aria-hidden ancestor + NOT focusable is prunable (decorative, the pre-fix behavior)", () => {
    const node = { focusable: false, parent: { ariaHidden: "true" } };
    expect(isPrunableMirror(node)).toBe(true);
  });

  test("aria-hidden ancestor + focusable is KEPT, not prunable (the modal fix)", () => {
    // e.g. a <button> inside an open <dialog>/[role=dialog] whose SPA also
    // marks a sibling/root wrapper aria-hidden="true": visible + focusable
    // interactive elements must survive prune:true even under aria-hidden.
    const node = { focusable: true, parent: { ariaHidden: "true" } };
    expect(isPrunableMirror(node)).toBe(false);
  });

  test("aria-hidden on the node itself + not focusable is prunable", () => {
    expect(isPrunableMirror({ ariaHidden: "true", focusable: false })).toBe(true);
  });

  test("aria-hidden on the node itself + focusable is kept", () => {
    expect(isPrunableMirror({ ariaHidden: "true", focusable: true })).toBe(false);
  });

  test("CSS-hidden wins even when focusable (genuinely hidden is always prunable)", () => {
    const node = { display: "none", focusable: true, ariaHidden: "true" };
    expect(isPrunableMirror(node)).toBe(true);
  });
});

describe("shouldKeep", () => {
  test("keeps a prunable element when prune is off (default, unchanged behavior)", () => {
    expect(shouldKeep(true, false)).toBe(true);
  });

  test("drops a prunable element when prune is on", () => {
    expect(shouldKeep(true, true)).toBe(false);
  });

  test("keeps a non-prunable element regardless of prune", () => {
    expect(shouldKeep(false, false)).toBe(true);
    expect(shouldKeep(false, true)).toBe(true);
  });

  test("keeps an element with no prunable flag (undefined) regardless of prune", () => {
    expect(shouldKeep(undefined, true)).toBe(true);
  });
});
