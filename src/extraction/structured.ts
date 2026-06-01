/**
 * Schema-based structured extraction: the caller provides a field map
 * (field -> { selector, attr?, all?, abs? }) and gets typed data pulled from
 * the live DOM. Deterministic, no LLM. Works on Next.js/SPA pages because it
 * reads the rendered DOM after hydration, not the HTML source.
 * @module extraction/structured
 */
import type { Page } from "playwright";
import { evalScriptArg } from "../lib/evaluate.js";

/** How to extract one field from the page. */
export interface FieldSpec {
  /** CSS selector to locate the element(s). */
  selector: string;
  /** Attribute to read; omit to read trimmed innerText. */
  attr?: string;
  /** When true, return an array from querySelectorAll instead of the first match. */
  all?: boolean;
  /** When true, read the IDL property (e.g. el.href) for absolute URLs. */
  abs?: boolean;
}

/** A field map: result key -> extraction spec. */
export type ExtractionSchema = Record<string, FieldSpec>;

/** Extracted value: string, null, or an array thereof. */
export type ExtractedValue = string | null | Array<string | null>;

// Browser-side reader. `selector` is passed as data (no string interpolation),
// so it cannot inject code; an invalid selector throws and is caught per field.
const READ_SCRIPT = `(fields) => {
  const read = (el, f) => {
    if (!el) return null;
    if (f.abs && f.attr) return el[f.attr] ?? null;
    if (f.attr) return el.getAttribute(f.attr);
    return (el.innerText || '').trim() || null;
  };
  const out = {};
  for (const key in fields) {
    const f = fields[key];
    try {
      out[key] = f.all
        ? [...document.querySelectorAll(f.selector)].map((el) => read(el, f))
        : read(document.querySelector(f.selector), f);
    } catch {
      out[key] = null;
    }
  }
  return out;
}`;

/** Read `schema` fields from the page's live DOM into a typed record. */
export async function extractStructured(
  page: Page,
  schema: ExtractionSchema,
): Promise<Record<string, ExtractedValue>> {
  return evalScriptArg<Record<string, ExtractedValue>, ExtractionSchema>(page, READ_SCRIPT, schema);
}
