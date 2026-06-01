/**
 * Shared helper: resolve a session or return an error result.
 * @module server/tools/with-session
 */
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SessionNotFoundError } from "../../lib/errors.js";
import type { SessionManager } from "../../session/manager.js";
import type { SessionData } from "../../session/session.js";
import { errorResult } from "../result.js";

/** Run `fn` with the resolved session, or return an error result if missing. */
export async function withSession(
  sessions: SessionManager,
  id: string,
  fn: (session: SessionData) => Promise<CallToolResult>,
): Promise<CallToolResult> {
  let session: SessionData;
  try {
    session = sessions.get(id);
  } catch (err) {
    if (err instanceof SessionNotFoundError) return errorResult(err.message);
    throw err;
  }
  return fn(session);
}
