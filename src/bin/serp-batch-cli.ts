/**
 * `serp-batch` subcommand handler: run several Google searches, print JSON rows.
 * @module bin/serp-batch-cli
 */
import { resolveConfig } from "../agent/config.js";
import { serpBatch } from "../agent/serp-batch.js";
import type { EngineName } from "../interfaces/engine-types.js";
import { serpBatchToCsv } from "../lib/serp-csv.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Run the `serp-batch` subcommand over `queries`. */
export async function runSerpBatch(queries: string[], values: Values): Promise<void> {
  if (queries.length === 0) {
    process.stderr.write("serp-batch needs at least one query\n");
    process.exit(1);
  }
  const config = resolveConfig({
    engine: str(values.engine) as EngineName | undefined,
    countryCode: str(values.country),
    headless: !values.headed,
    outputDir: str(values["output-dir"]),
    proxyUrl: str(values.proxy),
  });
  const rows = await serpBatch(config, {
    queries,
    rankDomain: str(values["rank-domain"]),
    pages: values["serp-pages"] ? Number(values["serp-pages"]) : undefined,
    hl: str(values.hl),
    gl: str(values.gl),
    delayMs: values["delay-ms"] ? Number(values["delay-ms"]) : undefined,
  });
  process.stdout.write(values.csv ? serpBatchToCsv(rows) : `${JSON.stringify(rows, null, 2)}\n`);
}
