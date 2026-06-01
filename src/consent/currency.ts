/**
 * Detect and align the visible currency.
 * @module consent/currency
 */
import type { Page } from "playwright";
import type { CurrencyResult } from "../interfaces/report.js";
import { selectBookingCurrency, SUPPORTED_CURRENCIES } from "./booking-currency.js";

const SYMBOL_CURRENCIES: Array<[string, string]> = [
  ["$", "USD"],
  ["€", "EUR"],
  ["£", "GBP"],
];

const MISMATCH_REASON = "site_kept_currency_despite_locale_geolocation_and_currency_request";

/** Detect the currency shown in the page body (codes then symbols). */
export async function detectVisibleCurrency(page: Page): Promise<string | null> {
  let text: string;
  try {
    text = await page.locator("body").innerText({ timeout: 2_000 });
  } catch {
    return null;
  }
  for (const currency of SUPPORTED_CURRENCIES) {
    if (new RegExp(`(^|\\n|\\s)${currency}($|\\n|\\s)`).test(text)) return currency;
  }
  for (const [symbol, currency] of SYMBOL_CURRENCIES) {
    if (text.includes(symbol)) return currency;
  }
  return null;
}

/**
 * Align the visible currency with the preferred one (booking case handled),
 * and report any persistent mismatch.
 */
export async function applyCurrencyPreference(
  page: Page,
  currency: string,
  countryCode: string,
): Promise<CurrencyResult> {
  const detected = await detectVisibleCurrency(page);
  const result: CurrencyResult = { countryCode, preferred: currency, detected, handled: false };
  if (!currency || detected === currency) {
    result.mismatch = false;
    return result;
  }
  if (page.url().includes("booking.com")) {
    result.handled = await selectBookingCurrency(page, currency);
    result.detectedAfter = await detectVisibleCurrency(page);
  }
  const final = result.detectedAfter ?? result.detected;
  result.mismatch = Boolean(final && final !== currency);
  if (result.mismatch) result.reason = MISMATCH_REASON;
  return result;
}
