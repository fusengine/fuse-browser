/**
 * Per-card variant of schema extraction: one record per repeated container,
 * with every field resolved RELATIVE to that container. Keeps a card's title,
 * price and link correlated, unlike the index-aligned parallel arrays of
 * {@link extractStructured}.
 * @module extraction/structured-cards
 */
import type { Page } from "playwright";
import { evalScriptArg } from "../lib/evaluate.js";
import type { ExtractedValue, ExtractionSchema } from "./structured.js";

// Each `container` match is scoped; fields use querySelector ON the container
// (not the document), so values stay correlated per card. `selector` is data,
// not interpolated; an invalid selector throws and is caught per field.
const CARDS_SCRIPT = `(a) => {
  const read = (el, f) => {
    if (!el) return null;
    if (f.abs && f.attr) return el[f.attr] ?? null;
    if (f.attr) return el.getAttribute(f.attr);
    return (el.innerText || '').trim() || null;
  };
  return [...document.querySelectorAll(a.container)].map((root) => {
    const out = {};
    for (const key in a.fields) {
      const f = a.fields[key];
      try {
        out[key] = f.all
          ? [...root.querySelectorAll(f.selector)].map((el) => read(el, f))
          : read(root.querySelector(f.selector), f);
      } catch {
        out[key] = null;
      }
    }
    return out;
  });
}`;

/**
 * Read `schema` fields card-by-card: one record per `container` match.
 * @param page - A live Playwright page.
 * @param container - CSS selector matching each repeated card.
 * @param schema - Field map; selectors resolve relative to each card.
 * @returns One typed record per matched container.
 */
export async function extractStructuredPerCard(
  page: Page,
  container: string,
  schema: ExtractionSchema,
): Promise<Array<Record<string, ExtractedValue>>> {
  return evalScriptArg<Array<Record<string, ExtractedValue>>, { container: string; fields: ExtractionSchema }>(
    page,
    CARDS_SCRIPT,
    { container, fields: schema },
  );
}
