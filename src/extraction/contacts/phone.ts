/**
 * Phone extraction → E.164 via libphonenumber-js (default country from identity).
 * @module extraction/contacts/phone
 */
import { findPhoneNumbersInText, parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

/** decodeURIComponent that never throws on a malformed tel: href. */
const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Extract + dedupe phone numbers (E.164) from tel: hrefs and free text. */
export function extractPhones(signals: { text: string; tel: string[] }, country: string): string[] {
  const cc = country.toUpperCase() as CountryCode;
  const set = new Set<string>();
  for (const href of signals.tel) {
    const raw = safeDecode(href.replace(/^tel:/i, "").trim());
    const parsed = parsePhoneNumberFromString(raw, cc);
    if (parsed?.isValid()) set.add(parsed.number);
  }
  for (const found of findPhoneNumbersInText(signals.text, { defaultCountry: cc })) {
    set.add(found.number.number);
  }
  return [...set];
}
