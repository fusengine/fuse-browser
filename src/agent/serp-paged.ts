/**
 * Collect a Google SERP across multiple pages (start=0,10,...), merging organic
 * results by URL with continuous positions. Page 1 is the already-loaded page.
 * @module agent/serp-paged
 */
import type { Page } from "playwright";
import { extractSerp } from "../extraction/serp.js";
import type { Serp } from "../interfaces/extraction.js";
import type { RetryConfig } from "../interfaces/net.js";
import { gotoWithRetry } from "../net/navigate.js";

/** Build the URL for SERP page offset `start`. */
function withStart(url: string, start: number): string {
  const u = new URL(url);
  u.searchParams.set("start", String(start));
  return u.toString();
}

/** Extract the SERP over `pages` pages (>=1), merging organic by URL (first wins). */
export async function collectSerp(page: Page, pages: number, retry: RetryConfig): Promise<Serp> {
  const merged = await extractSerp(page);
  if (pages <= 1) return merged;
  const seen = new Set(merged.organic.map((r) => r.url));
  const base = page.url();
  for (let i = 1; i < pages; i += 1) {
    await gotoWithRetry(page, withStart(base, i * 10), { waitUntil: "domcontentloaded", timeout: 30_000 }, retry);
    const next = await extractSerp(page);
    for (const r of next.organic) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      merged.organic.push({ ...r, position: merged.organic.length + 1 });
    }
  }
  return merged;
}
