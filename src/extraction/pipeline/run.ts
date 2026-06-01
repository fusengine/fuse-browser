/**
 * Run the composable extraction pipeline: clean → validate → dedupe → pick →
 * emit. Each stage is optional and pure; returns the processed rows, rejected
 * rows (with reasons), and an optional CSV rendering.
 * @module extraction/pipeline/run
 */
import type { InvalidRow, PipelineSpec, PipelineResult } from "../../interfaces/pipeline.js";
import { toCsv } from "../../lib/serp-csv.js";
import { cleanRows } from "./clean.js";
import { dedupeRows } from "./dedupe.js";
import { validateRows } from "./validate.js";

/** Restrict each row to `columns` (preserving order). */
function pickColumns(rows: Record<string, unknown>[], columns: string[]): Record<string, unknown>[] {
  return rows.map((row) => Object.fromEntries(columns.map((c) => [c, row[c]])));
}

/** Apply the declarative `spec` to `rows`. */
export function runPipeline(rows: Record<string, unknown>[], spec: PipelineSpec): PipelineResult {
  let out = spec.clean ? cleanRows(rows, spec.clean.numericFields) : rows;
  let invalid: InvalidRow[] = [];
  if (spec.validate) {
    const res = validateRows(out, spec.validate);
    out = res.valid;
    invalid = res.invalid;
  }
  if (spec.dedupeBy?.length) out = dedupeRows(out, spec.dedupeBy, spec.keep ?? "first");
  if (spec.columns?.length) out = pickColumns(out, spec.columns);
  const csv = spec.emit === "csv" ? toCsv(out, spec.columns ?? Object.keys(out[0] ?? {})) : undefined;
  return { rows: out, invalid, csv };
}
