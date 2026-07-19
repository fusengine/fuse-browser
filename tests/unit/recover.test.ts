import { describe, expect, test } from "bun:test";
import {
  HOLLOW_MAX_WORDS,
  isHollow,
  nonLinkProseLen,
  normalizeWhitespace,
} from "../../src/extraction/serialize/recover.js";

const PROSE_HTML = `<html><body><article><p>${"Real prose sentence about a topic. ".repeat(30)}</p></article></body></html>`;
const LINK_SOUP_HTML = `<html><body>${Array.from({ length: 40 }, (_, i) => `<a href="/t${i}">Topic ${i}</a>`).join(" ")}</body></html>`;
// JS string literal containing a bare `</a>` between two real anchors — must not
// make the anchor regex span across the whole script into unrelated markup.
const SCRIPT_WITH_FAKE_CLOSE_TAG_HTML =
  '<html><body><a href="/x">X</a><script>var s = "</a>";</script><p>Some short prose here.</p></body></html>';

describe("nonLinkProseLen", () => {
  test("prose-only page: non-link prose ~= visible text (no anchors)", () => {
    expect(nonLinkProseLen(PROSE_HTML)).toBeGreaterThan(900);
  });

  test("link-soup page has ~zero non-link prose (only inter-anchor whitespace)", () => {
    expect(nonLinkProseLen(LINK_SOUP_HTML)).toBeLessThan(50);
  });

  test("empty html has zero non-link prose (no divide-by-zero)", () => {
    expect(nonLinkProseLen("<html><body></body></html>")).toBe(0);
  });

  test("a JS string literal '</a>' does not corrupt the anchor scan", () => {
    // Without stripping <script> first, the anchor regex would span from the
    // real <a> to the fake "</a>" inside the script, eating "Some short prose".
    expect(nonLinkProseLen(SCRIPT_WITH_FAKE_CLOSE_TAG_HTML)).toBeGreaterThan(15);
  });
});

describe("isHollow", () => {
  test("low word count + low capture ratio is hollow", () => {
    expect(isHollow(50, 100, 5000)).toBe(true);
  });

  test("word count at/above the cap is not hollow", () => {
    expect(isHollow(HOLLOW_MAX_WORDS, 100, 5000)).toBe(false);
  });

  test("defuddle captured almost everything: not hollow", () => {
    expect(isHollow(10, 190, 200)).toBe(false);
  });

  test("zero word count (total miss, no content container found) is never hollow", () => {
    // A total Defuddle miss is a different failure mode than a wrong-but-nonzero
    // partial capture (the SMF <form>-removal bug) — raw-text recovery is not
    // the right remedy (the raw text there is likely page chrome, not missed
    // article prose); that case belongs to browserFallback, not this gate.
    expect(isHollow(0, 5, 5000)).toBe(false);
  });
});

describe("normalizeWhitespace", () => {
  test("collapses tab/space runs and 3+ newlines", () => {
    expect(normalizeWhitespace("a\t\t\tb   c\n\n\n\nd")).toBe("a b c\n\nd");
  });
});
