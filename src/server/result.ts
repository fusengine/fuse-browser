/**
 * Helpers to build MCP CallToolResult payloads.
 * @module server/result
 */
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Text + structured JSON result. The text block carries compact (non-indented)
 * JSON: the pretty-print whitespace only inflated the wire/token cost with no
 * gain for the consuming model, which reads the same data from
 * `structuredContent` anyway. The two stay semantically equivalent (MCP spec).
 */
export function jsonResult(payload: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

/** Image (base64) plus a structured JSON payload (as text + structuredContent). */
export function imageJsonResult(
  base64: string,
  payload: Record<string, unknown>,
  mimeType = "image/jpeg",
): CallToolResult {
  return {
    content: [
      { type: "image", data: base64, mimeType },
      { type: "text", text: JSON.stringify(payload) },
    ],
    structuredContent: payload,
  };
}

/**
 * Error result (isError flag set). When a machine-readable `code` is given,
 * it is exposed as `structuredContent: { code, message }`.
 */
export function errorResult(message: string, code?: string): CallToolResult {
  const result: CallToolResult = { content: [{ type: "text", text: message }], isError: true };
  if (code) result.structuredContent = { code, message };
  return result;
}

/** Image result (PNG base64) with an optional text note. */
export function imageResult(base64: string, note?: string): CallToolResult {
  const image = { type: "image" as const, data: base64, mimeType: "image/png" };
  const text = note ? [{ type: "text" as const, text: note }] : [];
  return { content: [image, ...text] };
}

/** Several images (PNG base64), each preceded by a label note. No structuredContent. */
export function multiImageResult(items: Array<{ base64: string; note: string }>): CallToolResult {
  const content = items.flatMap((it) => [
    { type: "text" as const, text: it.note },
    { type: "image" as const, data: it.base64, mimeType: "image/png" },
  ]);
  return { content };
}
