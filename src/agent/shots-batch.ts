/**
 * Capture responsive screenshots for many URLs — the visual counterpart of
 * fetch-batch. Each URL goes through {@link captureShots} (its own browser),
 * with LOW bounded concurrency since every page is a full Chromium instance.
 * A failed URL becomes an error entry instead of aborting the batch.
 * @module agent/shots-batch
 */
import { BrowserPool } from "../engine/browser-pool.js";
import type { ViewportInput } from "../engine/viewport.js";
import { mapConcurrent } from "../net/concurrent.js";
import type { ResolvedConfig } from "./config.js";
import { type Shot, shotsOnPage } from "./shots.js";

/** Default parallelism — full browsers are RAM-heavy, so keep it low. */
const DEFAULT_CONCURRENCY = 2;

/** One batch entry: the saved shots for a URL, or an error. */
export type ShotsBatchItem = { url: string; shots: Shot[] } | { url: string; error: string };

/**
 * Screenshot each URL at the given viewports, in parallel (bounded).
 *
 * @param config - Resolved browser config (engine, output dir, …).
 * @param urls - URLs to capture.
 * @param viewports - Viewports per URL.
 * @param settleMs - Settle delay before each capture.
 * @param concurrency - Max browsers in flight (default 2).
 * @param onProgress - Called after each URL settles: `(done, total, url)`.
 * @returns One item per input URL, in order.
 */
export async function captureShotsBatch(
  config: ResolvedConfig,
  urls: string[],
  viewports: ViewportInput[],
  settleMs?: number,
  concurrency?: number,
  onProgress?: (done: number, total: number, label?: string) => void,
): Promise<ShotsBatchItem[]> {
  const limit = concurrency && concurrency > 0 ? concurrency : DEFAULT_CONCURRENCY;
  const pool = new BrowserPool(config);
  let done = 0;
  try {
    const outcomes = await mapConcurrent(urls, limit, async (url) => {
      try {
        return await pool.withPage((page) => shotsOnPage(page, config, url, viewports, settleMs));
      } finally {
        onProgress?.(++done, urls.length, url);
      }
    });
    return outcomes.map((o, i) => (o.ok ? { url: urls[i] ?? "", shots: o.value } : { url: urls[i] ?? "", error: String(o.error) }));
  } finally {
    await pool.close();
  }
}
