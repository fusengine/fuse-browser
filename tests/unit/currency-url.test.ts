import { describe, expect, test } from "bun:test";
import { urlWithCurrency } from "../../src/consent/currency-url.js";

describe("urlWithCurrency", () => {
  test("adds selected_currency to booking URLs", () => {
    expect(
      urlWithCurrency("https://www.booking.com/searchresults.html?ss=Lausanne", "CHF"),
    ).toBe("https://www.booking.com/searchresults.html?ss=Lausanne&selected_currency=CHF");
  });

  test("no-op for non-booking domains", () => {
    expect(urlWithCurrency("https://example.com/?a=1", "CHF")).toBe("https://example.com/?a=1");
  });

  test("keeps existing currency", () => {
    const url = "https://www.booking.com/x?selected_currency=USD";
    expect(urlWithCurrency(url, "CHF")).toBe(url);
  });
});
