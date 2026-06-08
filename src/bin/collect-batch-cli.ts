/**
 * `collect-batch` subcommand: exhaust the list of multiple URLs in parallel,
 * print `{ count, results }` (collected items per URL).
 * @module bin/collect-batch-cli
 */
import { collectBatch } from "../agent/collect-batch.js";
import { resolveConfig } from "../agent/config.js";
import type { EngineName } from "../interfaces/engine-types.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "string" ? Number(v) : undefined);

/** Run the `collect-batch` subcommand against `urls` (requires `--item`). */
export async function runCollectBatchCli(urls: string[], values: Values): Promise<void> {
  const config = resolveConfig({
    engine: str(values.engine) as EngineName | undefined,
    countryCode: str(values.country),
    headless: !values.headed,
    outputDir: str(values["output-dir"]),
    proxyUrl: str(values.proxy),
  });
  const results = await collectBatch(config, urls, {
    item: str(values.item) ?? "",
    container: str(values.container),
    maxSteps: num(values["max-steps"]),
    extractPrices: values["extract-prices"] === true,
    concurrency: num(values.concurrency),
    throttleMs: num(values["throttle-ms"]),
  });
  process.stdout.write(`${JSON.stringify({ count: results.length, results }, null, 2)}\n`);
}
