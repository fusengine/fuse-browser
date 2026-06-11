/**
 * Force the currency on booking.com (cookies + header picker).
 * @module consent/booking-currency
 */
import type { Page } from "playwright";
import { evalScript, evalScriptArg } from "../lib/evaluate.js";
import { waitForRealtimeSettle } from "../state/realtime.js";

/** booking.com cookie domain. */
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

/**
 * Pre-position the currency by seeding the booking.com cookies BEFORE the real
 * navigation (cur_curr is the one Booking actually reads). The earlier variant
 * also did an intermediate `page.goto` to the booking.com homepage to "warm" the
 * currency session, but that landed on the consent wall and left the page in a
 * broken state, so the subsequent navigation to the target returned blank. The
 * cookies + the in-URL `selected_currency` param apply the currency; when they
 * miss, `selectBookingCurrency` (the header UI picker, run on the real page after
 * navigation) corrects it — so no intermediate navigation is needed.
 */
export async function prepareBookingCurrency(page: Page, currency: string): Promise<void> {
  try {
    await page.context().addCookies([
      bookingCookie("cur_curr", currency),
      bookingCookie("selected_currency", currency),
      bookingCookie("changed_currency", "1"),
    ]);
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
