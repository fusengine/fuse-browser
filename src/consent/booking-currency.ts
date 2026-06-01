/**
 * Force the currency on booking.com (cookies + header picker).
 * @module consent/booking-currency
 */
import type { Page } from "playwright";
import { evalScript, evalScriptArg } from "../lib/evaluate.js";
import { waitForRealtimeSettle } from "../state/realtime.js";

/** booking.com origin and cookie domain. */
const BOOKING_ORIGIN = "https://www.booking.com";
const BOOKING_COOKIE_DOMAIN = ".booking.com";
/** Header currency picker trigger selector. */
const CURRENCY_TRIGGER_SELECTOR = '[data-testid="header-currency-picker-trigger"]';

/** Supported currency display labels (single source of truth). */
export const CURRENCY_LABELS: Record<string, string[]> = {
  CHF: ["CHF", "Swiss Franc"],
  USD: ["USD", "U.S. Dollar", "US Dollar"],
  GBP: ["GBP", "Pound Sterling", "British Pound"],
  EUR: ["EUR", "Euro"],
};

/** Currency codes derived from {@link CURRENCY_LABELS}. */
export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_LABELS);

const bookingSetupUrl = (currency: string): string =>
  `${BOOKING_ORIGIN}/?change_currency=1;selected_currency=${currency};top_currency=1`;

const bookingCookie = (name: string, value: string) => ({
  name,
  value,
  domain: BOOKING_COOKIE_DOMAIN,
  path: "/",
});

const CLICK_TRIGGER = `() => document.querySelector('${CURRENCY_TRIGGER_SELECTOR}')?.click()`;

const PICK_LABEL = `(labels) => {
  const buttons = [...document.querySelectorAll('button,[role=button]')];
  const el = buttons.find(button => {
    const text = (button.innerText || '').replace(/\\s+/g, ' ').trim();
    return labels.some(label => text.includes(label));
  });
  if (!el) return false;
  el.click();
  return true;
}`;

/** Pre-position the currency via cookies + booking setup page. */
export async function prepareBookingCurrency(page: Page, currency: string): Promise<void> {
  try {
    await page.context().addCookies([
      bookingCookie("cur_curr", currency),
      bookingCookie("selected_currency", currency),
      bookingCookie("changed_currency", "1"),
    ]);
    await page.goto(bookingSetupUrl(currency), { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(800);
  } catch {
    /* best-effort */
  }
}

/** Open the booking currency picker and choose the requested currency. */
export async function selectBookingCurrency(page: Page, currency: string): Promise<boolean> {
  const labels = CURRENCY_LABELS[currency] ?? [currency];
  const rx = new RegExp(`^(${SUPPORTED_CURRENCIES.join("|")})$`, "i");
  try {
    let opener = page.locator(CURRENCY_TRIGGER_SELECTOR).first();
    if ((await opener.count()) === 0) opener = page.locator("button").filter({ hasText: rx }).first();
    if ((await opener.count()) === 0) opener = page.getByText(rx).first();
    if ((await opener.count()) === 0) return false;
    await evalScript<void>(page, CLICK_TRIGGER);
    await page.waitForTimeout(1_000);
    const clicked = await evalScriptArg<boolean, string[]>(page, PICK_LABEL, labels);
    if (clicked) {
      await page.waitForTimeout(500);
      try {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
      } catch {
        /* ignore */
      }
      await waitForRealtimeSettle(page);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
