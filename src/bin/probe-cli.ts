/**
 * `probe` subcommand handler: run one probe and print the compact report.
 * @module bin/probe-cli
 */
import { BrowserAgent } from "../agent/browser-agent.js";
import { compactReport } from "../agent/compact.js";
import type { EngineName } from "../interfaces/engine-types.js";
import type { BrowserAction } from "../interfaces/types.js";
import { GuardrailViolation } from "../lib/errors.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

function buildActions(values: Values): BrowserAction[] {
  const actions: BrowserAction[] = [];
  for (const item of (values.fill as string[] | undefined) ?? []) {
    const eq = item.indexOf("=");
    if (eq < 0) {
      process.stderr.write("--fill must be TARGET=VALUE\n");
      process.exit(1);
    }
    actions.push({ type: "fill", target: item.slice(0, eq), value: item.slice(eq + 1) });
  }
  for (const target of (values.click as string[] | undefined) ?? []) actions.push({ type: "click", target });
  return actions;
}

/** Run the `probe` subcommand against `url`. */
export async function runProbeCli(url: string, values: Values): Promise<void> {
  const agent = new BrowserAgent({
    engine: str(values.engine) as EngineName | undefined,
    countryCode: str(values.country),
    currency: str(values.currency),
    headless: !values.headed,
    humanMode: Boolean(values["human-mode"]),
    outputDir: str(values["output-dir"]),
    storageStatePath: str(values["storage-state"]),
    proxyUrl: str(values.proxy),
    proxyMapPath: str(values["proxy-map"]),
    userDataDir: str(values["user-data-dir"]),
    replayEnabled: Boolean(values.replay),
    siteMemoryDir: str(values["site-memory-dir"]),
  });
  try {
    const report = await agent.probe(url, {
      actions: buildActions(values),
      humanApproved: Boolean(values.approved),
      autoConsent: Boolean(values["auto-consent"]),
      extractPrices: Boolean(values["extract-prices"]),
      detectChallenges: Boolean(values["detect-challenges"]),
      observeVisual: Boolean(values["observe-visual"]),
      extractSerp: Boolean(values["extract-serp"]),
      serpPages: values["serp-pages"] ? Number(values["serp-pages"]) : undefined,
      rankDomain: str(values["rank-domain"]),
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
}
