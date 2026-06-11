/**
 * Derive a short context label for a detected price from its neighbouring
 * logical lines (the nearest significant non-price line before or after it).
 * @module extraction/prices-context
 */

/** Max length of a context label; longer neighbours are truncated. */
const MAX_CONTEXT = 80;

/** True when a line carries no useful text (empty or punctuation only). */
function isBlank(line: string): boolean {
  return line.trim().replace(/[\s.,;:|–—-]/g, "") === "";
}

/**
 * Scan outward from `index` in `step` direction for the first qualifying line:
 * non-blank and not itself a detected price line. Returns the trimmed text or
 * `undefined` when the edge is reached first.
 */
function scan(
  lines: string[],
  index: number,
  step: -1 | 1,
  priceLineNos: ReadonlySet<number>,
): string | undefined {
  for (let i = index + step; i >= 0 && i < lines.length; i += step) {
    if (priceLineNos.has(i)) continue;
    const text = (lines[i] as string).trim();
    if (!isBlank(text)) return text;
  }
  return undefined;
}

/**
 * Pick the nearest significant non-price line around `lines[index]` as context.
 * Scans upward first, then downward; price lines and blank lines are skipped so
 * a stack of prices still resolves to the surrounding label/title. The result
 * is trimmed and capped at {@link MAX_CONTEXT} characters.
 * @param lines - All logical lines, same index space as the price's `lineNo`.
 * @param index - Index of the price's own line.
 * @param priceLineNos - Set of indices that are themselves price lines.
 * @returns A short context label, or `undefined` when none qualifies.
 */
export function contextFor(
  lines: string[],
  index: number,
  priceLineNos: ReadonlySet<number>,
): string | undefined {
  const text = scan(lines, index, -1, priceLineNos) ?? scan(lines, index, 1, priceLineNos);
  if (!text) return undefined;
  return text.length > MAX_CONTEXT ? `${text.slice(0, MAX_CONTEXT).trimEnd()}…` : text;
}
