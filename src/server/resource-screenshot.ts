/**
 * Screenshot capture backing the `screenshot://{sessionId}/last` MCP resource.
 * @module server/resource-screenshot
 */
import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { SessionNotFoundError } from "../lib/errors.js";
import type { SessionManager } from "../session/manager.js";

/** MIME type of the resource blob. */
const JPEG_MIME = "image/jpeg";

/**
 * Capture a JPEG of the session's current page and return it as a base64 blob.
 * @param sessions - Live session registry.
 * @param sessionId - Target session id (from the resource URI).
 * @param uriHref - Resolved resource URI to echo back in the content.
 * @throws {SessionNotFoundError} when no live session matches `sessionId`.
 */
export async function captureSessionScreenshot(
  sessions: SessionManager,
  sessionId: string,
  uriHref: string,
): Promise<ReadResourceResult> {
  const session = sessions.get(sessionId);
  const buffer = await session.page.screenshot({ type: "jpeg", quality: 80, fullPage: false });
  return {
    contents: [{ uri: uriHref, mimeType: JPEG_MIME, blob: buffer.toString("base64") }],
  };
}

/** True when `error` signals an unknown/expired session. */
export function isSessionMissing(error: unknown): boolean {
  return error instanceof SessionNotFoundError;
}
