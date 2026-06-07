/**
 * Render a resolved fetch body to the public `{ status, url, format, escalated,
 * text }` shape — the single source of truth shared by `browser_fetch`, the
 * `fetch` CLI, and `browser_fetch_batch`. Markdown is produced only for HTML;
 * non-HTML (JSON, plain text) and `format:"text"` return the body verbatim.
 * @module agent/fetch-render
 */
import { htmlToMarkdown, renderMarkdown } from "../extraction/serialize/to-markdown.js";
import type { ResolvedBody } from "./fetch-resolve.js";

/** Public, LLM-ready shape of a single fetch result. */
export interface RenderedFetch {
  status: number;
  url: string;
  format: "markdown" | "text";
  escalated: boolean;
  text: string;
}

/**
 * Render `body` to markdown or raw text.
 *
 * @param body - The resolved (possibly browser-escalated) body.
 * @param opts - `format` ("text" forces raw) and `maxChars` (default 20000).
 * @returns The rendered result.
 */
export async function renderFetch(body: ResolvedBody, opts: { format?: string; maxChars?: number } = {}): Promise<RenderedFetch> {
  const max = typeof opts.maxChars === "number" ? opts.maxChars : 20_000;
  const format = opts.format === "text" || !body.isHtml ? "text" : "markdown";
  const text =
    format === "text" ? body.text.slice(0, max) : renderMarkdown(await htmlToMarkdown(body.html, { url: body.url }), max);
  return { status: body.status, url: body.url, format, escalated: body.escalated, text };
}
