/**
 * Post-extraction escalation gate: a chrome-heavy client-rendered SPA can carry
 * >600 visible chars of nav/chrome (defeating the pre-fetch `isThinShell`
 * check) yet still yield an empty Defuddle extraction because its real content
 * only exists after JS hydration. This gate looks at the ACTUAL extraction
 * result instead of raw-HTML length: escalate only when the fast-path came
 * back empty/near-empty on a page that also carries JS-rendering markers.
 * @module agent/fetch-escalate
 */
import { looksJsRendered } from "../net/thin-shell.js";
import type { RenderedFetch } from "./fetch-render.js";

/** Defuddle word count at/under this is a candidate for "empty extraction". */
export const EMPTY_WORD_FLOOR = 15;

/**
 * True when `rendered` is empty/near-empty and wasn't already fixed by
 * raw-text recovery — the shared predicate behind both the pre-browser
 * escalation gate and the post-browser last-resort fallback.
 *
 * @param rendered - The rendered fetch result to inspect.
 */
export function isEmptyExtraction(rendered: RenderedFetch): boolean {
  if (rendered.wordCount === undefined || rendered.wordCount >= EMPTY_WORD_FLOOR) return false;
  return rendered.extraction !== "recovered"; // raw-text recovery already found real content
}

/**
 * True when a fast-path fetch should be retried through a real browser
 * because its extraction is empty/near-empty on a JS-rendered shell.
 *
 * @param browserFallback - Whether the caller opted into browser escalation.
 * @param alreadyEscalated - True when this body already came from a browser
 *   render — prevents a second escalation (loop guard).
 * @param rendered - The rendered fetch result from the fast-path HTML.
 * @param rawHtml - The original (un-rendered) HTML body.
 */
export function shouldEscalateEmptyExtraction(
  browserFallback: boolean | undefined,
  alreadyEscalated: boolean,
  rendered: RenderedFetch,
  rawHtml: string,
): boolean {
  if (!browserFallback || alreadyEscalated) return false;
  if (!isEmptyExtraction(rendered)) return false;
  return looksJsRendered(rawHtml);
}

/** Whitespace-separated word count — the same denominator Defuddle uses. */
function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Last-resort fallback when even a real browser render still yields an
 * empty/near-empty extraction (e.g. a dense e-commerce grid whose layout
 * Defuddle's own content-scoring can't find a single container for — a known
 * Defuddle limitation on non-article pages; no `fallbackToBody`-style option
 * exists upstream to fix it generally). Ships the browser's own raw visible
 * text instead of near-empty markdown, so a caller never sees `wordCount: 0`
 * when the render actually captured real content. Pure local reshaping of
 * already-fetched data — no extra network/browser call.
 *
 * @param rendered - The still-empty rendered fetch (already escalated).
 * @param rawText - Raw visible text captured from the rendered body.
 * @param maxChars - Truncate to this length (mirrors `renderFetch`'s cap).
 */
export function recoverFromRawText(rendered: RenderedFetch, rawText: string, maxChars: number): RenderedFetch {
  const text = rawText.slice(0, maxChars);
  return { ...rendered, text, wordCount: countWords(text), extraction: "recovered" };
}
