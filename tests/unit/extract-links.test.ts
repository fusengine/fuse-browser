import { describe, expect, test } from "bun:test";
import { extractLinks } from "../../src/net/extract-links.js";

const BASE = "https://example.com/docs/";

describe("extractLinks", () => {
  test("resolves relative links and keeps same-origin only", () => {
    const html = `
      <a href="intro">a</a>
      <a href="/guide">b</a>
      <a href="https://example.com/api">c</a>
      <a href="https://other.com/x">external</a>
    `;
    const links = extractLinks(html, BASE);
    expect(links).toContain("https://example.com/docs/intro");
    expect(links).toContain("https://example.com/guide");
    expect(links).toContain("https://example.com/api");
    expect(links).not.toContain("https://other.com/x");
  });

  test("strips hash fragments and dedups", () => {
    const html = `<a href="/p#a">1</a><a href="/p#b">2</a><a href="/p">3</a>`;
    expect(extractLinks(html, BASE)).toEqual(["https://example.com/p"]);
  });

  test("drops non-http(s) schemes (mailto, javascript, tel)", () => {
    const html = `<a href="mailto:x@y.com">m</a><a href="javascript:void(0)">j</a><a href="tel:+1">t</a>`;
    expect(extractLinks(html, BASE)).toEqual([]);
  });

  test("sameOrigin:false keeps cross-origin links", () => {
    const html = `<a href="https://other.com/x">e</a>`;
    expect(extractLinks(html, BASE, false)).toContain("https://other.com/x");
  });

  test("malformed input yields no links (no throw)", () => {
    expect(extractLinks("not html", BASE)).toEqual([]);
    expect(extractLinks("<a href=''></a>", "not-a-url")).toEqual([]);
  });
});
