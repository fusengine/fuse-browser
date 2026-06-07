/**
 * `fetch` subcommand handler: HTTP fast-path (TLS impersonation), prints JSON.
 * Emits LLM-ready markdown by default; pass `--text` for raw, `--extract-contacts`
 * for structured contacts extracted from the fetched HTML.
 * @module bin/fetch-cli
 */
import { renderFetch } from "../agent/fetch-render.js";
import { resolveFetchBody } from "../agent/fetch-resolve.js";
import { contactsFromHtml } from "../extraction/contacts/from-html.js";
import { extractPrices } from "../extraction/prices.js";
import { fetchFast } from "../net/fetch-fast.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Run the `fetch` subcommand against `url`. */
export async function runFetchCli(url: string, values: Values): Promise<void> {
  const proxyUrl = str(values.proxy);
  const r = await fetchFast(url, proxyUrl);
  // Escalate an empty SPA shell to a real browser render when --browser-fallback is set.
  const body = await resolveFetchBody(url, r, { browserFallback: values["browser-fallback"] === true, proxyUrl });
  const rendered = await renderFetch(body, { format: values.text === true ? "text" : str(values.format) });
  const country = str(values.country) ?? "CH";
  const filter = values["contact-filter"] === "off" ? "off" : "strict";
  const out = {
    ...rendered,
    prices: values["extract-prices"] ? extractPrices(body.text) : undefined,
    contacts: values["extract-contacts"] ? contactsFromHtml(body.html, country, { url: body.url, filter }) : undefined,
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}
