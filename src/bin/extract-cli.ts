/**
 * `extract` subcommand handler: pull `text`, `prices`, or `markdown` from a page.
 * Prints `{url, kind, ...}` JSON.
 * @module bin/extract-cli
 */
import type { Page } from "playwright";
import { mainText } from "../extraction/main-text.js";
import { extractPrices } from "../extraction/prices.js";
import { htmlToMarkdown, renderMarkdown } from "../extraction/serialize/to-markdown.js";
import { withCliPage } from "./cli-page.js";

type Values = Record<string, unknown>;
type Kind = "text" | "prices" | "markdown";

/** Extract one payload of the requested `kind` from the live `page`. */
async function extractKind(page: Page, kind: Kind): Promise<Record<string, unknown>> {
  const url = page.url();
  if (kind === "prices") {
    const prices = extractPrices(await mainText(page));
    return { url, kind, count: prices.length, prices };
  }
  if (kind === "markdown") {
    const doc = await htmlToMarkdown(await page.content(), { url });
    return { url, kind, meta: doc.meta, markdown: renderMarkdown(doc) };
  }
  return { url, kind, text: await mainText(page) };
}

/** Run the `extract` subcommand against `url`. */
export async function runExtractCli(url: string, values: Values): Promise<void> {
  const raw = typeof values.kind === "string" ? values.kind : "text";
  if (raw !== "text" && raw !== "prices" && raw !== "markdown") {
    process.stderr.write("extract: --kind must be text | prices | markdown\n");
    process.exit(2);
  }
  const result = await withCliPage(url, values, (page) => extractKind(page, raw));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
