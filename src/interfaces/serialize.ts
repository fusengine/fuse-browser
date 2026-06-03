/**
 * Types for the HTML to Markdown serialization layer (LLM-ready output).
 * @module interfaces/serialize
 */

/** Metadata extracted alongside the main content, emitted as YAML frontmatter. */
export interface MarkdownMeta {
  title?: string;
  url: string;
  site?: string;
  author?: string;
  published?: string;
  lang?: string;
  description?: string;
  wordCount?: number;
}

/** A serialized document: metadata + YAML frontmatter block + markdown body. */
export interface MarkdownDoc {
  meta: MarkdownMeta;
  /** Ready-to-prepend YAML block, or "" when disabled. */
  frontmatter: string;
  /** Main-content markdown body (no frontmatter). */
  markdown: string;
}

/** Options for the htmlToMarkdown serializer. */
export interface SerializeOptions {
  /** Absolute page URL — used for the frontmatter and link resolution. */
  url?: string;
  /** Emit a YAML frontmatter block. Defaults to true. */
  frontmatter?: boolean;
  /** Drop images from the markdown. Defaults to false. */
  removeImages?: boolean;
  /** Preferred BCP-47 content language hint passed to the extractor. */
  language?: string;
}
