/**
 * Multi-tab helpers over a live session: list, select, open and close the
 * pages (tabs, OAuth popups) of the session's browser context.
 * @module session/tabs
 */
import type { Page } from "playwright";
import { DEFAULT_GOTO, gotoWithRetry } from "../net/navigate.js";
import type { SessionData } from "./session.js";
import { primeTab, seedActive, tabAt, wireTab } from "./tabs-wiring.js";

/** One tab of a session, as reported to the agent. */
export interface TabInfo {
  index: number;
  url: string;
  title: string;
  active: boolean;
}

/** List the context's pages with index, url, title and the active marker. */
export async function listTabs(session: SessionData): Promise<TabInfo[]> {
  return Promise.all(
    session.context.pages().map(async (page, index) => ({
      index,
      url: page.url(),
      title: await page.title().catch(() => ""),
      active: page === session.page,
    })),
  );
}

/**
 * Make the tab at `index` the session's active page: re-points `session.page`,
 * `session.lastUrl` and `session.logs`. Health/network listeners are wired on
 * first selection only; each page keeps its own NetworkLog across switches.
 */
export async function selectTab(session: SessionData, index: number): Promise<Page> {
  seedActive(session);
  const page = tabAt(session, index);
  session.page = page;
  session.lastUrl = page.url();
  session.logs = wireTab(session, page);
  await page.bringToFront().catch(() => {});
  return page;
}

/**
 * Open a new tab (optionally navigated to `url` with retry) and select it.
 * On navigation failure the orphan page is closed before rethrowing.
 */
export async function openTab(session: SessionData, url?: string): Promise<Page> {
  const page = await session.context.newPage();
  // Wire the network log before navigating so the tab's first document and
  // subresources are captured (listeners attached after goto miss them).
  primeTab(page);
  if (url) {
    try {
      await gotoWithRetry(page, url, DEFAULT_GOTO);
    } catch (err) {
      await page.close().catch(() => {});
      throw err;
    }
  }
  await selectTab(session, session.context.pages().indexOf(page));
  return page;
}

/**
 * Close the tab at `index`. Closing the last tab is refused. When the active
 * tab is closed, the first remaining tab is selected BEFORE closing so the
 * health listener's identity guard keeps the session healthy.
 */
export async function closeTab(session: SessionData, index: number): Promise<void> {
  const all = session.context.pages();
  if (all.length <= 1)
    throw new Error("cannot_close_last_tab: a session needs one open tab — use browser_close instead");
  const page = tabAt(session, index);
  if (page === session.page) await selectTab(session, all.findIndex((p) => p !== page));
  await page.close();
}
