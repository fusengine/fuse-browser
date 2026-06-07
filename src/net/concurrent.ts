/**
 * Bounded-concurrency parallel map. Runs `fn` over `items` with at most
 * `concurrency` tasks in flight (a shared-index worker pool), preserving input
 * order and isolating per-item errors — one failure never aborts the batch.
 * @module net/concurrent
 */

/** Per-item outcome: success carries the value, failure carries the error. */
export type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

/**
 * Map `items` through `fn` with bounded concurrency.
 *
 * @param items - Inputs to process.
 * @param concurrency - Max tasks in flight (clamped to `[1, items.length]`).
 * @param fn - Async mapper; receives the item and its index.
 * @returns Outcomes in input order (each ok/error, never throws).
 */
export async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<Outcome<R>[]> {
  const results: Outcome<R>[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      const item = items[i] as T; // i < items.length, so always defined
      try {
        results[i] = { ok: true, value: await fn(item, i) };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  }
  const workers = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}
