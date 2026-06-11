/**
 * Structured product-card extraction from the live DOM. Detects repeated card
 * containers that hold both a price and a title/link, returning one
 * `{title, price, currency, url?}` per card. Generic across digitec, booking,
 * amazon… because it groups by repeated tag+class signatures, not site CSS.
 * The heuristic lives in {@link collectProducts} (pure, unit-tested); here it is
 * serialized into the page so it runs on the rendered DOM after hydration.
 * @module extraction/products
 */
import type { Page } from "playwright";
import type { Product, ProductsOptions } from "../interfaces/products.js";
import { evalScriptArg } from "../lib/evaluate.js";
import { collectProducts } from "./products-dom.js";

/**
 * Browser script: run the self-contained collector against `document`.
 * A passthrough `__name` shim is injected first because tsx/esbuild rewrites
 * named functions with `__name(fn, "…")` for `keepNames`; that helper is absent
 * in the page, so without the shim the serialized source throws
 * `ReferenceError: __name is not defined`. The shim is a harmless no-op when the
 * source carries no such call (production/compiled builds).
 */
const SCRIPT = `(opts) => { var __name = (f) => f; return (${collectProducts.toString()})(document, opts); }`;

/**
 * Extract repeated product cards from the page's rendered DOM.
 * @param page - A live Playwright page.
 * @param opts - Optional limit / forced container selector.
 * @returns One product per detected card (price-bearing cards only).
 */
export function extractProducts(page: Page, opts: ProductsOptions = {}): Promise<Product[]> {
  return evalScriptArg<Product[], ProductsOptions>(page, SCRIPT, opts);
}
