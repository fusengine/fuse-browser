/**
 * Mini-crawler: extract contacts on the current page, and when it yields no
 * email and crawling is enabled, follow same-domain Contact/Impressum links
 * (bounded) and merge what they reveal. Opt-in via ProbeOptions.contactCrawl.
 * @module agent/contact-hunt
 */
import type { Page } from "playwright";
import { collectContacts } from "../extraction/contacts/collect.js";
import type { ContactCrawl, Contacts } from "../interfaces/contacts.js";
import { evalScript } from "../lib/evaluate.js";
import { gotoWithRetry } from "../net/navigate.js";
import type { RobotsGuard } from "../net/robots-guard.js";
import type { ResolvedConfig } from "./config.js";

const LINK_RE = /(contact|kontakt|impressum|mentions|a-?propos|about)/i;
const LINKS_SCRIPT = `() => Array.from(document.querySelectorAll('a[href]')).map((a) => ({ href: a.href, text: a.textContent || '' }))`;

/** Union of two contact sets (dedup emails/phones, OR the form flag). */
function merge(a: Contacts, b: Contacts): Contacts {
  return {
    emails: [...new Set([...a.emails, ...b.emails])],
    phones: [...new Set([...a.phones, ...b.phones])],
    hasContactForm: a.hasContactForm || b.hasContactForm,
  };
}

/** Same-host Contact-like link URLs from the current page, capped to `max`. */
async function contactLinks(page: Page, max: number, guard?: RobotsGuard): Promise<string[]> {
  const host = new URL(page.url()).host;
  const links = await evalScript<Array<{ href: string; text: string }>>(page, LINKS_SCRIPT);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const { href, text } of links) {
    if (!LINK_RE.test(href) && !LINK_RE.test(text)) continue;
    let u: URL;
    try {
      u = new URL(href, page.url());
    } catch {
      continue;
    }
    if (u.host !== host || seen.has(u.href)) continue;
    if (guard && !(await guard.allowed(u.href))) continue;
    seen.add(u.href);
    out.push(u.href);
    if (out.length >= max) break;
  }
  return out;
}

/** Extract contacts on the page; if none and crawl is on, hunt the Contact page. */
export async function huntContacts(
  page: Page,
  config: ResolvedConfig,
  crawl?: ContactCrawl,
  guard?: RobotsGuard,
): Promise<Contacts> {
  let contacts = await collectContacts(page, config.identity.countryCode);
  if (contacts.emails.length > 0 || !crawl?.enabled) return contacts;
  for (const link of await contactLinks(page, crawl.maxPages ?? 3, guard)) {
    try {
      await gotoWithRetry(page, link, { waitUntil: "domcontentloaded", timeout: 20_000 }, config.retry);
      contacts = merge(contacts, await collectContacts(page, config.identity.countryCode));
      if (contacts.emails.length > 0) break;
    } catch {
      /* skip an unreachable candidate */
    }
  }
  return contacts;
}
