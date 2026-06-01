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
});

describe("normaliseAmount", () => {
  test("decimals -> float, thousands -> int", () => {
    expect(normaliseAmount("468.53")).toBe(468.53);
    expect(normaliseAmount("12'000")).toBe(12000);
    expect(normaliseAmount("1,234.56")).toBe(1234.56);
    expect(normaliseAmount("129")).toBe(129);
  });
});
