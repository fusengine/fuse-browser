/**
 * Extract crawlable links from an HTML page. Resolves relative hrefs against the
 * page URL, keeps only http(s), strips hash fragments (same server resource),
 * dedups, and (by default) keeps only same-origin links — the inputs a bounded
 * crawler needs.
 * @module net/extract-links
 */
import { parseHTML } from "linkedom";

/**
 * Return the unique, normalized links found in `html`.
 *
 * @param html - Raw page HTML.
 * @param baseUrl - The page URL, used to resolve relative hrefs.
 * @param sameOrigin - Keep only links on `baseUrl`'s origin (default true).
 * @returns Absolute, de-duplicated, fragment-stripped URLs.
 */
export function extractLinks(html: string, baseUrl: string, sameOrigin = true): string[] {
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }
  let document: ReturnType<typeof parseHTML>["document"];
  try {
    document = parseHTML(html).document;
  } catch {
    return [];
  }
  const out = new Set<string>();
  for (const a of document.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (!href) continue;
    let u: URL;
    try {
      u = new URL(href, baseUrl);
    } catch {
      continue;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    if (sameOrigin && u.origin !== origin) continue;
    u.hash = "";
    out.add(u.toString());
  }
  return [...out];
}
