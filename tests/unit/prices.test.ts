import { describe, expect, test } from "bun:test";
import { extractPrices, normaliseAmount } from "../../src/extraction/prices.js";

describe("extractPrices", () => {
  test("prefers structured CHF values and excludes ranges", () => {
    const text =
      "Hôtel de la Paix\nCHF 106\nibis Centre CHF 129\nRestaurant CHF 20–30\nUSD 140\nPrice from $468.53";
    const prices = extractPrices(text);
    const chf = new Set(prices.filter((p) => p.currency === "CHF").map((p) => p.amount));
    expect(chf.has(106)).toBe(true);
    expect(chf.has(129)).toBe(true);
    expect(prices.some((p) => p.currency === "USD" && p.amount === 468.53)).toBe(true);
    expect(prices.every((p) => p.amount !== 20)).toBe(true);
  });

  test("supports major world currencies", () => {
    const text = "CA$ 199\nA$ 230\n¥ 12000\nAED 450\nR$ 899\n€ 149";
    const prices = extractPrices(text);
    const has = (currency: string, amount: number) =>
      prices.some((p) => p.currency === currency && p.amount === amount);
    expect(has("CAD", 199)).toBe(true);
    expect(has("AUD", 230)).toBe(true);
    expect(has("JPY", 12000)).toBe(true);
    expect(has("AED", 450)).toBe(true);
    expect(has("BRL", 899)).toBe(true);
    expect(has("EUR", 149)).toBe(true);
  });

  test("does not mistake the trailing R of a code (EUR) for ZAR", () => {
    const prices = extractPrices("Total EUR 42");
    expect(prices.some((p) => p.currency === "EUR" && p.amount === 42)).toBe(true);
    expect(prices.some((p) => p.currency === "ZAR")).toBe(false);
  });

  test("still matches a genuine ZAR rand prefix", () => {
    const prices = extractPrices("Price R 350");
    expect(prices.some((p) => p.currency === "ZAR" && p.amount === 350)).toBe(true);
  });

  test("stitches a currency split across DOM lines (digitec prefix)", () => {
    const prices = extractPrices("CHF\n6.90");
    expect(prices.some((p) => p.currency === "CHF" && p.amount === 6.9)).toBe(true);
  });

  test("stitches a currency on the line after the amount (suffix)", () => {
    const prices = extractPrices("6.90\nCHF");
    expect(prices.some((p) => p.currency === "CHF" && p.amount === 6.9)).toBe(true);
  });

  test("matches currency as a trailing suffix on the same line", () => {
    const euro = extractPrices("10 €");
    expect(euro.some((p) => p.currency === "EUR" && p.amount === 10)).toBe(true);
    const krona = extractPrices("350 kr");
    expect(krona.some((p) => p.amount === 350 && ["NOK", "SEK", "DKK"].includes(p.currency))).toBe(true);
  });

  test("handles non-breaking space between currency and amount", () => {
    const prices = extractPrices("CHF\u00A06.90");
    expect(prices.some((p) => p.currency === "CHF" && p.amount === 6.9)).toBe(true);
  });

  test("keeps strikethrough and live price as two distinct amounts", () => {
    const prices = extractPrices("CHF 100\nCHF 80");
    const chf = new Set(prices.filter((p) => p.currency === "CHF").map((p) => p.amount));
    expect(chf.has(100)).toBe(true);
    expect(chf.has(80)).toBe(true);
  });
});

describe("normaliseAmount", () => {
  test("decimals -> float, thousands -> int", () => {
    expect(normaliseAmount("468.53")).toBe(468.53);
    expect(normaliseAmount("12'000")).toBe(12000);
    expect(normaliseAmount("1,234.56")).toBe(1234.56);
    expect(normaliseAmount("129")).toBe(129);
  });

  test("locale-aware decimal separator (CH and EU formats)", () => {
    expect(normaliseAmount("1'234.56")).toBe(1234.56);
    expect(normaliseAmount("1.234,56")).toBe(1234.56);
  });
});
