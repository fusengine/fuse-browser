/**
 * Inject the preferred currency into Booking URLs (pure, testable).
 * @module consent/currency-url
 */

/**
 * Add `selected_currency` to booking.com URLs when absent.
 * No-op for other domains or when no currency is given.
 */
export function urlWithCurrency(url: string, currency: string | null | undefined): string {
  if (!url.includes("booking.com") || !currency) return url;
  const parsed = new URL(url);
  if (!parsed.searchParams.has("selected_currency")) {
    parsed.searchParams.set("selected_currency", currency);
  }
  return parsed.toString();
}
