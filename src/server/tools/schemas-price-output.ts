/**
 * Shared zod `outputSchema` pieces for prices and scroll-collected rows,
 * reused by probe, extract, collect, and collect-batch tool outputs.
 * @module server/tools/schemas-price-output
 */
import { z } from "zod";

/** A price detected in page text (matches `interfaces/extraction.ts#Price`). */
export const priceSchema = z.object({
  currency: z.string(),
  amount: z.number(),
  line: z.string(),
  lineNo: z.number(),
  context: z.string().optional(),
});

/** A row harvested by scroll-collect (matches `interfaces/extraction.ts#CollectedItem`). */
export const collectedItemSchema = z.object({
  key: z.string(),
  text: z.string(),
  url: z.string().nullable(),
  prices: z.array(priceSchema).optional(),
});
