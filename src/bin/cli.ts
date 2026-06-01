#!/usr/bin/env node
/**
 * fuse-browser CLI entry point. Subcommands: `probe`, `serp-batch`.
 * @module bin/cli
 */
import { parseArgs } from "node:util";
import { runProbeCli } from "./probe-cli.js";
import { runSerpBatch } from "./serp-batch-cli.js";

const { positionals, values } = parseArgs({
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
} else if (command === "probe" && rest[0]) {
  await runProbeCli(rest[0], opts);
} else {
  process.stderr.write(
    "usage: fuse-browser probe <url> [...] | fuse-browser serp-batch <query...> --rank-domain <d> [--serp-pages N] [--hl fr] [--gl ch]\n",
  );
  process.exit(1);
}
