/**
 * Exhaust the infinite-scroll/paginated list of MANY listing URLs in parallel —
 * the collect side of "crawl + collect". Low bounded concurrency (full browser
 * per URL), jittered per-host throttle, per-URL error isolation. Pair with
 * `browser_crawl` (discover listing URLs) to ratisser a whole site.
 * @module agent/collect-batch
 */
import type { CollectedItem } from "../interfaces/extraction.js";
import { jitterMs } from "../lib/retry.js";
import { mapConcurrent } from "../net/concurrent.js";
import { throttleHost } from "../net/throttle.js";
import type { CollectOptions } from "../state/scroll-collect.js";
import { runCollect } from "./collect-run.js";
import type { ResolvedConfig } from "./config.js";

/** Default parallelism — full browser per URL, so keep it low. */
const DEFAULT_CONCURRENCY = 2;

/** Collect options + batch knobs (concurrency, jittered per-host throttle). */
export interface CollectBatchOptions extends CollectOptions {
  concurrency?: number;
  throttleMs?: number;
}

/** One batch entry: the collected list for a URL, or an error. */
export type CollectBatchItem =
  | { url: string; count: number; steps: number; reachedEnd: boolean; items: CollectedItem[] }
  | { url: string; error: string };

/**
 * Run a one-shot collect on each URL, in parallel (bounded).
 *
 * @param config - Resolved browser config.
 * @param urls - Listing/search URLs to exhaust.
 * @param opts - Collect options (`item` selector…) + `concurrency`/`throttleMs`.
 * @returns One entry per input URL, in order.
 */
export async function collectBatch(
  config: ResolvedConfig,
  urls: string[],
  opts: CollectBatchOptions,
): Promise<CollectBatchItem[]> {
  const concurrency = opts.concurrency && opts.concurrency > 0 ? opts.concurrency : DEFAULT_CONCURRENCY;
  const throttleMs = opts.throttleMs ?? 250;
  const outcomes = await mapConcurrent(urls, concurrency, async (url) => {
    await throttleHost(url, jitterMs(throttleMs));
    const r = await runCollect(config, url, opts);
    return { url, count: r.items.length, steps: r.steps, reachedEnd: r.reachedEnd, items: r.items };
  });
  return outcomes.map((o, i) => (o.ok ? o.value : { url: urls[i] ?? "", error: String(o.error) }));
}
