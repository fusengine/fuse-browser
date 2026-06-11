/**
 * In-page innerText reader that subtracts non-content landmarks (nav, header,
 * footer, aside, search/filter forms) before reading. The browser-side logic is
 * authored as a string script (per {@link module:lib/evaluate}) so it stays
 * isolated from Node DOM typing, and operates on cloned nodes so the live DOM
 * is never mutated.
 * @module extraction/main-text-clean
 */
import type { Page } from "playwright";
import { evalScriptArg } from "../lib/evaluate.js";

/** Sub-trees stripped from every matched landmark before reading innerText. */
const STRIP_SELECTORS = [
  "nav",
  "header",
  "footer",
  "aside",
  "[role=navigation]",
  "[role=search]",
  "[role=complementary]",
  "[role=banner]",
  "[role=contentinfo]",
  "form[role=search]",
  "[aria-label*='filter' i]",
  "[data-testid*='filter' i]",
  "[class*='filter' i]",
  "[id*='filter' i]",
].join(",");

/**
 * Browser script: for each node matching `sel`, clone it, remove every `strip`
 * sub-tree from the clone, then read its innerText. Joins all matches so a
 * product grid of repeated `<article>` cards keeps every card. Returns `""`
 * when nothing matches, letting the caller fall through to the next selector.
 */
const SCRIPT = `({ sel, strip }) => {
  const nodes = Array.from(document.querySelectorAll(sel));
  if (nodes.length === 0) return "";
  return nodes.map((node) => {
    const clone = node.cloneNode(true);
    for (const junk of Array.from(clone.querySelectorAll(strip))) junk.remove();
    return clone.innerText || "";
  }).join("\\n").trim();
}`;

/**
 * Read the joined, cleaned innerText of every node matching `selector`.
 * @param page - Playwright page to evaluate against.
 * @param selector - Landmark selector (e.g. `"main"`, `"article"`).
 * @returns Newline-joined, trimmed text of all cleaned matches (`""` if none).
 */
export function cleanedInnerText(page: Page, selector: string): Promise<string> {
  return evalScriptArg<string, { sel: string; strip: string }>(page, SCRIPT, {
    sel: selector,
    strip: STRIP_SELECTORS,
  });
}
