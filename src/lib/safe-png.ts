/**
 * Validation for client-supplied PNG file paths: rejects empty strings,
 * NUL bytes, and non-`.png` extensions before any filesystem access.
 * @module lib/safe-png
 */
import path from "node:path";

/**
 * Assert that `p` is a plausible PNG path: non-empty, NUL-free, and ending
 * in `.png` (case-insensitive) after `path.normalize()`.
 *
 * @param p - Raw path supplied by the MCP client.
 * @param label - Field name used in error messages (e.g. `"baseline"`).
 * @returns The normalized, resolved absolute path.
 * @throws Error when the path is empty, contains a NUL byte, or does not end with `.png`.
 */
export function assertPngPath(p: string, label: string): string {
  if (p === "") throw new Error(`${label}: path must be a non-empty string`);
  if (p.includes("\0")) throw new Error(`${label}: path must not contain NUL characters`);
  const normalized = path.normalize(p);
  if (!normalized.toLowerCase().endsWith(".png")) {
    throw new Error(`${label}: path must end with .png (got "${p}")`);
  }
  return path.resolve(normalized);
}
