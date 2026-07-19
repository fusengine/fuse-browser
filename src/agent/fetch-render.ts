/**
 * Render a resolved fetch body to the public `{ status, url, format, escalated,
 * text }` shape — the single source of truth shared by `browser_fetch`, the
 * `fetch` CLI, and `browser_fetch_batch`. Markdown is produced only for HTML;
 * non-HTML (JSON, plain text) and `format:"text"` return the body verbatim.
 * The markdown branch also runs hollow-extraction recovery: when Defuddle
 * silently captures only a sliver of the page's real prose, the raw body
 * text is recovered instead (gated — see `extraction/serialize/recover.ts`).
 * @module agent/fetch-render
 */
import { chooseRecovery } from "../extraction/serialize/recover.js";
import { htmlToMarkdown, renderMarkdown } from "../extraction/serialize/to-markdown.js";
import type { ExtractionKind } from "../interfaces/serialize.js";
import type { ResolvedBody } from "./fetch-resolve.js";

/** Public, LLM-ready shape of a single fetch result. */
export interface RenderedFetch {
  status: number;
  url: string;
  format: "markdown" | "text";
  escalated: boolean;
  text: string;
  /** Defuddle's word count for the markdown content. Markdown branch only. */
  wordCount?: number;
  /** Which extraction path produced `text`. Markdown branch only. */
  extraction?: ExtractionKind;
}

/** `renderFetch` options: format/length + the `browser_fetch`-only content-selector escape hatch. */
export interface RenderFetchOptions {
  format?: string;
  maxChars?: number;
  contentSelector?: string;
}

/**
 * Render `body` to markdown or raw text.
 *
 * @param body - The resolved (possibly browser-escalated) body.
 * @param opts - `format` ("text" forces raw), `maxChars` (default 20000), and
 *   `contentSelector` (markdown branch only — bypasses Defuddle auto-detection).
 * @returns The rendered result.
 */
export async function renderFetch(body: ResolvedBody, opts: RenderFetchOptions = {}): Promise<RenderedFetch> {
  const max = typeof opts.maxChars === "number" ? opts.maxChars : 20_000;
  const format = opts.format === "text" || !body.isHtml ? "text" : "markdown";
  if (format === "text") {
    return { status: body.status, url: body.url, format, escalated: body.escalated, text: body.text.slice(0, max) };
  }
  const doc = await htmlToMarkdown(body.html, { url: body.url, contentSelector: opts.contentSelector });
  const wordCount = doc.meta.wordCount ?? 0;
  const recovery = chooseRecovery({ html: body.html, c1Text: doc.markdown, wordCount, rawText: body.text });
  const text = renderMarkdown({ ...doc, markdown: recovery.text }, max);
  return { status: body.status, url: body.url, format, escalated: body.escalated, text, wordCount, extraction: recovery.extraction };
}
