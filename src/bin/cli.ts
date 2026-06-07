#!/usr/bin/env node
/**
 * fuse-browser CLI entry point. Subcommands: `probe`, `fetch`, `fetch-batch`, `serp-batch`, `shots`.
 * @module bin/cli
 */
import { parseArgs } from "node:util";
import { runFetchBatchCli } from "./fetch-batch-cli.js";
import { runFetchCli } from "./fetch-cli.js";
import { runProbeCli } from "./probe-cli.js";
import { runSerpBatch } from "./serp-batch-cli.js";
import { runShots } from "./shots-cli.js";
import { VERSION } from "../lib/version.js";

const USAGE =
  "usage: fuse-browser probe <url> [...] | fetch <url> [--extract-prices --proxy <url>] | fetch-batch <url...> [--concurrency <n>] | serp-batch <query...> --rank-domain <d> | shots <url> --viewports mobile,desktop\n";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(USAGE);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(`${VERSION}\n`);
  process.exit(0);
}

let parsed: ReturnType<typeof parseArgs>;
try {
  parsed = parseArgs({
    args,
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
      "proxy-map": { type: "string" },
      "user-data-dir": { type: "string" },
      "site-memory-dir": { type: "string" },
      click: { type: "string", multiple: true },
      fill: { type: "string", multiple: true },
    },
  });
} catch (err) {
  const error = err as NodeJS.ErrnoException;
  if (error.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
    const message = String(error.message).replace(/\. To specify[\s\S]*$/, "");
    process.stderr.write(`error: ${message}\n`);
    process.exit(1);
  }
  throw err;
}

const [command, ...rest] = parsed.positionals;
const opts = parsed.values as Record<string, unknown>;

if (command === "serp-batch") {
  await runSerpBatch(rest, opts);
} else if (command === "shots" && rest[0]) {
  await runShots(rest[0], opts);
} else if (command === "fetch-batch" && rest.length > 0) {
  await runFetchBatchCli(rest, opts);
} else if (command === "fetch" && rest[0]) {
  await runFetchCli(rest[0], opts);
} else if (command === "probe" && rest[0]) {
  await runProbeCli(rest[0], opts);
} else {
  process.stderr.write(USAGE);
  process.exit(1);
}
