/**
 * Validate stage: apply per-field rules to rows, partitioning into valid and
 * invalid (with reasons). Zero-dep and pure — no schema library.
 * @module extraction/pipeline/validate
 */
import type { FieldRule, InvalidRow } from "../../interfaces/pipeline.js";

/** Collect rule violations for one field value (empty array = ok). */
function checkField(field: string, value: unknown, rule: FieldRule): string[] {
  const errors: string[] = [];
  const missing = value === undefined || value === null || value === "";
  if (rule.required && missing) return [`${field}: required`];
  if (missing) return errors;
  if (rule.type && typeof value !== rule.type) errors.push(`${field}: expected ${rule.type}, got ${typeof value}`);
  if (rule.regex && typeof value === "string" && !new RegExp(rule.regex).test(value)) {
    errors.push(`${field}: failed regex ${rule.regex}`);
  }
  if (typeof value === "number") {
    if (rule.min !== undefined && value < rule.min) errors.push(`${field}: ${value} < min ${rule.min}`);
    if (rule.max !== undefined && value > rule.max) errors.push(`${field}: ${value} > max ${rule.max}`);
  }
  if (rule.enum && !rule.enum.includes(value)) errors.push(`${field}: "${String(value)}" not allowed`);
  return errors;
}

/** Partition `rows` by `schema`; failing rows go to `invalid` with reasons. */
export function validateRows(
  rows: Record<string, unknown>[],
  schema: Record<string, FieldRule>,
): { valid: Record<string, unknown>[]; invalid: InvalidRow[] } {
  const valid: Record<string, unknown>[] = [];
  const invalid: InvalidRow[] = [];
  for (const row of rows) {
    const errors = Object.entries(schema).flatMap(([field, rule]) => checkField(field, row[field], rule));
    if (errors.length) invalid.push({ row, errors });
    else valid.push(row);
  }
  return { valid, invalid };
}
