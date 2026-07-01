/**
 * A live browser session: a context + page kept alive between MCP calls.
 * @module session/session
 */
import type { Browser, BrowserContext, Page } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import { attachListeners, type NetworkLog } from "../agent/network.js";
import { selectEngineForConfig } from "../engine/registry.js";
import { attachDialogs } from "./dialogs.js";
import { attachDownloads } from "./downloads.js";
import { attachHealth } from "./health.js";

/** Liveness of a session's page/browser. */
export type SessionHealth = "ok" | "crashed" | "lost";

/** Live session state. */
export interface SessionData {
  id: string;
  context: BrowserContext;
  browser: Browser | null;
  page: Page;
  config: ResolvedConfig;
  logs: NetworkLog;
  connected: boolean;
  /** Page/browser liveness, flipped by crash/disconnect listeners. */
  health: SessionHealth;
  /** Last main-frame URL, tracked for recovery re-navigation. */
  lastUrl: string;
  /** Secrets filled from the vault this session; redacted from snapshots. */
  secrets: Set<string>;
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
  const session: SessionData = {
    id,
    context: opened.context,
    browser: opened.browser,
    page,
    config,
    logs,
    connected: opened.connected ?? false,
    health: "ok",
    lastUrl: page.url(),
    secrets: new Set(),
    createdAt: now,
    expiresAt: now + ttlMs,
  };
  attachHealth(session);
  attachDialogs(session);
  attachDownloads(session);
  return session;
}
