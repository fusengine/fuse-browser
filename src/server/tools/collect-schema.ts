/**
 * Zod input/output schemas for `browser_collect` — the declarative
 * clean→validate→dedupe→emit pipeline spec (input) and the tool's result
 * shape (output). Split out of `collect.ts` to keep it under the file-size
 * budget.
 * @module server/tools/collect-schema
 */
import { z } from "zod";

const fieldRule = z.object({
  required: z.boolean().optional(),
  type: z.enum(["string", "number", "boolean"]).optional(),
  regex: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  enum: z.array(z.unknown()).optional(),
});

/** Declarative clean→validate→dedupe→emit spec applied to collected rows. */
export const pipelineInputSchema = z
  .object({
    clean: z.object({ numericFields: z.array(z.string()).optional() }).optional(),
    validate: z.record(z.string(), fieldRule).optional(),
    dedupeBy: z.array(z.string()).optional(),
    keep: z.enum(["first", "last"]).optional(),
    columns: z.array(z.string()).optional(),
    emit: z.enum(["json", "csv"]).optional(),
  })
  .optional();

/**
 * `browser_collect` output shape. `items`/`csv` stay permissive: with
 * `pipeline.columns` set, rows are reshaped to an arbitrary caller-chosen
 * column set (see `runPipeline`), so a precise per-field schema would throw
 * on a valid, differently shaped payload. Top-level keys stay optional since
 * the two return branches (plain vs pipeline) populate a different subset.
 */
export const collectOutputShape = {
  count: z.number(),
  steps: z.number(),
  reachedEnd: z.boolean(),
  invalidCount: z.number().optional(),
  items: z.array(z.record(z.string(), z.unknown())),
  csv: z.string().optional(),
};
