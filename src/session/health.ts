/**
 * Crash/disconnect health tracking for a live session. Wires Playwright page
 * and browser events to a mutable `health` flag the tool layer reads to decide
 * whether to recover (page crashed, context alive) or evict (browser lost).
 * @module session/health
 */
import type { SessionData } from "./session.js";

/** Options for {@link attachHealth}. */
export interface AttachHealthOptions {
  /**
   * Attach only the page-level listeners (crash/close/framenavigated). Used on
   * recovery, where the context/browser are the same long-lived objects and
   * their listeners are already wired — re-adding them leaks handlers.
   */
  pageOnly?: boolean;
}

/**
 * Wire crash/close/disconnect events onto the session's current page, context
 * and browser. Page-level listeners are guarded by identity so a recovered
 * page's teardown of the old one cannot re-flip a healthy session.
 *
 * @param session - The live session whose `page`/`context`/`browser` to watch.
 * @param opts - When `pageOnly`, skip the once-per-session context/browser hooks.
 */
export function attachHealth(session: SessionData, opts: AttachHealthOptions = {}): void {
  const page = session.page;
  const markCrashed = (): void => {
    if (session.page === page && session.health === "ok") session.health = "crashed";
  };
  // `crash` and `close` are distinct in Playwright (no cross-fire); treat both
  // as "page gone but context likely alive" → recoverable via context.newPage().
  page.on("crash", markCrashed);
  page.on("close", markCrashed);
  page.on("framenavigated", (frame) => {
    if (session.page === page && frame === page.mainFrame()) session.lastUrl = frame.url();
  });
  if (opts.pageOnly) return;
  // Context/browser gone → unrecoverable within this session. Wired once; the
  // objects survive page recovery, so re-adding on recovery would accumulate
  // handlers and trip Node's MaxListenersExceededWarning.
  session.context.on("close", () => {
    session.health = "lost";
  });
  session.browser?.on("disconnected", () => {
    session.health = "lost";
  });
}
