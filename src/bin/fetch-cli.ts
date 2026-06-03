/**
 * `fetch` subcommand handler: HTTP fast-path (TLS impersonation), prints JSON.
 * Emits LLM-ready markdown by default; pass `--text` (or format:"text") for raw.
 * @module bin/fetch-cli
 */
import { extractPrices } from "../extraction/prices.js";
import { htmlToMarkdown, renderMarkdown } from "../extraction/serialize/to-markdown.js";
import { fetchFast } from "../net/fetch-fast.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Run the `fetch` subcommand against `url`. */
export async function runFetchCli(url: string, values: Values): Promise<void> {
  const r = await fetchFast(url, str(values.proxy));
  const format = values.text === true || values.format === "text" ? "text" : "markdown";
  const text =
    format === "text"
      ? r.text.slice(0, 20_000)
      : renderMarkdown(await htmlToMarkdown(r.html, { url: r.url }), 20_000);
  const out = {
    status: r.status,
    url: r.url,
    format,
    text,
    prices: values["extract-prices"] ? extractPrices(r.text) : undefined,
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}
