/**
 * Multi-currency, layout-agnostic visible price extraction from page text.
 * Captures a currency whether it sits before or after the amount, and even when
 * the symbol and amount land on separate DOM lines (e.g. "CHF\n6.90").
 * @module extraction/prices
 */
import type { Price } from "../interfaces/extraction.js";
import { contextFor } from "./prices-context.js";
import { normaliseAmount, normaliseSpaces, stitchLogicalLines } from "./prices-normalize.js";

export { normaliseAmount } from "./prices-normalize.js";

const AMOUNT = "([0-9][0-9'\u2019.,\u00A0\u202F\u2009\u2007 ]*[0-9]|[0-9])";

/** [currency code, regex prefix alternative]. Order matters: generic $ goes last. */
const CURRENCY_PREFIXES: Array<[string, string]> = [
  ["CHF", "CHF|Fr\\.?|SFr\\.?"],
  ["CAD", "CAD|CA\\$|C\\$"],
  ["AUD", "AUD|A\\$"],
  ["NZD", "NZD|NZ\\$"],
  ["SGD", "SGD|S\\$"],
  ["HKD", "HKD|HK\\$"],
  ["BRL", "BRL|R\\$"],
  ["MXN", "MXN|Mex\\$"],
  ["GBP", "GBP|£"],
  ["EUR", "EUR|€"],
  ["JPY", "JPY|¥"],
  ["CNY", "CNY|CN¥|RMB|元"],
  ["KRW", "KRW|₩"],
  ["INR", "INR|₹"],
  ["AED", "AED|د\\.إ"],
  ["SAR", "SAR|ر\\.س"],
  ["NOK", "NOK|kr"],
  ["SEK", "SEK|kr"],
  ["DKK", "DKK|kr"],
  ["PLN", "PLN|zł"],
  ["CZK", "CZK|Kč"],
  ["ILS", "ILS|₪"],
  ["ZAR", "ZAR|(?<![A-Za-z])R"],
  ["USD", "USD|US\\$|\\$"],
];

/** Single alternation of every currency token, for the logical-line stitcher. */
const ALL_TOKENS = CURRENCY_PREFIXES.map(([, prefix]) => prefix).join("|");

/** Prefix ("CHF 6.90") or suffix ("6.90 CHF"); suffix skipped when the currency is followed by an amount so "Row 0 CHF 10" → "CHF 10", not "0 CHF". */
const PATTERNS: Array<[string, RegExp]> = CURRENCY_PREFIXES.map(([currency, prefix]) => [
  currency,
  new RegExp(`(?:${prefix})\\s*${AMOUNT}|${AMOUNT}\\s*(?:${prefix})(?![A-Za-z])(?!\\s*[0-9])`, "gi"),
]);

const SKIP_WORDS = ["restaurant", "parking", "breakfast", "déjeuner"];

/** True for a numeric range like "20–30" / "20-30" (excluded from prices). */
function isRange(line: string): boolean {
  return (line.includes("–") || line.includes("-")) && /\d\s*[-–]\s*\d/.test(line);
}

/**
 * Extract visible prices, skipping ranges and irrelevant lines
 * (restaurant, parking…). Deduplicates by currency+amount.
 * @param text - Page (or row) innerText, possibly multi-line and split layout.
 * @returns Detected prices, each tied to its trimmed logical line and index.
 */
export function extractPrices(text: string): Price[] {
  const prices: Price[] = [];
  const seen = new Set<string>();
  const physical = normaliseSpaces(text).split("\n");
  const logical = stitchLogicalLines(physical, ALL_TOKENS);
  logical.forEach((line, lineNo) => {
    if (isRange(line)) return;
    if (SKIP_WORDS.some((w) => line.toLowerCase().includes(w))) return;
    for (const [currency, pattern] of PATTERNS) {
      for (const match of line.matchAll(pattern)) {
        const amount = normaliseAmount((match[1] ?? match[2]) as string);
        const key = `${currency}:${amount}`;
        if (seen.has(key)) continue;
        seen.add(key);
        prices.push({ currency, amount, line: line.trim(), lineNo });
      }
    }
  });
  const priceLineNos = new Set(prices.map((p) => p.lineNo));
  for (const price of prices) {
    const context = contextFor(logical, price.lineNo, priceLineNos);
    if (context) price.context = context;
  }
  return prices;
}

/**
 * First price of a single line, or null. Callers (hotel-offers) pre-split text.
 * @param line - One already-isolated line of text.
 * @returns The first detected currency/amount, or null when none is found.
 */
export function parseSinglePrice(line: string): { currency: string; amount: number } | null {
  const first = extractPrices(line)[0];
  return first ? { currency: first.currency, amount: first.amount } : null;
}
