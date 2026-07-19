import { describe, expect, test } from "bun:test";
import { extractPrices } from "../../src/extraction/prices.js";
import { htmlToText, isHtmlContentType } from "../../src/net/fetch-fast.js";

describe("htmlToText", () => {
  test("extracts readable body text from HTML", () => {
    const t = htmlToText("<html><body><h1>Shop</h1><p>Price: CHF 99</p></body></html>");
    expect(t).toContain("Shop");
    expect(t).toContain("CHF 99");
  });

  test("output feeds the price extractor", () => {
    const t = htmlToText("<html><body><div>EUR 42</div></body></html>");
    expect(extractPrices(t).some((p) => p.currency === "EUR" && p.amount === 42)).toBe(true);
  });

  test("empty/bodyless HTML yields empty string", () => {
    expect(htmlToText("<html></html>")).toBe("");
  });

  test("rootless/malformed input recovers text via raw strip (no throw, no empty)", () => {
    // linkedom can throw / yield an empty body on rootless input; the fallback
    // strips tags from the raw HTML so we still surface the visible text.
    expect(htmlToText("not html, just plain text")).toBe("not html, just plain text");
  });

  test("fragment page with no <html>/<body> still yields its text", () => {
    expect(htmlToText("<h1>Title</h1><pre>BODY CONTENT</pre>")).toContain("BODY CONTENT");
  });

  test("strips <script>/<style> source out of the readable text", () => {
    // Regression: a live SPA (Skoda stock listing) injects a large critical-CSS
    // <style> tag directly in <body> — textContent includes tag source verbatim
    // unless script/style elements are removed from the DOM first, which used to
    // leak raw CSS into hollow-extraction "recovered" output.
    const html =
      "<html><body><style>body{color:#161718FF;font-family:SKODA Next}</style>" +
      '<script>var x = "should not appear";</script>' +
      "<p>Real page copy.</p></body></html>";
    const t = htmlToText(html);
    expect(t).toContain("Real page copy.");
    expect(t).not.toContain("color:#161718FF");
    expect(t).not.toContain("should not appear");
  });
});

describe("isHtmlContentType", () => {
  test("absent content-type is treated as HTML (preserves prior behavior)", () => {
    expect(isHtmlContentType("")).toBe(true);
  });

  test("text/html with charset params is HTML", () => {
    expect(isHtmlContentType("text/html; charset=utf-8")).toBe(true);
    expect(isHtmlContentType("application/xhtml+xml")).toBe(true);
  });

  test("JSON and plain text are not HTML", () => {
    expect(isHtmlContentType("application/json")).toBe(false);
    expect(isHtmlContentType("text/plain; charset=utf-8")).toBe(false);
  });

  test("html-lookalike MIME types are not matched (no substring trap)", () => {
    expect(isHtmlContentType("application/vnd.github.html+json")).toBe(false);
  });
});
