/**
 * Layout-agnostic price text normalisation: special-space cleanup, locale-aware
 * amount parsing and logical-line stitching for currencies split across DOM nodes.
 * @module extraction/prices-normalize
 */

/** Unicode spaces (NBSP, NNBSP, thin, figure) collapsed to a plain space. */
const SPECIAL_SPACES = /[\u00A0\u202F\u2009\u2007]/g;

/**
 * Replace special whitespace with a regular space (keeps newlines intact).
 * @param text - Raw page text possibly containing NBSP/NNBSP/thin/figure spaces.
 * @returns Text with special spaces normalised to U+0020.
 */
export function normaliseSpaces(text: string): string {
  return text.replace(SPECIAL_SPACES, " ");
}

/**
 * Locale-aware amount parse. The last `.`/`,` separator is the decimal point
 * when it precedes 1–2 trailing digits; otherwise every separator is a thousands
 * group and stripped. Apostrophes (U+0027/U+2019) and spaces are always thousands.
 * @param raw - Numeric string such as "1'234.56", "1.234,56", "129".
 * @returns The parsed number (float when a decimal part is present).
 */
export function normaliseAmount(raw: string): number {
  const cleaned = raw.replace(/['’ ]/g, "");
  const lastSep = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
  if (lastSep === -1) return Number(cleaned);
  const tail = cleaned.slice(lastSep + 1);
  if (tail.length >= 1 && tail.length <= 2 && /^\d+$/.test(tail)) {
    return Number(`${cleaned.slice(0, lastSep).replace(/[.,]/g, "")}.${tail}`);
  }
  return Number(cleaned.replace(/[.,]/g, ""));
}

/**
 * Stitch logical lines so a currency token isolated on its own line is rejoined
 * to the amount on the neighbouring line, in both directions:
 * `"CHF\n6.90"` → `"CHF 6.90"` (prefix) and `"6.90\nCHF"` → `"6.90 CHF"` (suffix).
 * @param lines - Physical lines (already space-normalised).
 * @param currencyTokens - Single regex alternation built from CURRENCY_PREFIXES.
 * @returns One logical line per physical line (same length and index mapping).
 */
export function stitchLogicalLines(lines: string[], currencyTokens: string): string[] {
  const lone = new RegExp(`^\\s*(?:${currencyTokens})\\s*$`, "i");
  const hasDigit = /[0-9]/;
  const out = lines.slice();
  for (let i = 0; i < lines.length; i++) {
    if (!lone.test(lines[i] as string)) continue;
    const prev = i > 0 ? (lines[i - 1] as string) : "";
    const next = i + 1 < lines.length ? (lines[i + 1] as string) : "";
    if (next && hasDigit.test(next) && !lone.test(next)) {
      out[i] = `${(lines[i] as string).trim()} ${next.trim()}`;
    } else if (prev && hasDigit.test(prev) && !lone.test(prev)) {
      out[i] = `${prev.trim()} ${(lines[i] as string).trim()}`;
    }
  }
  return out;
}
