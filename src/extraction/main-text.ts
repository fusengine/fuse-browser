/**
 * Read the page's MAIN content text, excluding duplicated nav/menu/footer.
 * Targets the main landmark first (structural filter — survives hidden mobile
 * menus that innerText would otherwise include), falling back to <body>.
 * @module extraction/main-text
 */
import type { Page } from "playwright";
import { cleanedInnerText } from "./main-text-clean.js";

/** Main-content selectors, most to least specific; `body` is the fallback. */
const MAIN_SELECTORS = ["main", "[role=main]", "article"];

/**
 * Return the trimmed text of the matching main-content landmark, or the whole
 * body if none is present. Each match is cloned and stripped of non-content
 * sub-trees (nav/header/footer/aside/search + filter containers) before its
 * innerText is read, so e.g. a Booking filter sidebar no longer leaks its
 * budget slider into the extracted text. ALL matches of the first hitting
 * selector are joined (not just the first), so a product grid whose cards are
 * repeated `<article>` elements yields every card's text — not only the first.
 * A page with a single `<main>` is unaffected (one match → identical output).
 */
export async function mainText(page: Page, timeout = 3_000): Promise<string> {
  for (const selector of MAIN_SELECTORS) {
    try {
      const joined = await cleanedInnerText(page, selector);
      if (joined) return joined;
    } catch {
      /* try the next selector */
    }
  }
  return (await page.locator("body").innerText({ timeout })).trim();
}
