/**
 * `products` subcommand handler: extract repeated product cards from a page.
 * Prints `{url, count, products}` JSON.
 * @module bin/products-cli
 */
import { extractProducts } from "../extraction/products.js";
import { withCliPage } from "./cli-page.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Run the `products` subcommand against `url`. */
export async function runProductsCli(url: string, values: Values): Promise<void> {
  const limit = values.limit ? Number(values.limit) : undefined;
  const containerSelector = str(values.container);
  const products = await withCliPage(url, values, (page) => extractProducts(page, { limit, containerSelector }));
  process.stdout.write(`${JSON.stringify({ url, count: products.length, products }, null, 2)}\n`);
}
