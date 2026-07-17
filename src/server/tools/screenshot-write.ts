/**
 * Disk-persistence helpers for `browser_screenshot`'s `path` option: validate
 * the target extension against the capture's mime type, write the bytes, and
 * fold that into the branch's success/error `CallToolResult`. Split out of
 * `screenshot-result.ts` (and out of `screenshot.ts`'s call sites) to keep
 * every screenshot file under the project's 100-line SOLID limit.
 * @module server/tools/screenshot-write
 */
import { extname } from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { writeFileBytes } from "../../lib/fs.js";
import { errorResult } from "../result.js";

/** Extension(s) accepted for each mime type this tool ever produces. */
const MIME_EXTS: Record<string, readonly string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

/**
 * Writes `data` to `path` on disk, gated on `path`'s extension matching
 * `mimeType` — the mime is known upfront from the capture branch (never
 * sniffed from bytes), so a mismatch (e.g. `.png` for the JPEG `annotate`
 * branch) is rejected rather than silently renamed. This extension gate is
 * stricter than `pdf.ts`, which performs no validation and accepts any path
 * verbatim; the trait actually shared with `pdf.ts`/`visual-diff.ts` is
 * accepting an arbitrary caller-supplied local path with no implicit
 * renaming, sandboxing, or traversal check (same accepted trust model).
 * Returns an error message on mismatch, else `undefined` once written.
 */
export function writeScreenshotOrError(path: string, data: Buffer, mimeType: string): string | undefined {
  const valid = MIME_EXTS[mimeType] ?? [];
  const ext = extname(path).toLowerCase();
  if (!valid.includes(ext)) {
    return `path extension "${ext || "(none)"}" does not match ${mimeType} output (expected ${valid.join(" or ")})`;
  }
  writeFileBytes(path, data);
  return undefined;
}

/**
 * Runs the optional `path` write for a single-image capture, then delegates
 * to `onSuccess` for the branch's normal result — or short-circuits with a
 * `path_extension_mismatch` error `CallToolResult` when the write is
 * rejected. When `path` is `undefined`, `onSuccess` runs immediately (no-op
 * write), matching the caller's original "only write when `path` is set"
 * behavior.
 */
export function withOptionalWrite(
  path: string | undefined,
  data: Buffer,
  mimeType: string,
  onSuccess: () => CallToolResult,
): CallToolResult {
  if (path) {
    const err = writeScreenshotOrError(path, data, mimeType);
    if (err) return errorResult(err, "path_extension_mismatch");
  }
  return onSuccess();
}

/**
 * Rejects `path` when the requested capture would produce more than one
 * image — `browser_screenshot`'s `path` option only writes a single file, so
 * multi-viewport requests combined with `path` are unsupported. Returns the
 * `path_multi_viewport_unsupported` error `CallToolResult`, or `undefined`
 * when `path` is compatible with `viewportCount`.
 */
export function validateMultiViewportPath(path: string | undefined, viewportCount: number): CallToolResult | undefined {
  if (!path || viewportCount <= 1) return undefined;
  return errorResult(
    "path is not supported when viewports.length > 1 (multiple images); use a single viewport with path",
    "path_multi_viewport_unsupported",
  );
}
