/**
 * Recreate a crashed page within its still-live context and restore the prior
 * URL, HAR replay and listeners. Used by the tool layer between MCP calls so a
 * page that died while idle is transparently healed before the next action.
 * @module session/recover
 */
import type { Page } from "playwright";
import { attachListeners } from "../agent/network.js";
import { BrowserLostError } from "../lib/errors.js";
import { attachDialogs } from "./dialogs.js";
import { attachDownloads } from "./downloads.js";
import { attachHealth } from "./health.js";
import type { SessionData } from "./session.js";

/**
 * Heal a session whose page crashed: open a fresh page in the same context
 * (which keeps cookies/storageState/auth), re-attach listeners and re-navigate
 * to the last URL. No-op when healthy.
 *
 * @param session - The session to recover; mutated in place on success.
 * @throws {BrowserLostError} when the context/browser is gone (unrecoverable).
 */
export async function recoverSession(session: SessionData): Promise<void> {
  if (session.health === "lost") throw new BrowserLostError(session.id);
  if (session.health !== "crashed") return;

  let page: Page;
  try {
    page = await session.context.newPage();
  } catch {
    session.health = "lost";
    throw new BrowserLostError(session.id);
  }

  session.page = page;
  session.logs = attachListeners(page);
  session.health = "ok";
  // Page-only: context/browser listeners persist across recovery (no re-add).
  attachHealth(session, { pageOnly: true });
  // Idempotent per page; dialog policy and download buffers survive recovery.
  attachDialogs(session);
  attachDownloads(session);

  if (session.config.harReplay) {
    await page
      .routeFromHAR(session.config.harReplay, { url: "**/*", update: false, notFound: "fallback" })
      .catch(() => {});
  }
  const url = session.lastUrl;
  if (url && url !== "about:blank") {
    await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
  }
}
