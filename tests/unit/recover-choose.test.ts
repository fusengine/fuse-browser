import { describe, expect, test } from "bun:test";
import { chooseRecovery, MIN_PROSE_CHARS, nonLinkProseLen } from "../../src/extraction/serialize/recover.js";

const PROSE_HTML = `<html><body><article><p>${"Real prose sentence about a topic. ".repeat(30)}</p></article></body></html>`;
const LINK_SOUP_HTML = `<html><body>${Array.from({ length: 40 }, (_, i) => `<a href="/t${i}">Topic ${i}</a>`).join(" ")}</body></html>`;
const SHORT_SPARSE_HTML =
  '<html><body><nav><a href="/a">A</a> <a href="/b">B</a></nav><p>Log in.</p></body></html>';

describe("chooseRecovery", () => {
  test("non-hollow input stays primary (byte-identical c1)", () => {
    const result = chooseRecovery({
      html: SHORT_SPARSE_HTML,
      c1Text: "Log in.",
      wordCount: 5,
      rawText: "A B Log in.",
    });
    expect(result).toEqual({ text: "Log in.", extraction: "primary" });
  });

  test("hollow + substantial recoverable prose recovers the raw text", () => {
    const raw = "Real prose sentence about a topic. ".repeat(30);
    const result = chooseRecovery({ html: PROSE_HTML, c1Text: "stub", wordCount: 2, rawText: raw });
    expect(result.extraction).toBe("recovered");
    expect(result.text).toContain("Real prose sentence about a topic.");
  });

  test("hollow + link-heavy refuses recovery (stays primary, no link soup)", () => {
    const raw = Array.from({ length: 40 }, (_, i) => `Topic ${i}`).join(" ").repeat(10);
    const result = chooseRecovery({ html: LINK_SOUP_HTML, c1Text: "stub", wordCount: 2, rawText: raw });
    expect(result).toEqual({ text: "stub", extraction: "primary" });
  });

  test("zero word count with substantial prose still stays primary (chrome-heavy SPA shell)", () => {
    // Regression proof: a heavy client-rendered page (e.g. a Skoda stock-listing
    // SPA) can carry thousands of chars of persistent nav/footer chrome as
    // non-link "prose" while Defuddle finds literally no content container
    // (wordCount 0). Recovering raw text there dumped page chrome (and, before
    // the htmlToText script/style fix, raw CSS) instead of real content.
    const result = chooseRecovery({ html: PROSE_HTML, c1Text: "", wordCount: 0, rawText: "raw chrome text" });
    expect(result).toEqual({ text: "", extraction: "primary" });
  });

  test("hollow but below the recoverable-prose floor stays primary (short/sparse page)", () => {
    // proseLen(SHORT_SPARSE_HTML) is well under MIN_PROSE_CHARS — a login/404-style
    // page must never be dumped as raw text just because defuddle's stub is tiny.
    expect(nonLinkProseLen(SHORT_SPARSE_HTML)).toBeLessThan(MIN_PROSE_CHARS);
    const result = chooseRecovery({ html: SHORT_SPARSE_HTML, c1Text: "stub", wordCount: 2, rawText: "A B Log in." });
    expect(result).toEqual({ text: "stub", extraction: "primary" });
  });
});
