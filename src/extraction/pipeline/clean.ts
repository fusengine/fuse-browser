/**
 * Clean stage: normalize string fields (decode HTML entities, strip zero-width
 * chars, collapse whitespace) and coerce chosen fields to numbers. Pure.
 * @module extraction/pipeline/clean
 */

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " ",
};

/** Decode common HTML entities, strip zero-width chars, collapse whitespace. */
export function normalizeString(s: string): string {
  const decoded = s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[body.toLowerCase()] ?? m;
  });
  return decoded.replace(/[​-‍﻿­]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Parse a number from messy text ('€1,234.56', "1'234,50", '1 234,56'). The
 * decimal separator is the last `.`/`,` followed by 1-2 digits; the rest are
 * thousands separators. Returns null when no number is present.
 */
export function parseNumber(raw: string): number | null {
  const s = raw.replace(/[^0-9.,'\s-]/g, "").trim();
  if (!s) return null;
  const frac = s.match(/[.,](\d{1,2})$/)?.[1];
  const normalized = frac
    ? `${s.slice(0, s.length - frac.length - 1).replace(/[.,'\s]/g, "")}.${frac}`
    : s.replace(/[.,'\s]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Apply string normalization to every string field; coerce `numericFields`. */
export function cleanRows(
  rows: Record<string, unknown>[],
  numericFields: string[] = [],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) out[k] = typeof v === "string" ? normalizeString(v) : v;
    for (const f of numericFields) {
      if (out[f] != null) {
        const n = parseNumber(String(out[f]));
        if (n !== null) out[f] = n;
      }
    }
    return out;
  });
}
