/**
 * Full-site visual + content snapshot: crawl a site (HTTP fast-path, keeping the
 * markdown it already extracts) then screenshot each discovered page. Returns,
 * per page, both the content and the responsive shots — the crawl markdown is
 * surfaced, not discarded. Reuses `crawl` + `captureShotsBatch`.
 * @module agent/site-shots
 */
import type { ViewportInput } from "../engine/viewport.js";
import { parseViewports } from "../engine/viewport.js";
import { type CrawlOptions, crawl } from "./crawl.js";
import type { ResolvedConfig } from "./config.js";
import { captureShotsBatch, type ShotsBatchItem } from "./shots-batch.js";
import type { Shot } from "./shots.js";

/** Crawl bounds + screenshot knobs for a site snapshot. */
export interface SiteShotsOptions extends CrawlOptions {
  viewports?: ViewportInput[];
  settleMs?: number;
  shotsConcurrency?: number;
}

/** One page of the site: its content (markdown/text) + responsive screenshots. */
export interface SitePage {
  url: string;
  depth: number;
  text: string;
  shots: Shot[];
  shotsError?: string;
}

/** Attach each URL's shots (or error) to its crawled page, matched by URL. */
export function mergePagesWithShots(
  pages: { url: string; depth: number; text: string }[],
  shots: ShotsBatchItem[],
): SitePage[] {
  const byUrl = new Map(shots.map((s) => [s.url, s]));
  return pages.map((p) => {
    const s = byUrl.get(p.url);
    const shotList = s && "shots" in s ? s.shots : [];
    const shotsError = s && "error" in s ? s.error : undefined;
    return { url: p.url, depth: p.depth, text: p.text, shots: shotList, ...(shotsError ? { shotsError } : {}) };
  });
}

/**
 * Crawl `seed` then screenshot every discovered page.
 *
 * @param config - Resolved browser config (for the screenshot phase).
 * @param seed - Starting URL.
 * @param opts - Crawl bounds + `viewports`/`settleMs`/`shotsConcurrency`.
 * @returns `{ count, pages }` with content + shots per page.
 */
export async function siteShots(config: ResolvedConfig, seed: string, opts: SiteShotsOptions = {}): Promise<{ count: number; pages: SitePage[] }> {
  const { pages } = await crawl(seed, opts);
  const viewports = opts.viewports ?? parseViewports(undefined);
  const shots = await captureShotsBatch(config, pages.map((p) => p.url), viewports, opts.settleMs, opts.shotsConcurrency, opts.onProgress);
  const merged = mergePagesWithShots(pages, shots);
  return { count: merged.length, pages: merged };
}
