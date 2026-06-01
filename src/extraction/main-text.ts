/**
 * Read the page's MAIN content text, excluding duplicated nav/menu/footer.
 * Targets the main landmark first (structural filter — survives hidden mobile
 * menus that innerText would otherwise include), falling back to <body>.
 * @module extraction/main-text
 */
import type { Page } from "playwright";

/** Main-content selectors, most to least specific; `body` is the fallback. */
const MAIN_SELECTORS = ["main", "[role=main]", "article"];

/**
 * Return the trimmed innerText of the first matching main-content landmark,
 * or the whole body if none is present.
 */
export async function mainText(page: Page, timeout = 3_000): Promise<string> {
  for (const selector of MAIN_SELECTORS) {
    const loc = page.locator(selector).first();
    try {
      if ((await loc.count()) > 0) return await loc.innerText({ timeout });
    } catch {
      /* try the next selector */
    }
  }
  return page.locator("body").innerText({ timeout });
}
