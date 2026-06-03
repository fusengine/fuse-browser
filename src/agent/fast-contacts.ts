/**
 * Fast-path contact cascade: try HTTP-only extraction first and skip the browser
 * when it already yields a complete contact card. Opt-in via `fastPathFirst`.
 * @module agent/fast-contacts
 */
import { join } from "node:path";
import { contactsFromHtml } from "../extraction/contacts/from-html.js";
import type { Contacts } from "../interfaces/contacts.js";
import type { ProbeReport } from "../interfaces/report.js";
import type { ProbeOptions } from "../interfaces/types.js";
import { sha1 } from "../lib/fs.js";
import { fetchFast } from "../net/fetch-fast.js";
import { assertRobotsAllowed } from "../net/robots-guard.js";
import type { ResolvedConfig } from "./config.js";
import { buildReport } from "./report.js";

/** Complete card = at least one email AND one phone (else escalate to the browser). */
export function contactsComplete(c: Contacts): boolean {
  return c.emails.length > 0 && c.phones.length > 0;
}

/** Try HTTP-only contact extraction; return a report if complete, else null (escalate). */
export async function tryFastContacts(
  config: ResolvedConfig,
  url: string,
  options: ProbeOptions,
): Promise<ProbeReport | null> {
  if (!options.extractContacts || !options.fastPathFirst) return null;
  if (!/^https?:\/\//i.test(url)) return null; // fast-path is HTTP-only (skip data:/probeHtml)
  await assertRobotsAllowed(config, url);
  const r = await fetchFast(url, config.proxyUrl ?? undefined);
  const contacts = contactsFromHtml(r.html, config.identity.countryCode, {
    url: r.url,
    filter: options.contactFilter,
  });
  if (!contactsComplete(contacts)) return null;
  return buildReport({
    config,
    targetUrl: r.url,
    title: "",
    text: r.text,
    before: "",
    after: "",
    hasActions: false,
    consent: { handled: false },
    currency: { countryCode: config.identity.countryCode, preferred: config.currency, detected: null, handled: false },
    challenges: {},
    visual: {},
    outcome: { results: [], replaySteps: [], siteMemoryUpdated: false },
    logs: { network: [], console: [] },
    screenshotPath: "",
    reportPath: join(config.outputDir, `${sha1(`${url}-fast`).slice(0, 10)}.json`),
    extractPricesFlag: Boolean(options.extractPrices),
    contacts,
    fastPath: true,
  });
}
