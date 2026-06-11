/**
 * Pure, self-contained DOM heuristic for repeated product cards. All helpers
 * are nested inside {@link collectProducts} so the whole function serializes
 * cleanly for `page.evaluate`, yet runs identically against a linkedom
 * Document in unit tests. Depends only on standard DOM APIs.
 * @module extraction/products-dom
 */
import type { DomDocument, DomElement } from "../interfaces/dom.js";
import type { Product, ProductsOptions } from "../interfaces/products.js";

/**
 * Find repeated product cards in `document`. A card is the smallest element
 * whose tag+class signature repeats ≥3 times AND whose AGGREGATED text holds
 * both a price and a non-price title/link. Prices are matched on the container's
 * full text (not a single leaf), so a currency token and amount split across
 * separate DOM nodes — e.g. `<span>CHF</span><span>6.90</span>` on React sites
 * like digitec — are still detected. With `containerSelector`, the matched
 * elements are the cards directly. Cards without a parseable price are dropped.
 */
export function collectProducts(document: DomDocument, opts: ProductsOptions = {}): Product[] {
  const CURRENCIES: Array<[string, string]> = [
    ["CHF|Fr\\.?|SFr\\.?", "CHF"],
    ["£|GBP", "GBP"],
    ["€|EUR", "EUR"],
    ["¥|JPY", "JPY"],
    ["US\\$|USD|\\$", "USD"],
  ];
  const AMOUNT = "([0-9][0-9'’.,   ]*[0-9]|[0-9])";
  // LAST `.`/`,` is the decimal when 1–2 trailing digits; else all are grouping.
  // Mirrors prices-normalize#normaliseAmount, inlined (runs in-browser, no imports).
  const toNumber = (raw: string): number => {
    const c = raw.replace(/[^0-9.,]/g, "");
    const sep = Math.max(c.lastIndexOf("."), c.lastIndexOf(","));
    const tail = c.slice(sep + 1);
    const dec = sep >= 0 && tail.length >= 1 && tail.length <= 2;
    return Number.parseFloat(dec ? `${c.slice(0, sep).replace(/[.,]/g, "")}.${tail}` : c.replace(/[.,]/g, ""));
  };
  // Aggregated, space-collapsed text of an element (currency + amount joined
  // even when innerText inserts a newline between two child nodes).
  const flat = (el: DomElement): string => (el.textContent || "").replace(/\s+/g, " ").trim();
  const parsePrice = (text: string): { currency: string; price: number } | null => {
    for (const [tok, code] of CURRENCIES) {
      const m = new RegExp(`(?:${tok})\\s*${AMOUNT}|${AMOUNT}\\s*(?:${tok})`, "i").exec(text);
      if (m) {
        const price = toNumber(m[1] ?? m[2] ?? "");
        if (Number.isFinite(price)) return { currency: code, price };
      }
    }
    return null;
  };
  const signature = (el: DomElement): string => {
    const cls = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).sort().join(".");
    return cls ? `${el.tagName}.${cls}` : el.tagName;
  };
  // Longest non-price text from any link/heading/aria-label inside `card` ("" if none).
  const bestTitle = (card: DomElement, priceText: string): string => {
    let best = "";
    for (const el of [...card.querySelectorAll("a, h1, h2, h3, h4, [aria-label]")]) {
      const t = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
      if (t && t !== priceText && !parsePrice(t) && t.length > best.length) best = t;
    }
    return best;
  };
  const urlOf = (card: DomElement): string | undefined => {
    const a = card.matches("a") ? card : card.querySelector("a");
    const href = a?.href || a?.getAttribute("href") || "";
    return href && !href.startsWith("javascript:") ? href : undefined;
  };
  const toProduct = (card: DomElement): Product | null => {
    const text = flat(card);
    const hit = parsePrice(text);
    if (!hit) return null;
    const url = urlOf(card);
    const name = bestTitle(card, text) || flat(card).slice(0, 120);
    return { title: name, price: hit.price, currency: hit.currency, ...(url ? { url } : {}) };
  };
  let cards: DomElement[];
  if (opts.containerSelector) {
    cards = [...document.querySelectorAll(opts.containerSelector)];
  } else {
    const all = [...document.querySelectorAll("*")];
    const counts = new Map<string, number>();
    for (const el of all) counts.set(signature(el), (counts.get(signature(el)) ?? 0) + 1);
    // Candidate = repeated (≥3) container whose aggregated text holds price + title.
    const candidates: DomElement[] = [];
    for (const el of all) {
      if ((counts.get(signature(el)) ?? 0) < 3) continue;
      const text = flat(el);
      if (parsePrice(text) && bestTitle(el, text)) candidates.push(el);
    }
    // Keep the SMALLEST card per cluster: drop any candidate containing another
    // (nested grids → inner card wins, avoids matching the whole grid wrapper).
    cards = candidates.filter((c) => !candidates.some((o) => o !== c && c.contains(o)));
  }
  const out = cards.map(toProduct).filter((p): p is Product => p !== null);
  return opts.limit ? out.slice(0, opts.limit) : out;
}
