/**
 * Result builders for `browser_screenshot`. Every builder emits a
 * `structuredContent` payload conforming to `screenshotOutputShape`, required
 * once the tool declares an `outputSchema` — the SDK (^1.29) throws `McpError`
 * at runtime if a non-error `CallToolResult` lacks matching `structuredContent`.
 * @module server/tools/screenshot-result
 */
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

/** Raw zod shape describing `browser_screenshot`'s structured metadata. */
export const screenshotOutputShape = {
  kind: z.enum(["element", "page", "multi", "annotated"]),
  count: z.number(),
  mimeType: z.string(),
  notes: z.array(z.string()).optional(),
  url: z.string().optional(),
  marks: z.number().optional(),
};

type Structured = z.infer<z.ZodObject<typeof screenshotOutputShape>>;

/** Single image + text note + structured metadata, shared by the single-image branches. */
function single(base64: string, mimeType: string, note: string, structured: Structured): CallToolResult {
  return {
    content: [
      { type: "image", data: base64, mimeType },
      { type: "text", text: note },
    ],
    structuredContent: structured,
  };
}

/** Single-element capture (`ref`). */
export function elementScreenshotResult(base64: string, ref: number | string): CallToolResult {
  const note = `element ref=${ref}`;
  return single(base64, "image/png", note, {
    kind: "element",
    count: 1,
    mimeType: "image/png",
    notes: [note],
  });
}

/** Full-page / default single-viewport capture. */
export function pageScreenshotResult(base64: string, url: string): CallToolResult {
  const note = `screenshot of ${url}`;
  return single(base64, "image/png", note, { kind: "page", count: 1, mimeType: "image/png", url, notes: [note] });
}

/** Annotated capture (`annotate: true`). Kept as JPEG to match `annotatedScreenshot`. */
export function annotatedScreenshotResult(base64: string, url: string, marks: number): CallToolResult {
  return single(base64, "image/jpeg", JSON.stringify({ url, marks }), {
    kind: "annotated",
    count: 1,
    mimeType: "image/jpeg",
    url,
    marks,
  });
}

/** Multi-viewport capture: several images, each preceded by a label note. */
export function multiScreenshotResult(items: Array<{ base64: string; note: string }>): CallToolResult {
  const content = items.flatMap((it) => [
    { type: "text" as const, text: it.note },
    { type: "image" as const, data: it.base64, mimeType: "image/png" as const },
  ]);
  return {
    content,
    structuredContent: {
      kind: "multi",
      count: items.length,
      mimeType: "image/png",
      notes: items.map((it) => it.note),
    },
  };
}
