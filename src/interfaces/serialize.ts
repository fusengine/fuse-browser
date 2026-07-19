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
  /**
   * Max input length (chars) fed to the HTML parser. Bounds parse cost on huge
   * pages — the tail beyond this is dropped before linkedom/Defuddle run.
   * Defaults to {@link DEFAULT_MAX_INPUT_CHARS} when omitted.
   */
  maxInputChars?: number;
  /**
   * CSS selector pinning the main content element, bypassing Defuddle's
   * auto-detection. When set, `removeContentPatterns` is also disabled — both
   * are needed together to keep a selected container's repeated sub-elements
   * (e.g. every post in a forum thread) from being stripped as "boilerplate".
   */
  contentSelector?: string;
}

/** Which extraction path produced a rendered fetch's final text. */
export type ExtractionKind = "primary" | "recovered";

/** Inputs available where hollow-extraction recovery is decided (markdown branch only). */
export interface RecoveryInput {
  /** Raw page HTML — source for non-link prose length and the page's true visible-text budget. */
  html: string;
  /** Defuddle's markdown content (the "c1" candidate). */
  c1Text: string;
  /** Defuddle's own word count for `c1Text`. */
  wordCount: number;
  /** Raw body text (pre-Defuddle) — the recovery candidate. */
  rawText: string;
}

/** The chosen text plus which extraction path produced it. */
export interface RecoveryResult {
  text: string;
  extraction: ExtractionKind;
}
