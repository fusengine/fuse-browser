#!/usr/bin/env node
/**
 * fuse-browser CLI entry point (`probe` subcommand).
 * @module bin/cli
 */
import { parseArgs } from "node:util";
import { BrowserAgent } from "../agent/browser-agent.js";
import { compactReport } from "../agent/compact.js";
import { GuardrailViolation } from "../lib/errors.js";
import type { EngineName } from "../interfaces/engine-types.js";
import type { BrowserAction } from "../interfaces/types.js";

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

const [command, url] = positionals;
if (command !== "probe" || !url) {
  process.stderr.write("usage: fuse-browser probe <url> [--click TEXT] [--fill TARGET=VALUE] [--country US] [--headed] ...\n");
  process.exit(1);
}

const actions: BrowserAction[] = [];
for (const item of (values.fill ?? []) as string[]) {
  const eq = item.indexOf("=");
  if (eq < 0) {
    process.stderr.write("--fill must be TARGET=VALUE\n");
    process.exit(1);
  }
  actions.push({ type: "fill", target: item.slice(0, eq), value: item.slice(eq + 1) });
}
for (const target of (values.click ?? []) as string[]) actions.push({ type: "click", target });

const agent = new BrowserAgent({
  engine: values.engine as EngineName | undefined,
  countryCode: values.country,
  currency: values.currency,
  headless: !values.headed,
  humanMode: Boolean(values["human-mode"]),
  outputDir: values["output-dir"],
  storageStatePath: values["storage-state"],
  proxyUrl: values.proxy,
  proxyMapPath: values["proxy-map"],
  userDataDir: values["user-data-dir"],
  replayEnabled: Boolean(values.replay),
  siteMemoryDir: values["site-memory-dir"],
});

try {
  const report = await agent.probe(url, {
    actions,
    humanApproved: Boolean(values.approved),
    autoConsent: Boolean(values["auto-consent"]),
    extractPrices: Boolean(values["extract-prices"]),
    detectChallenges: Boolean(values["detect-challenges"]),
    observeVisual: Boolean(values["observe-visual"]),
    extractSerp: Boolean(values["extract-serp"]),
    waitMs: values["wait-ms"] ? Number(values["wait-ms"]) : 0,
  });
  process.stdout.write(`${JSON.stringify(compactReport(report), null, 2)}\n`);
} catch (err) {
  if (err instanceof GuardrailViolation) {
    process.stderr.write(`BLOCKED: ${err.message}\n`);
    process.exit(2);
  }
  throw err;
}
