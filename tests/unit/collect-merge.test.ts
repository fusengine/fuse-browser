import { describe, expect, test } from "bun:test";
import { mergeItems, type RawRow } from "../../src/extraction/collect-merge.js";
import { extractPrices } from "../../src/extraction/prices.js";
import type { CollectedItem } from "../../src/interfaces/extraction.js";

const rows = (...keys: string[]): RawRow[] => keys.map((k) => ({ key: k, text: k, url: null }));

describe("mergeItems", () => {
  test("dedups by key across scroll steps (recycled nodes)", () => {
    const seen = new Map<string, CollectedItem>();
    expect(mergeItems(seen, rows("a", "b"), null)).toBe(2);
    expect(mergeItems(seen, rows("b", "c"), null)).toBe(1); // b already seen
    expect([...seen.keys()]).toEqual(["a", "b", "c"]);
  });

  test("skips empty keys and never double-counts", () => {
    const seen = new Map<string, CollectedItem>();
    const added = mergeItems(seen, [{ key: "", text: "x", url: null }, { key: "x", text: "x", url: null }], null);
    expect(added).toBe(1);
    expect(seen.size).toBe(1);
  });

  test("enriches new rows with prices when a pricer is given", () => {
    const seen = new Map<string, CollectedItem>();
    mergeItems(seen, [{ key: "r1", text: "Hotel CHF 89", url: null }], extractPrices);
    expect(seen.get("r1")?.prices?.some((p) => p.currency === "CHF" && p.amount === 89)).toBe(true);
  });
});
