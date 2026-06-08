/**
 * `site-shots` subcommand: crawl a site then screenshot each page, print
 * `{ count, pages }` (content + saved PNG paths per page).
 * @module bin/site-shots-cli
 */
import { resolveConfig } from "../agent/config.js";
import { siteShots } from "../agent/site-shots.js";
import { parseViewports } from "../engine/viewport.js";
import type { EngineName } from "../interfaces/engine-types.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "string" ? Number(v) : undefined);

/** Run the `site-shots` subcommand against a seed `url`. */
export async function runSiteShotsCli(url: string, values: Values): Promise<void> {
  const config = resolveConfig({
    engine: str(values.engine) as EngineName | undefined,
    countryCode: str(values.country),
    headless: !values.headed,
    outputDir: str(values["output-dir"]),
    proxyUrl: str(values.proxy),
  });
  const result = await siteShots(config, url, {
    maxPages: num(values["max-pages"]),
    maxDepth: num(values["max-depth"]),
    sameOrigin: values["all-origins"] === true ? false : undefined,
    respectRobots: values["no-robots"] === true ? false : undefined,
    throttleMs: num(values["throttle-ms"]),
    viewports: parseViewports(str(values.viewports)),
    settleMs: num(values["settle-ms"]),
    shotsConcurrency: num(values.concurrency),
    proxyUrl: str(values.proxy),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
