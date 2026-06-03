/**
 * Aggregate structured contacts from rendered-DOM signals. Pure (no browser).
 * @module extraction/contacts/extract
 */
import type { Contacts, ContactSignals } from "../../interfaces/contacts.js";
import { extractEmails } from "./email.js";
import { extractPhones } from "./phone.js";

/** Combine email/phone extraction with the contact-form flag into {@link Contacts}. */
export function extractContacts(signals: ContactSignals, country: string): Contacts {
  return {
    emails: extractEmails(signals),
    phones: extractPhones(signals, country),
    hasContactForm: signals.hasForm,
  };
}
