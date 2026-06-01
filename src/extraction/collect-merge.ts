/**
 * Pure merge/dedup for scroll-collected rows. Virtualized lists recycle DOM
 * nodes, so rows are keyed by a stable identifier (data-id › href › text), not
 * by node identity. Kept side-effect-free for unit testing.
 * @module extraction/collect-merge
 */
import type { CollectedItem, Price } from "../interfaces/extraction.js";

/** A raw row harvested in the page context (before price enrichment). */
export interface RawRow {
  key: string;
  text: string;
  url: string | null;
}

/**
 * Merge `rows` into `seen` (keyed dedup), optionally enriching each new row
 * with prices via `pricer`. Returns the number of rows that were new.
 */
export function mergeItems(
  seen: Map<string, CollectedItem>,
  rows: RawRow[],
  pricer: ((text: string) => Price[]) | null,
): number {
  let added = 0;
  for (const row of rows) {
    if (!row.key || seen.has(row.key)) continue;
    const item: CollectedItem = { key: row.key, text: row.text, url: row.url };
    if (pricer) item.prices = pricer(row.text);
    seen.set(row.key, item);
    added++;
  }
  return added;
}
