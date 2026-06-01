/**
 * Multi-currency visible price extraction from page text.
 * @module extraction/prices
 */
import type { Price } from "../interfaces/extraction.js";

const AMOUNT = "([0-9][0-9'’.,]*)";

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

const PATTERNS: Array<[string, RegExp]> = CURRENCY_PREFIXES.map(([currency, prefix]) => [
  currency,
  new RegExp(`(?:${prefix})\\s*${AMOUNT}`, "gi"),
]);

const SKIP_WORDS = ["restaurant", "parking", "breakfast", "déjeuner"];

/** Normalize a raw amount: float when it has decimals, otherwise integer (separators stripped). */
export function normaliseAmount(raw: string): number {
  const cleaned = raw.replace(/['’]/g, "");
  if (/[.,]\d{2}$/.test(cleaned)) return Number(cleaned.replace(/,/g, ""));
  return Number(cleaned.replace(/,/g, "").replace(/\./g, ""));
}

/**
 * Extract visible prices, skipping ranges (e.g. "20–30") and irrelevant lines
 * (restaurant, parking…). Deduplicates by currency+amount.
 */
export function extractPrices(text: string): Price[] {
  const prices: Price[] = [];
  const seen = new Set<string>();
  const lines = text.split("\n");
  lines.forEach((line, lineNo) => {
    if ((line.includes("–") || line.includes("-")) && /\d\s*[-–]\s*\d/.test(line)) return;
    const lowered = line.toLowerCase();
    if (SKIP_WORDS.some((w) => lowered.includes(w))) return;
    for (const [currency, pattern] of PATTERNS) {
      for (const match of line.matchAll(pattern)) {
        const amount = normaliseAmount(match[1] as string);
        const key = `${currency}:${amount}`;
        if (seen.has(key)) continue;
        seen.add(key);
        prices.push({ currency, amount, line: line.trim(), lineNo });
      }
    }
  });
  return prices;
}

/** First price of a line, or null. */
export function parseSinglePrice(line: string): { currency: string; amount: number } | null {
  const prices = extractPrices(line);
  const first = prices[0];
  return first ? { currency: first.currency, amount: first.amount } : null;
}
