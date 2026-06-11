/**
 * Unit tests for the pure product-card heuristic, run against a linkedom
 * Document (no real browser). Covers grouping, price/currency parsing, title
 * selection, url capture, containerSelector mode and limit.
 * @module tests/unit/products
 */
import { describe, expect, test } from "bun:test";
import { parseHTML } from "linkedom";
import { collectProducts } from "../../src/extraction/products-dom.js";
import type { DomDocument } from "../../src/interfaces/dom.js";

/** Build a linkedom Document (structurally a DomDocument) from a body fragment. */
function doc(body: string): DomDocument {
  return parseHTML(`<html><body>${body}</body></html>`).document as unknown as DomDocument;
}

/** A grid of `n` cards, each an <article class="card"> with link + price. */
function grid(items: Array<{ title: string; price: string; href?: string }>): string {
  return `<main>${items
    .map(
      (it) =>
        `<article class="card"><a href="${it.href ?? "#"}"><h3>${it.title}</h3></a><span class="price">${it.price}</span></article>`,
    )
    .join("")}</main>`;
}

describe("collectProducts — repeated-card auto-detection", () => {
  test("detects ≥3 repeated cards and links each price to its title", () => {
    const html = grid([
      { title: "Laptop A", price: "CHF 999.-", href: "/a" },
      { title: "Laptop B", price: "CHF 1'299.90", href: "/b" },
      { title: "Laptop C", price: "CHF 750", href: "/c" },
    ]);
    const products = collectProducts(doc(html));
    expect(products).toHaveLength(3);
    const a = products.find((p) => p.title === "Laptop A");
    expect(a).toEqual({ title: "Laptop A", price: 999, currency: "CHF", url: "/a" });
    const b = products.find((p) => p.title === "Laptop B");
    expect(b?.price).toBe(1299.9);
  });

  test("parses EUR, USD, GBP suffix and prefix forms", () => {
    const products = collectProducts(
      doc(grid([
        { title: "Euro Item", price: "1.234,50 €" },
        { title: "Dollar Item", price: "$19.99" },
        { title: "Pound Item", price: "£5" },
      ])),
    );
    const by = (t: string) => products.find((p) => p.title === t);
    expect(by("Euro Item")).toMatchObject({ currency: "EUR", price: 1234.5 });
    expect(by("Dollar Item")).toMatchObject({ currency: "USD", price: 19.99 });
    expect(by("Pound Item")).toMatchObject({ currency: "GBP", price: 5 });
  });

  test("ignores a lone priced node that does not repeat ≥3 times", () => {
    const html = `<main><div class="solo"><span>EUR 42</span></div></main>`;
    expect(collectProducts(doc(html))).toHaveLength(0);
  });

  test("drops repeated cards that carry no price", () => {
    const html = `<main>${["X", "Y", "Z"]
      .map((t) => `<article class="card"><h3>${t}</h3></article>`)
      .join("")}</main>`;
    expect(collectProducts(doc(html))).toHaveLength(0);
  });
});

describe("collectProducts — options", () => {
  test("containerSelector pins the card element directly", () => {
    const html = `<ul><li class="row"><a href="/p1">Phone</a> USD 599</li></ul>`;
    const products = collectProducts(doc(html), { containerSelector: "li.row" });
    expect(products).toEqual([{ title: "Phone", price: 599, currency: "USD", url: "/p1" }]);
  });

  test("limit caps the number of returned cards", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ title: `P${i}`, price: "CHF 10" }));
    expect(collectProducts(doc(grid(items)), { limit: 2 })).toHaveLength(2);
  });
});
