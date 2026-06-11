import { describe, expect, test } from "bun:test";
import { extractPrices } from "../../src/extraction/prices.js";

describe("price context label", () => {
  test("picks the significant line just before the price", () => {
    const prices = extractPrices("2 nights, 2 adults\nCHF 240");
    const chf = prices.find((p) => p.currency === "CHF" && p.amount === 240);
    expect(chf?.context).toBe("2 nights, 2 adults");
  });

  test("falls back to the line after when there is none before", () => {
    const prices = extractPrices("€ 149\nDeluxe King Room");
    const eur = prices.find((p) => p.currency === "EUR" && p.amount === 149);
    expect(eur?.context).toBe("Deluxe King Room");
  });

  test("prefers the preceding line over the following one", () => {
    const prices = extractPrices("Tickets from\n$ 30\nincludes fees");
    const usd = prices.find((p) => p.currency === "USD" && p.amount === 30);
    expect(usd?.context).toBe("Tickets from");
  });

  test("skips a neighbouring price line when choosing context", () => {
    const prices = extractPrices("Suite\nCHF 100\nCHF 80");
    const live = prices.find((p) => p.currency === "CHF" && p.amount === 80);
    // The line before 80 is the 100 price line, so context comes from "Suite".
    expect(live?.context).toBe("Suite");
  });

  test("omits context when no significant neighbour exists", () => {
    const prices = extractPrices("CHF 50");
    const chf = prices.find((p) => p.currency === "CHF" && p.amount === 50);
    expect(chf?.context).toBeUndefined();
  });

  test("does not break existing currency/amount/line assertions", () => {
    const prices = extractPrices("Hotel Name\nCHF 106");
    const chf = prices.find((p) => p.currency === "CHF" && p.amount === 106);
    expect(chf?.line).toBe("CHF 106");
    expect(chf?.context).toBe("Hotel Name");
  });
});
