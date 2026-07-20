/**
 * HTML→text helpers for the fast fetch path. Split out of `fetch-fast.ts` to
 * keep it under the project's 100-line SOLID limit.
 * @module net/fetch-fast-text
 */
import { parseHTML } from "linkedom";
import { visibleText } from "./thin-shell.js";

/**
 * Extract readable body text from an HTML string (no browser, no layout).
 * linkedom's `body`/`documentElement` getters can THROW on rootless input, so
 * the access is guarded — a malformed body yields "" rather than crashing.
 * `<script>`/`<style>` elements are removed from the DOM first — `textContent`
 * includes their source verbatim, and pages that inject critical CSS/JS
 * directly into `<body>` (common with CSS-in-JS SSR) would otherwise leak raw
 * stylesheet/script source into this "readable text", corrupting both price
 * extraction and hollow-extraction recovery downstream.
 */
export function htmlToText(html: string): string {
  try {
    const { document } = parseHTML(html);
    for (const el of document.querySelectorAll("script, style")) el.remove();
    const text = (document.body?.textContent ?? document.documentElement?.textContent ?? "").trim();
    if (text) return text;
  } catch {
    /* fall through to the raw strip below */
  }
  return visibleText(html); // fragment / empty-body pages: recover text from raw HTML
}

/** MIME types linkedom/Defuddle can parse as markup. */
const HTML_MIME = new Set(["text/html", "application/xhtml+xml"]);

/**
 * Decide whether a `content-type` denotes HTML. Strips parameters (`; charset=…`)
 * and matches an exact MIME allowlist — `includes("html")` would wrongly match
 * payloads like `application/vnd.github.html+json`. An **empty** content-type is
 * treated as HTML: servers that omit it commonly serve HTML, and this preserves
 * the prior unconditional behavior.
 */
export function isHtmlContentType(contentType: string): boolean {
  if (contentType === "") return true;
  const mime = (contentType.split(";", 1)[0] ?? "").trim();
  return HTML_MIME.has(mime);
}
