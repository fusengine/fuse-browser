/**
 * `fetch-batch` subcommand: fetch multiple URLs in parallel via the HTTP
 * fast-path, print a JSON array of results. Mirrors `fetch` per-URL flags.
 * @module bin/fetch-batch-cli
 */
import { fetchBatch } from "../agent/fetch-batch.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Run the `fetch-batch` subcommand against `urls`. */
export async function runFetchBatchCli(urls: string[], values: Values): Promise<void> {
  const results = await fetchBatch(urls, {
    format: values.text === true ? "text" : str(values.format),
    browserFallback: values["browser-fallback"] === true,
    proxyUrl: str(values.proxy),
    concurrency: typeof values.concurrency === "string" ? Number(values.concurrency) : undefined,
  });
  process.stdout.write(`${JSON.stringify({ count: results.length, results }, null, 2)}\n`);
}
