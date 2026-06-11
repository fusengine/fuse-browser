/**
 * Types for structured product-card extraction (e-commerce / listings).
 * @module interfaces/products
 */

/** One product card: a repeated container holding both a price and a title/link. */
export interface Product {
  /** Card title / product name (best text node, never the raw price). */
  title: string;
  /** Detected numeric amount (dot decimal, thousands stripped). */
  price: number;
  /** ISO-ish currency code (CHF, EUR, USD, GBP…). */
  currency: string;
  /** Absolute product URL when the card wraps or contains an anchor. */
  url?: string;
}

/** Options for {@link extractProducts}. */
export interface ProductsOptions {
  /** Cap the number of returned cards (default: all). */
  limit?: number;
  /** Force the repeated-card container selector instead of auto-detecting it. */
  containerSelector?: string;
}
