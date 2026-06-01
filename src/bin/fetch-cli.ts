/**
 * `fetch` subcommand handler: HTTP fast-path (TLS impersonation), prints JSON.
 * @module bin/fetch-cli
 */
import { extractPrices } from "../extraction/prices.js";
import { fetchFast } from "../net/fetch-fast.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Run the `fetch` subcommand against `url`. */
export async function runFetchCli(url: string, values: Values): Promise<void> {
  const r = await fetchFast(url, str(values.proxy));
  const out = {
    status: r.status,
    url: r.url,
    text: r.text.slice(0, 20_000),
    prices: values["extract-prices"] ? extractPrices(r.text) : undefined,
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}
