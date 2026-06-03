/**
 * Email extraction with light deobfuscation (HTML entities, bracketed [at]/[dot],
 * and tight bare "x at y dot z" spans). Prose " at " alone is NOT decoded.
 * @module extraction/contacts/email
 */

const EMAIL_GLOBAL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const EMAIL_ONE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
/** Asset-like matches (e.g. `sprite@2x.png`) that look like emails but are not. */
const JUNK = /\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?)$/i;
/** Bare "user at domain dot tld" — needs ≥1 " dot " so prose " at " is not decoded. */
const BARE = /([a-z0-9._%+-]{1,64})\s+at\s+([a-z0-9.-]{1,255}(?:\s+dot\s+[a-z]{2,24})+)/gi;

/** decodeURIComponent that never throws on malformed input. */
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

/** Extract + dedupe emails from mailto hrefs and the (deobfuscated) text/HTML. */
export function extractEmails(signals: { html: string; text: string; mailto: string[] }): string[] {
  const set = new Set<string>();
  const add = (value: string): void => {
    const addr = value.trim().toLowerCase();
    if (EMAIL_ONE.test(addr) && !JUNK.test(addr)) set.add(addr);
  };
  for (const href of signals.mailto) {
    add(safeDecode(href.replace(/^mailto:/i, "").split("?")[0] ?? ""));
  }
  const haystack = deobfuscateBare(deobfuscate(`${signals.text}\n${signals.html}`));
  for (const match of haystack.matchAll(EMAIL_GLOBAL)) add(match[0]);
  return [...set];
}
