/**
 * RFC 4180 CSV export for SERP/rank batches. Dependency-free: one row per query
 * with rank-tracking columns; array cells (organic/ads positions) are joined
 * with ";" inside a quoted field. `toCsv` is generic and reused/tested directly.
 * @module lib/serp-csv
 */
import type { SerpBatchRow } from "../interfaces/serp.js";

/** Quote a CSV field per RFC 4180 (arrays joined with ";"). */
function field(value: unknown): string {
  const s = value === null || value === undefined ? "" : Array.isArray(value) ? value.join(";") : String(value);
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replaceAll('"', '""')}"` : s;
}

/** Format rows of plain objects as RFC 4180 CSV (CRLF, header from `columns`). */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(field).join(",");
  const body = rows.map((row) => columns.map((c) => field(row[c])).join(","));
  return [header, ...body].join("\r\n") + "\r\n";
}

/** Columns emitted for a SERP batch CSV (rank-tracking view, one row per query). */
const COLUMNS = ["query", "domain", "found", "best", "organic", "ads", "results", "error"];

/** Render SERP batch rows as a rank-tracking CSV (one row per query). */
export function serpBatchToCsv(rows: SerpBatchRow[]): string {
  const flat = rows.map((r) => ({
    query: r.query,
    domain: r.rank?.domain ?? "",
    found: r.rank ? r.rank.found : "",
    best: r.rank?.best ?? "",
    organic: r.rank?.organic ?? [],
    ads: r.rank?.ads ?? [],
    results: r.results.length,
    error: r.error ?? "",
  }));
  return toCsv(flat, COLUMNS);
}
