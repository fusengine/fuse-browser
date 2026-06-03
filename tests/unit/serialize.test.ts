import { describe, expect, test } from "bun:test";
import { buildFrontmatter } from "../../src/extraction/serialize/frontmatter.js";
import { htmlToMarkdown, renderMarkdown } from "../../src/extraction/serialize/to-markdown.js";

const ARTICLE = `<!DOCTYPE html><html lang="en"><head><title>Hello World</title></head>
<body><nav>Menu Home About</nav><article><h1>Hello World</h1>
<p>This is the main content with a [special] "quote" inside.</p></article>
<footer>Copyright</footer></body></html>`;

describe("buildFrontmatter", () => {
  test("emits url, skips undefined, quotes strings and leaves numbers raw", () => {
    const fm = buildFrontmatter({ url: "https://x.com", title: 'A "quoted" title', wordCount: 42 });
    expect(fm.startsWith("---\n")).toBe(true);
    expect(fm).toContain('url: "https://x.com"');
    expect(fm).toContain('title: "A \\"quoted\\" title"'); // JSON-escaped, YAML-safe
    expect(fm).toContain("wordCount: 42"); // number, not quoted
    expect(fm).not.toContain("author"); // undefined field skipped
    expect(fm.endsWith("---\n\n")).toBe(true);
  });

  test("frontmatter:false yields empty block via htmlToMarkdown", async () => {
    const doc = await htmlToMarkdown(ARTICLE, { url: "https://x.com", frontmatter: false });
    expect(doc.frontmatter).toBe("");
  });
});

describe("renderMarkdown", () => {
  test("prepends frontmatter and truncates the body to maxChars", () => {
    const doc = { meta: { url: "u" }, frontmatter: '---\nurl: "u"\n---\n\n', markdown: "abcdefghij" };
    expect(renderMarkdown(doc)).toBe('---\nurl: "u"\n---\n\nabcdefghij');
    expect(renderMarkdown(doc, 3)).toBe('---\nurl: "u"\n---\n\nabc');
  });
});

describe("htmlToMarkdown", () => {
  test("extracts main content as markdown with metadata", async () => {
    const doc = await htmlToMarkdown(ARTICLE, { url: "https://x.com/post" });
    expect(doc.meta.url).toBe("https://x.com/post");
    expect(doc.meta.title).toBe("Hello World"); // title lives in metadata…
    expect(doc.markdown).toContain("main content"); // …Defuddle drops the duplicate H1 from the body
    expect(doc.markdown).not.toContain("Menu Home About"); // nav stripped
    expect(doc.frontmatter).toContain('url: "https://x.com/post"');
  });

  test("empty input falls back to empty body but still emits frontmatter", async () => {
    const doc = await htmlToMarkdown("", { url: "https://x.com" });
    expect(doc.meta.url).toBe("https://x.com");
    expect(doc.markdown).toBe(""); // bodyText() fallback → empty, not "undefined"/garbage
    expect(doc.frontmatter).toContain('url: "https://x.com"');
  });

  test("rootless / non-HTML input falls back to empty body", async () => {
    const doc = await htmlToMarkdown("not html, just plain text", { url: "https://x.com" });
    expect(doc.markdown).toBe("");
  });

  test("bare <html></html> falls back to empty body", async () => {
    const doc = await htmlToMarkdown("<html></html>", { url: "https://x.com" });
    expect(doc.markdown).toBe("");
  });
});
