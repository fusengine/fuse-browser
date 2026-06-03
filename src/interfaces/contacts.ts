/**
 * Contact-extraction types (emails, phones, contact form) and crawl options.
 * @module interfaces/contacts
 */

/** Structured contacts extracted from a page. */
export interface Contacts {
  emails: string[];
  phones: string[];
  hasContactForm: boolean;
}

/** Raw DOM signals gathered from the rendered page, fed to the pure extractor. */
export interface ContactSignals {
  html: string;
  text: string;
  mailto: string[];
  tel: string[];
  hasForm: boolean;
}

/** Opt-in mini-crawler config: hunt the Contact page when the home has none. */
export interface ContactCrawl {
  enabled: boolean;
  /** Max same-domain pages to visit while hunting (default 3). */
  maxPages?: number;
}

/** Contact filtering mode: drop template/placeholder emails, or keep everything. */
export type ContactFilter = "strict" | "off";

/** Options for the contact extractor. */
export interface ExtractContactsOptions {
  /** Drop placeholder/template emails. Defaults to "strict". */
  filter?: ContactFilter;
  /** Page URL — enables same-domain-first ordering of emails. */
  url?: string;
}
