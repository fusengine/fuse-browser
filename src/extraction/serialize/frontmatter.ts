/**
 * Build a YAML frontmatter block from extracted page metadata.
 * @module extraction/serialize/frontmatter
 */
import type { MarkdownMeta } from "../../interfaces/serialize.js";

/** Serialize one scalar for a YAML line (numbers raw, strings safely quoted). */
const yaml = (v: string | number): string => (typeof v === "number" ? String(v) : JSON.stringify(v));

/**
 * Render `meta` as a YAML frontmatter block delimited by `---`, ending with a
 * blank line. Empty/undefined fields are skipped; `url` is always emitted.
 */
export function buildFrontmatter(meta: MarkdownMeta): string {
  const lines: string[] = ["---"];
  const add = (key: string, value: string | number | undefined): void => {
    if (value === undefined || value === "") return;
    lines.push(`${key}: ${yaml(value)}`);
  };
  add("title", meta.title);
  add("url", meta.url);
  add("site", meta.site);
  add("author", meta.author);
  add("published", meta.published);
  add("lang", meta.lang);
  add("description", meta.description);
  add("wordCount", meta.wordCount);
  lines.push("---", "");
  return `${lines.join("\n")}\n`;
}
