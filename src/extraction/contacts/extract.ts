/**
 * Aggregate structured contacts from rendered-DOM signals. Pure (no browser).
 * @module extraction/contacts/extract
 */
import type { Contacts, ContactSignals, ExtractContactsOptions } from "../../interfaces/contacts.js";
import { extractEmails } from "./email.js";
import { extractPhones } from "./phone.js";

/** Combine email/phone extraction with the contact-form flag into {@link Contacts}. */
export function extractContacts(
  signals: ContactSignals,
  country: string,
  opts: ExtractContactsOptions = {},
): Contacts {
  return {
    emails: extractEmails(signals, { filter: opts.filter, url: opts.url }),
    phones: extractPhones(signals, country),
    hasContactForm: signals.hasForm,
  };
}
