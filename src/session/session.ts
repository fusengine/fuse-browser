/**
 * A live browser session: a context + page kept alive between MCP calls.
 * @module session/session
 */
import { dirname } from "node:path";
import type { Browser, BrowserContext, Page } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import { attachListeners, type NetworkLog } from "../agent/network.js";
import { selectEngineForConfig } from "../engine/registry.js";
import { ensureDir } from "../lib/fs.js";

/** Live session state. */
export interface SessionData {
  id: string;
  context: BrowserContext;
  browser: Browser | null;
  page: Page;
  config: ResolvedConfig;
  logs: NetworkLog;
  connected: boolean;
  createdAt: number;
  expiresAt: number;
}

/** Open a new live session with listeners attached. */
export async function openSession(
  id: string,
  config: ResolvedConfig,
  ttlMs: number,
): Promise<SessionData> {
  const opened = await selectEngineForConfig(config).open(config);
  const page = opened.page ?? (await opened.context.newPage());
  if (config.harReplay) {
    await page
      .routeFromHAR(config.harReplay, { url: "**/*", update: false, notFound: "fallback" })
      .catch(() => {});
  }
  const logs = attachListeners(page);
  const now = Date.now();
  return {
    id,
    context: opened.context,
    browser: opened.browser,
    page,
    config,
    logs,
    connected: opened.connected ?? false,
    createdAt: now,
    expiresAt: now + ttlMs,
  };
}

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
  if (session.config.storageStatePath) {
    try {
      ensureDir(dirname(session.config.storageStatePath));
      await session.context.storageState({ path: session.config.storageStatePath });
    } catch {
      /* best-effort: never block teardown */
    }
  }
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
