/**
 * Shared zod `outputSchema` pieces for the HTTP fast-path fetch result,
 * reused by the fetch, fetch-batch, and crawl tool outputs.
 * @module server/tools/schemas-fetch-output
 */
import { z } from "zod";

/** A single rendered fetch (matches `agent/fetch-render.ts#RenderedFetch`). */
export const renderedFetchSchema = z.object({
  status: z.number(),
  url: z.string(),
  format: z.enum(["markdown", "text"]),
  escalated: z.boolean(),
  text: z.string(),
  /** Defuddle's word count for the markdown content. Markdown branch only. */
  wordCount: z.number().optional(),
  /** Which extraction path produced `text`. Markdown branch only. */
  extraction: z.enum(["primary", "recovered"]).optional(),
});

/** A batch/crawl entry that failed instead of resolving. */
export const urlErrorSchema = z.object({ url: z.string(), error: z.string() });

/** A crawled page (matches `agent/crawl.ts#CrawlPage`). */
export const crawlPageSchema = renderedFetchSchema.extend({ depth: z.number() });
