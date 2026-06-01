import { describe, expect, test } from "bun:test";
import { extractPrices } from "../../src/extraction/prices.js";
import { htmlToText } from "../../src/net/fetch-fast.js";

describe("htmlToText", () => {
  test("extracts readable body text from HTML", () => {
    const t = htmlToText("<html><body><h1>Shop</h1><p>Price: CHF 99</p></body></html>");
    expect(t).toContain("Shop");
    expect(t).toContain("CHF 99");
  });

  test("output feeds the price extractor", () => {
    const t = htmlToText("<html><body><div>EUR 42</div></body></html>");
    expect(extractPrices(t).some((p) => p.currency === "EUR" && p.amount === 42)).toBe(true);
  });

  test("empty/bodyless HTML yields empty string", () => {
    expect(htmlToText("<html></html>")).toBe("");
  });
});
