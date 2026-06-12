/**
 * Session teardown: persist storage state, then close context + browser.
 * @module session/close
 */
import { persistStorageState } from "./persist-auth.js";
import type { SessionData } from "./session.js";

/**
 * Close a session. For launched browsers, close context + browser. For a CDP
 * attach (`connected`), only drop the link — never close the user's browser
 * or its default context.
 */
export async function closeSession(session: SessionData): Promise<void> {
  if (session.connected) {
    try {
      await session.browser?.close();
    } catch {
      /* ignore: detaching from a user browser */
    }
    return;
  }
  await persistStorageState(session.context, session.config.storageStatePath);
  try {
    await session.context.close();
  } catch {
    /* ignore */
  }
  if (session.browser) {
    try {
      await session.browser.close();
    } catch {
      /* ignore */
    }
  }
}
