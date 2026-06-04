/**
 * HTML to Markdown serialization: find the main content with Defuddle and emit
 * LLM-ready markdown + YAML frontmatter. No browser, no network (async
 * extractors disabled). Falls back to plain body text if extraction fails.
 * @module extraction/serialize/to-markdown
 */
import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";
import type { MarkdownDoc, MarkdownMeta, SerializeOptions } from "../../interfaces/serialize.js";
import { buildFrontmatter } from "./frontmatter.js";

/** linkedom document (no DOM lib in tsconfig, so infer it from parseHTML). */
type LinkedomDocument = ReturnType<typeof parseHTML>["document"];

/**
 * The single, deliberate boundary between linkedom and Defuddle. linkedom's
 * document is structurally a DOM `Document` at runtime, but this project's
 * tsconfig omits the DOM lib, so the nominal types don't unify. Isolating the
 * cast here (rather than inline) keeps it named, documented, and one-of-a-kind —
 * eliminating it would mean pulling the whole DOM lib in just for one signature.
 */
function toDefuddleInput(document: LinkedomDocument): Parameters<typeof Defuddle>[0] {
  return document as unknown as Parameters<typeof Defuddle>[0];
}

/**
 * Best-effort body text for the fallback path. linkedom's `body`/`documentElement`
 * getters THROW (not return null) when the document has no root element — e.g.
 * empty or non-HTML input — so plain `?.` is not enough; we wrap in try/catch.
 */
function bodyText(document: LinkedomDocument): string {
  try {
    return (document.body?.textContent ?? document.documentElement?.textContent ?? "").trim();
  } catch {
    return "";
  }
}

/** Convert raw HTML into a {@link MarkdownDoc} (frontmatter + markdown body). */
export async function htmlToMarkdown(html: string, opts: SerializeOptions = {}): Promise<MarkdownDoc> {
  const { document } = parseHTML(html);
  let markdown = "";
  let meta: MarkdownMeta = { url: opts.url ?? "" };
  try {
    const r = await Defuddle(toDefuddleInput(document), opts.url, {
      markdown: true,
      useAsync: false,
      removeImages: opts.removeImages ?? false,
      language: opts.language,
    });
    markdown = (r.content ?? "").trim();
    meta = {
      url: opts.url ?? "",
      title: r.title || undefined,
      site: r.site || undefined,
      author: r.author || undefined,
      published: r.published || undefined,
      lang: r.language || undefined,
      description: r.description || undefined,
      wordCount: r.wordCount || undefined,
    };
  } catch {
    markdown = bodyText(document);
  }
  const frontmatter = opts.frontmatter === false ? "" : buildFrontmatter(meta);
  return { meta, frontmatter, markdown };
}

/** Compose `frontmatter + body`, truncating the body to `maxChars` when given. */
export function renderMarkdown(doc: MarkdownDoc, maxChars?: number): string {
  const body = typeof maxChars === "number" ? doc.markdown.slice(0, maxChars) : doc.markdown;
  return `${doc.frontmatter}${body}`;
}
