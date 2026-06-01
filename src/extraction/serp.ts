/**
 * Extract a Google search results page (organic, ads, related) from the live
 * DOM. Iterates `h3` titles and resolves each link defensively — the title
 * `h3` is the most stable hook across Google's frequent layout/class changes.
 * Dedup by result container so sitelinks don't inflate results.
 * @module extraction/serp
 */
import type { Page } from "playwright";
import type { Serp } from "../interfaces/extraction.js";
import { evalScript } from "../lib/evaluate.js";

const SERP_SCRIPT = `() => {
  const clean = (t) => (t || "").replace(/\\s+/g, " ").trim();
  const SNIPPET = "div.VwiC3b, div[data-content-feature='1'], .lEBKkf, .MUxGbd, span.st";
  const AD_ROOTS = "#tads, #tadsb, #bottomads";
  const internal = (u) => { try { return new URL(u).hostname.endsWith("google.com"); } catch (e) { return true; } };
  const linkFor = (h3) => {
    const inA = h3.closest("a[href]");
    if (inA) return inA;
    const c = h3.closest("div[data-hveid], div.g, div[data-sokoban-container]");
    return (c && c.querySelector("a[href^='http']")) || h3.parentElement?.querySelector("a[href]") || null;
  };
  const collect = (h3s, skipAds) => {
    const out = [];
    const seenBlocks = new Set();
    const seenUrls = new Set();
    h3s.forEach((h3) => {
      const a = linkFor(h3);
      if (!a || !a.href) return;
      if (skipAds && (internal(a.href) || a.closest(AD_ROOTS))) return;
      const block = a.closest("div[data-sokoban-container]") || a.closest("div[data-hveid]") || h3.parentElement;
      if (!block || seenBlocks.has(block) || seenUrls.has(a.href)) return;
      seenBlocks.add(block);
      seenUrls.add(a.href);
      out.push({
        position: out.length + 1,
        title: clean(h3.textContent),
        url: a.href,
        displayUrl: clean(block.querySelector("cite")?.textContent) || undefined,
        snippet: clean(block.querySelector(SNIPPET)?.textContent) || undefined,
      });
    });
    return out;
  };
  const root = document.querySelector("#rso") || document.querySelector("#search") || document.body;
  const organic = collect(Array.from(root.querySelectorAll("h3")), true);
  const ads = collect(Array.from(document.querySelectorAll("#tads h3, #tadsb h3, #bottomads h3")), false);
  const related = Array.from(document.querySelectorAll(".s75CSd, #brs a, #bres a"))
    .map((e) => clean(e.textContent))
    .filter((t, i, arr) => t && arr.indexOf(t) === i);
  return { organic, ads, related };
}`;

/** Parse the current Google SERP into structured organic / ads / related lists. */
export function extractSerp(page: Page): Promise<Serp> {
  return evalScript<Serp>(page, SERP_SCRIPT);
}
