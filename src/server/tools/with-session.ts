/**
 * Shared helper: resolve a session, heal a crashed page, or return an error.
 * @module server/tools/with-session
 */
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { BrowserLostError, SessionNotFoundError } from "../../lib/errors.js";
import type { SessionManager } from "../../session/manager.js";
import { recoverSession } from "../../session/recover.js";
import type { SessionData } from "../../session/session.js";
import { errorResult } from "../result.js";

const LOST = "session_lost: browser disconnected — reopen with browser_open";
const HEALED = "page_crashed: the page was recreated and restored — retry your last action";

/** Evict a lost session and return the standard error result. */
async function evictLost(sessions: SessionManager, id: string): Promise<CallToolResult> {
  await sessions.close(id).catch(() => {});
  return errorResult(LOST);
}

/**
 * Bring a session to a usable state before running a tool: recover a crashed
 * page (context alive) or evict a lost browser. Returns an error result when
 * the session cannot be made healthy, otherwise `null`.
 */
async function ensureHealthy(
  sessions: SessionManager,
  id: string,
  session: SessionData,
): Promise<CallToolResult | null> {
  if (session.health === "ok") return null;
  if (session.health === "lost") return evictLost(sessions, id);
  try {
    await recoverSession(session);
    return null;
  } catch (err) {
    if (err instanceof BrowserLostError) return evictLost(sessions, id);
    throw err;
  }
}

/**
 * Run `fn` with the resolved session. Heals a page that crashed while idle
 * before the call; if the page dies during the call, the session is recovered
 * (or evicted) and a recoverable error is returned so the agent can retry.
 *
 * @param sessions - The session manager.
 * @param id - The session id from the tool arguments.
 * @param fn - The tool body to run with the live session.
 */
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

  const blocked = await ensureHealthy(sessions, id, session);
  if (blocked) return blocked;

  try {
    return await fn(session);
  } catch (err) {
    if (session.health === "ok") throw err;
    if (session.health === "lost") return evictLost(sessions, id);
    // Page crashed mid-call: heal it and ask the agent to retry. If recovery
    // discovers the browser is gone, evict rather than mislead into retrying.
    try {
      await recoverSession(session);
      return errorResult(HEALED);
    } catch {
      return evictLost(sessions, id);
    }
  }
}
