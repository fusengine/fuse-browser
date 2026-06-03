/**
 * Email extraction with light deobfuscation, placeholder filtering (opt-out via
 * `filter: "off"`) and same-domain-first ordering when a page URL is provided.
 * @module extraction/contacts/email
 */
import type { ContactFilter } from "../../interfaces/contacts.js";

const EMAIL_GLOBAL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const EMAIL_ONE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const JUNK = /\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?)$/i;
const BARE = /([a-z0-9._%+-]{1,64})\s+at\s+([a-z0-9.-]{1,255}(?:\s+dot\s+[a-z]{2,24})+)/gi;
/** Template/demo placeholder emails seen on starter sites — dropped in strict mode. */
const PLACEHOLDER =
  /(votre[-_]?(?:boutique|site|domaine|entreprise|nom|email|adresse)|your[-_]?(?:domain|site|company|email|name)|domaine?\.tld|domain\.tld|@(?:votre|your)|^(?:nom|prenom|email|mail|name|user)@)/i;

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Decode unambiguous obfuscation: HTML entities and bracketed [at]/[dot]. */
export function deobfuscate(input: string): string {
  return input
    .replace(/&#0*64;/gi, "@")
    .replace(/&#0*46;/gi, ".")
    .replace(/\s*[([{]\s*(?:at|arobase)\s*[)\]}]\s*/gi, "@")
    .replace(/\s*[([{]\s*dot\s*[)\]}]\s*/gi, ".");
}

/** Decode bare "x at y dot z" only inside a tight span (avoids prose false positives). */
function deobfuscateBare(input: string): string {
  return input.replace(BARE, (m) => m.replace(/\s+at\s+/gi, "@").replace(/\s+dot\s+/gi, "."));
}

/** Lowercased host of a page URL (strips scheme + www). */
function siteHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Same-domain emails first (keeps all — SMBs legitimately use gmail/bluewin). */
function orderBySameDomain(list: string[], host: string): string[] {
  if (!host) return list;
  const same = (e: string): boolean => {
    const d = e.split("@")[1] ?? "";
    return d === host || d.endsWith(`.${host}`) || host.endsWith(`.${d}`);
  };
  return [...list.filter(same), ...list.filter((e) => !same(e))];
}

/** Extract + dedupe emails; placeholder-filtered (strict) and same-domain-ordered. */
export function extractEmails(
  signals: { html: string; text: string; mailto: string[] },
  opts: { filter?: ContactFilter; url?: string } = {},
): string[] {
  const set = new Set<string>();
  const add = (value: string): void => {
    const addr = value.trim().toLowerCase();
    if (EMAIL_ONE.test(addr) && !JUNK.test(addr)) set.add(addr);
  };
  for (const href of signals.mailto) {
    add(safeDecode(href.replace(/^mailto:/i, "").split("?")[0] ?? ""));
  }
  const raw = `${signals.text}\n${signals.html}`;
  const haystack = deobfuscateBare(deobfuscate(raw.length > 500_000 ? raw.slice(0, 500_000) : raw));
  for (const match of haystack.matchAll(EMAIL_GLOBAL)) add(match[0]);
  let list = [...set];
  if ((opts.filter ?? "strict") !== "off") list = list.filter((e) => !PLACEHOLDER.test(e));
  return opts.url ? orderBySameDomain(list, siteHost(opts.url)) : list;
}
