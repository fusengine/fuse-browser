/**
 * Types for the composable extraction pipeline (clean → validate → dedupe →
 * emit) applied to extracted records.
 * @module interfaces/pipeline
 */

/** Expected primitive type of a field. */
export type FieldType = "string" | "number" | "boolean";

/** Per-field validation rule (regex is a string, compiled at run time). */
export interface FieldRule {
  required?: boolean;
  type?: FieldType;
  regex?: string;
  min?: number;
  max?: number;
  enum?: unknown[];
}

/** A row rejected by validation, with its failure reasons. */
export interface InvalidRow {
  row: Record<string, unknown>;
  errors: string[];
}

/** Declarative pipeline specification (all stages optional). */
export interface PipelineSpec {
  /** Normalize strings; coerce listed fields to numbers. */
  clean?: { numericFields?: string[] };
  /** Per-field rules; failing rows move to `invalid`. */
  validate?: Record<string, FieldRule>;
  /** Dedupe by these fields (composite key, normalized). */
  dedupeBy?: string[];
  /** Keep the first or last duplicate (default `first`). */
  keep?: "first" | "last";
  /** Restrict output to these columns. */
  columns?: string[];
  /** Output format: `json` rows (default) or a `csv` string. */
  emit?: "json" | "csv";
}

/** Outcome of running a pipeline over rows. */
export interface PipelineResult {
  rows: Record<string, unknown>[];
  invalid: InvalidRow[];
  csv?: string;
}
