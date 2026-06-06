/**
 * `fetch` subcommand handler: HTTP fast-path (TLS impersonation), prints JSON.
 * Emits LLM-ready markdown by default; pass `--text` for raw, `--extract-contacts`
 * for structured contacts extracted from the fetched HTML.
 * @module bin/fetch-cli
 */
import { contactsFromHtml } from "../extraction/contacts/from-html.js";
import { extractPrices } from "../extraction/prices.js";
import { htmlToMarkdown, renderMarkdown } from "../extraction/serialize/to-markdown.js";
import { fetchFast } from "../net/fetch-fast.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Run the `fetch` subcommand against `url`. */
export async function runFetchCli(url: string, values: Values): Promise<void> {
  const r = await fetchFast(url, str(values.proxy));
  // Non-HTML bodies (JSON, plain text) are returned raw — markdown only applies to HTML.
  const format = values.text === true || values.format === "text" || !r.isHtml ? "text" : "markdown";
  const text =
    format === "text"
      ? r.text.slice(0, 20_000)
      : renderMarkdown(await htmlToMarkdown(r.html, { url: r.url }), 20_000);
  const country = str(values.country) ?? "CH";
  const filter = values["contact-filter"] === "off" ? "off" : "strict";
  const out = {
    status: r.status,
    url: r.url,
    format,
    text,
    prices: values["extract-prices"] ? extractPrices(r.text) : undefined,
    contacts: values["extract-contacts"] ? contactsFromHtml(r.html, country, { url: r.url, filter }) : undefined,
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}
