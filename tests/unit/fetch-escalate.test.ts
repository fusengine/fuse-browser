import { describe, expect, test } from "bun:test";
import { isEmptyExtraction, recoverFromRawText, shouldEscalateEmptyExtraction } from "../../src/agent/fetch-escalate.js";
import type { RenderedFetch } from "../../src/agent/fetch-render.js";

const SPA_SHELL = '<html><body><div id="__next"></div><script src="/a.js"></script></body></html>';
const SCRIPT_HEAVY_SHELL = "<html><body>loading…<script></script><script></script><script></script></body></html>";
const CONTENT_PAGE = `<html><body><article><p>${"Lorem ipsum dolor sit amet ".repeat(40)}</p></article></body></html>`;

/** Minimal `RenderedFetch` fixture — only the fields the gate reads matter. */
function rendered(wordCount: number | undefined, extraction?: "primary" | "recovered"): RenderedFetch {
  return { status: 200, url: "https://x.test", format: "markdown", escalated: false, text: "", wordCount, extraction };
}

describe("shouldEscalateEmptyExtraction — post-extraction empty-SPA gate", () => {
  test("script-heavy shell + empty extraction + browserFallback → escalate", () => {
    expect(shouldEscalateEmptyExtraction(true, false, rendered(0, "primary"), SCRIPT_HEAVY_SHELL)).toBe(true);
  });

  test("SPA-root shell + near-empty (nonzero) extraction → escalate", () => {
    expect(shouldEscalateEmptyExtraction(true, false, rendered(5, "primary"), SPA_SHELL)).toBe(true);
  });

  test("content page (no JS markers) with empty-ish text → do NOT escalate", () => {
    expect(shouldEscalateEmptyExtraction(true, false, rendered(3, "primary"), CONTENT_PAGE)).toBe(false);
  });

  test("word count already above the floor → do NOT escalate", () => {
    expect(shouldEscalateEmptyExtraction(true, false, rendered(200, "primary"), SPA_SHELL)).toBe(false);
  });

  test("browserFallback off → do NOT escalate even on a hollow shell", () => {
    expect(shouldEscalateEmptyExtraction(false, false, rendered(0, "primary"), SPA_SHELL)).toBe(false);
  });

  test("already escalated (loop guard) → do NOT escalate twice", () => {
    expect(shouldEscalateEmptyExtraction(true, true, rendered(0, "primary"), SPA_SHELL)).toBe(false);
  });

  test("raw-text recovery already found real content → do NOT escalate", () => {
    expect(shouldEscalateEmptyExtraction(true, false, rendered(5, "recovered"), SPA_SHELL)).toBe(false);
  });

  test("text-format render (wordCount undefined) → do NOT escalate", () => {
    expect(shouldEscalateEmptyExtraction(true, false, rendered(undefined), SPA_SHELL)).toBe(false);
  });
});

describe("isEmptyExtraction", () => {
  test("zero word count, primary → empty", () => {
    expect(isEmptyExtraction(rendered(0, "primary"))).toBe(true);
  });

  test("word count above floor → not empty", () => {
    expect(isEmptyExtraction(rendered(200, "primary"))).toBe(false);
  });

  test("recovered extraction → not empty (already fixed)", () => {
    expect(isEmptyExtraction(rendered(3, "recovered"))).toBe(false);
  });

  test("wordCount undefined (text format) → not empty", () => {
    expect(isEmptyExtraction(rendered(undefined))).toBe(false);
  });
});

describe("recoverFromRawText — last-resort fallback after a real browser render is still empty", () => {
  test("ships the raw text, computes a real word count, marks extraction recovered", () => {
    const before = rendered(0, "primary");
    const after = recoverFromRawText(before, "Chargeur de secours CHF27 avant CHF45.70", 20_000);
    expect(after.text).toBe("Chargeur de secours CHF27 avant CHF45.70");
    expect(after.wordCount).toBe(6);
    expect(after.extraction).toBe("recovered");
    expect(after.escalated).toBe(before.escalated); // other fields untouched
  });

  test("truncates to maxChars like renderFetch does", () => {
    const after = recoverFromRawText(rendered(0, "primary"), "a".repeat(100), 10);
    expect(after.text).toHaveLength(10);
  });

  test("empty raw text → wordCount 0, not a crash", () => {
    const after = recoverFromRawText(rendered(0, "primary"), "   ", 20_000);
    expect(after.wordCount).toBe(0);
  });
});
