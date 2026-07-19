/**
 * Hollow-extraction recovery: detect when Defuddle silently captured only a
 * sliver of a page's real prose (e.g. its exact-selector removal deleting a
 * bare `<form>` that wraps every SMF forum post) and recover the raw visible
 * text instead of shipping near-empty markdown. Gated on non-link prose: a
 * page recovers only when it holds substantial reading content outside its
 * `<a>` chrome that Defuddle missed — a link-heavy or genuinely short page
 * (board index, login, 404) never triggers it, whatever its link density.
 * @module extraction/serialize/recover
 */
import type { RecoveryInput, RecoveryResult } from "../../interfaces/serialize.js";
import { visibleText } from "../../net/thin-shell.js";

/** Defuddle output at/under this word count is a candidate for "hollow". */
export const HOLLOW_MAX_WORDS = 200;

/** Defuddle text under this fraction of the page's real non-link prose is "hollow". */
export const MISS_RATIO = 0.5;

/**
 * A hollow page needs at least this much recoverable non-link prose to
 * qualify. Tuned against real pages, not just the saved SMF pair: the SMF
 * thread bug has 1736 non-link chars; `github.com/login` alone already
 * carries 505 chars of pure chrome (toast copy, footer legal text) with no
 * real content behind it — a naive 300 floor recovered that page verbatim.
 * 600 clears github/login with margin, well under the SMF thread's 1736.
 */
export const MIN_PROSE_CHARS = 600;

const SCRIPT_OR_STYLE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const ANCHOR = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;

/**
 * Non-link prose length: visible text with every `<a>`'s own visible text
 * subtracted. Anchors are matched on script/style-stripped html — otherwise
 * a JS string literal containing `</a>` (e.g. SMF's jump-to menu builder)
 * can make the anchor regex span from a real `<a>` across an inline script
 * into unrelated markup, wildly inflating the "anchor text" it subtracts.
 */
export function nonLinkProseLen(html: string): number {
  const scriptFree = html.replace(SCRIPT_OR_STYLE, " ");
  const anchorLen = [...scriptFree.matchAll(ANCHOR)]
    .map((m) => visibleText(m[1] ?? "").length)
    .reduce((sum, len) => sum + len, 0);
  return Math.max(0, visibleText(html).length - anchorLen);
}

/**
 * True when Defuddle captured only a small fraction of the page's real
 * non-link prose. Requires a **nonzero** word count: a total miss (0 words,
 * no content container found — typical of a heavy client-rendered page)
 * is a different failure mode than a wrong-but-nonzero partial capture (the
 * SMF `<form>`-removal bug); its raw text is page chrome, not missed
 * article prose, so it belongs to `browserFallback`, not this gate.
 */
export function isHollow(defuddleWordCount: number, c1Plain: number, proseLen: number): boolean {
  return defuddleWordCount > 0 && defuddleWordCount < HOLLOW_MAX_WORDS && c1Plain < proseLen * MISS_RATIO;
}

/** Collapse tab/space runs and 3+ newlines to at most a blank line (raw SMF "tab soup"). */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Strip common markdown syntax to a plain-text length comparable to `visibleText`. */
function plainTextLen(markdown: string): number {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>|-]/g, "")
    .replace(/\s+/g, " ")
    .trim().length;
}

/**
 * Pick between Defuddle's clean output and a raw-text recovery. Recovers
 * only when the page is hollow (low word count, low prose-capture ratio)
 * AND holds enough recoverable non-link prose ({@link MIN_PROSE_CHARS}) to
 * be worth it — a legitimately sparse or link-heavy page always keeps the
 * primary (Defuddle) output, never raw link/nav soup.
 */
export function chooseRecovery(input: RecoveryInput): RecoveryResult {
  // Cheap gate first: `isHollow` can only be true for a nonzero, sub-cap word
  // count, so a page defuddle already captured fully (or totally missed, 0
  // words) never needs the 2-regex-pass prose scan below.
  const wordCountHollow = input.wordCount > 0 && input.wordCount < HOLLOW_MAX_WORDS;
  if (!wordCountHollow) {
    return { text: input.c1Text, extraction: "primary" };
  }
  const proseLen = nonLinkProseLen(input.html);
  const hollow = isHollow(input.wordCount, plainTextLen(input.c1Text), proseLen);
  if (hollow && proseLen >= MIN_PROSE_CHARS) {
    return { text: normalizeWhitespace(input.rawText), extraction: "recovered" };
  }
  return { text: input.c1Text, extraction: "primary" };
}
