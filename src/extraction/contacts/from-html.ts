/**
 * Extract contacts from raw HTML without a browser (HTTP fast-path). Parses with
 * linkedom and reuses the pure {@link extractContacts}.
 * @module extraction/contacts/from-html
 */
import { parseHTML } from "linkedom";
import type { Contacts, ExtractContactsOptions } from "../../interfaces/contacts.js";
import { extractContacts } from "./extract.js";

/** Parse `html` and extract structured contacts (emails/phones/contact form). */
export function contactsFromHtml(
  html: string,
  country: string,
  opts: ExtractContactsOptions = {},
): Contacts {
  const { document } = parseHTML(html);
  const hrefs = (sel: string): string[] =>
    [...document.querySelectorAll(sel)].map((a) => a.getAttribute("href") ?? "");
  let text = "";
  try {
    text = document.body?.textContent ?? "";
  } catch {
    /* empty / non-HTML body */
  }
  const hasForm = Boolean(document.querySelector('form input[type="email"]'));
  const signals = {
    html,
    text,
    mailto: hrefs('a[href^="mailto:"]'),
    tel: hrefs('a[href^="tel:"]'),
    hasForm,
  };
  return extractContacts(signals, country, opts);
}
