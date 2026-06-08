/**
 * `shots-batch` subcommand: responsive screenshots for many URLs in parallel,
 * print `{ count, results }` (saved PNG paths per URL).
 * @module bin/shots-batch-cli
 */
import { resolveConfig } from "../agent/config.js";
import { captureShotsBatch } from "../agent/shots-batch.js";
import { parseViewports } from "../engine/viewport.js";
import type { EngineName } from "../interfaces/engine-types.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "string" ? Number(v) : undefined);

/** Run the `shots-batch` subcommand against `urls`. */
export async function runShotsBatch(urls: string[], values: Values): Promise<void> {
  const config = resolveConfig({
    engine: str(values.engine) as EngineName | undefined,
    countryCode: str(values.country),
    headless: !values.headed,
    outputDir: str(values["output-dir"]),
    proxyUrl: str(values.proxy),
  });
  const results = await captureShotsBatch(
    config,
    urls,
    parseViewports(str(values.viewports)),
    num(values["settle-ms"]),
    num(values.concurrency),
  );
  process.stdout.write(`${JSON.stringify({ count: results.length, results }, null, 2)}\n`);
}
