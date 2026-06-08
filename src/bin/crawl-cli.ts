/**
 * `crawl` subcommand: bounded same-origin crawl from a seed URL via the HTTP
 * fast-path, print `{ count, pages }` as JSON.
 * @module bin/crawl-cli
 */
import { crawl } from "../agent/crawl.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "string" ? Number(v) : undefined);

/** Run the `crawl` subcommand against `url`. */
export async function runCrawlCli(url: string, values: Values): Promise<void> {
  const result = await crawl(url, {
    maxPages: num(values["max-pages"]),
    maxDepth: num(values["max-depth"]),
    sameOrigin: values["all-origins"] === true ? false : undefined,
    concurrency: num(values.concurrency),
    format: values.text === true ? "text" : str(values.format),
    browserFallback: values["browser-fallback"] === true,
    respectRobots: values["no-robots"] === true ? false : undefined,
    throttleMs: num(values["throttle-ms"]),
    proxyUrl: str(values.proxy),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
