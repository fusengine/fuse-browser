import { describe, expect, test } from "bun:test";
import { diffSnapshots } from "../../src/extraction/snapshot-diff.js";
import type { InteractiveElement } from "../../src/interfaces/extraction.js";

function el(index: number, tag: string, text: string, id: string | null = null): InteractiveElement {
  return {
    index,
    tag,
    text,
    role: null,
    id,
    name: null,
    type: null,
    href: null,
    visible: true,
    box: { x: 0, y: 0, width: 10, height: 10 },
  };
}

describe("diffSnapshots", () => {
  test("detects added and removed elements", () => {
    const before = [el(0, "button", "Go", "go")];
    const after = [el(0, "button", "Go", "go"), el(1, "a", "Next", "nx")];
    const d = diffSnapshots(before, after);
    expect(d.added.map((e) => e.text)).toEqual(["Next"]);
    expect(d.removed).toEqual([]);
    expect(d.changed).toBe(true);
  });

  test("detects text change matched by structural key", () => {
    const before = [el(0, "div", "idle", "out")];
    const after = [el(0, "div", "done", "out")];
    const d = diffSnapshots(before, after);
    expect(d.textChanged).toEqual([{ index: 0, before: "idle", after: "done" }]);
    expect(d.added).toEqual([]);
    expect(d.changed).toBe(true);
  });

  test("text change survives index shift (element inserted before)", () => {
    const before = [el(0, "div", "idle", "out")];
    // a banner was inserted at index 0, pushing #out to index 1
    const after = [el(0, "div", "banner", "ban"), el(1, "div", "done", "out")];
    const d = diffSnapshots(before, after);
    expect(d.added.map((e) => e.id)).toEqual(["ban"]);
    expect(d.textChanged).toEqual([{ index: 1, before: "idle", after: "done" }]);
  });

  test("no change yields changed=false", () => {
    const same = [el(0, "button", "Go", "b1")];
    const d = diffSnapshots(same, [el(0, "button", "Go", "b1")]);
    expect(d.changed).toBe(false);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.textChanged).toEqual([]);
  });

  test("urlChanged forces changed=true", () => {
    const same = [el(0, "button", "Go", "b1")];
    const d = diffSnapshots(same, [el(0, "button", "Go", "b1")], true);
    expect(d.urlChanged).toBe(true);
    expect(d.changed).toBe(true);
  });
});
