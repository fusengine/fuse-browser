#!/usr/bin/env node
/**
 * fuse-browser CLI entry point. Subcommands: `probe`, `fetch`, `fetch-batch`, `serp-batch`, `shots`.
 * @module bin/cli
 */
import { handleMetaFlags, parseArgsOrExit } from "./cli-meta.js";
import { runCrawlCli } from "./crawl-cli.js";
import { runFetchBatchCli } from "./fetch-batch-cli.js";
import { runFetchCli } from "./fetch-cli.js";
import { runProbeCli } from "./probe-cli.js";
import { runSerpBatch } from "./serp-batch-cli.js";
import { runShotsBatch } from "./shots-batch-cli.js";
import { runShots } from "./shots-cli.js";

const USAGE =
  "usage: fuse-browser probe <url> [...] | fetch <url> [--extract-prices --proxy <url>] | fetch-batch <url...> [--concurrency <n>] | serp-batch <query...> --rank-domain <d> | shots <url> --viewports mobile,desktop\n";

const argv = process.argv.slice(2);
handleMetaFlags(argv, USAGE);

const { positionals, values } = parseArgsOrExit({
  args: argv,
  allowPositionals: true,
  options: {
    engine: { type: "string" },
    country: { type: "string" },
    currency: { type: "string" },
    headed: { type: "boolean" },
    "auto-consent": { type: "boolean" },
    "extract-prices": { type: "boolean" },
    "detect-challenges": { type: "boolean" },
    "observe-visual": { type: "boolean" },
    "extract-serp": { type: "boolean" },
    "serp-pages": { type: "string" },
    "rank-domain": { type: "string" },
    csv: { type: "boolean" },
    viewports: { type: "string" },
    "settle-ms": { type: "string" },
    hl: { type: "string" },
    gl: { type: "string" },
    "delay-ms": { type: "string" },
    "human-mode": { type: "boolean" },
    approved: { type: "boolean" },
    replay: { type: "boolean" },
    "wait-ms": { type: "string" },
    "output-dir": { type: "string" },
    "storage-state": { type: "string" },
    proxy: { type: "string" },
    "browser-fallback": { type: "boolean" },
    text: { type: "boolean" },
    format: { type: "string" },
    concurrency: { type: "string" },
    "max-pages": { type: "string" },
    "max-depth": { type: "string" },
    "all-origins": { type: "boolean" },
    "no-robots": { type: "boolean" },
    "proxy-map": { type: "string" },
    "user-data-dir": { type: "string" },
    "site-memory-dir": { type: "string" },
    click: { type: "string", multiple: true },
    fill: { type: "string", multiple: true },
  },
});

const [command, ...rest] = positionals;
const opts = values as Record<string, unknown>;

if (command === "serp-batch") {
  await runSerpBatch(rest, opts);
} else if (command === "shots-batch" && rest.length > 0) {
  await runShotsBatch(rest, opts);
} else if (command === "shots" && rest[0]) {
  await runShots(rest[0], opts);
} else if (command === "fetch-batch" && rest.length > 0) {
  await runFetchBatchCli(rest, opts);
} else if (command === "crawl" && rest[0]) {
  await runCrawlCli(rest[0], opts);
} else if (command === "fetch" && rest[0]) {
  await runFetchCli(rest[0], opts);
} else if (command === "probe" && rest[0]) {
  await runProbeCli(rest[0], opts);
} else {
  process.stderr.write(USAGE);
  process.exit(1);
}
