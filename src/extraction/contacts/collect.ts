/**
 * Page adapter: gather raw contact signals from the rendered DOM and run the
 * pure extractor. The DOM walk is a string script (no Node DOM typing).
 * @module extraction/contacts/collect
 */
import type { Page } from "playwright";
import type { Contacts, ContactSignals } from "../../interfaces/contacts.js";
import { evalScript } from "../../lib/evaluate.js";
import { extractContacts } from "./extract.js";

/** Browser script collecting mailto/tel hrefs, text, HTML and a contact-form flag. */
const SIGNALS_SCRIPT = `() => {
  const hrefs = (sel) => Array.from(document.querySelectorAll(sel)).map((a) => a.getAttribute('href') || '');
  const body = document.body ? document.body.innerText : '';
  const emailField = document.querySelector('form input[type="email"], form input[name*="mail" i]');
  const hasForm = !!emailField || (!!document.querySelector('form') && /contact|kontakt|message|nachricht|formulaire/i.test(body));
  return {
    html: document.documentElement ? document.documentElement.outerHTML : '',
    text: body,
    mailto: hrefs('a[href^="mailto:"]'),
    tel: hrefs('a[href^="tel:"]'),
    hasForm: hasForm,
  };
}`;

/** Gather contact signals from the live page and extract structured contacts. */
export async function collectContacts(page: Page, country: string): Promise<Contacts> {
  const signals = await evalScript<ContactSignals>(page, SIGNALS_SCRIPT);
  return extractContacts(signals, country);
}
