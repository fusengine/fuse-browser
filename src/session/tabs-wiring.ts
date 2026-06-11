/**
 * Per-page wiring registry for multi-tab sessions: network logs and page-level
 * health listeners must be attached exactly once per Page — re-selecting a tab
 * must not stack handlers (same per-page logs pattern as session/recover.ts).
 * @module session/tabs-wiring
 */
import type { Page } from "playwright";
import { attachListeners, type NetworkLog } from "../agent/network.js";
import { attachHealth } from "./health.js";
import type { SessionData } from "./session.js";

// Weak keys die with their Page, so closed tabs cost nothing.
const pageLogs = new WeakMap<Page, NetworkLog>();
const healthWired = new WeakSet<Page>();

/** Record the wiring openSession/recoverSession already did on the active page. */
export function seedActive(session: SessionData): void {
  pageLogs.set(session.page, session.logs);
  healthWired.add(session.page);
}

/**
 * Attach a network log to a freshly-opened tab BEFORE it navigates, so the
 * tab's initial document and subresources are captured (a page opened with a
 * URL would otherwise emit every request before `selectTab` wires it).
 * Idempotent per page; the log is reused by a later `wireTab`.
 */
export function primeTab(page: Page): NetworkLog {
  let logs = pageLogs.get(page);
  if (!logs) {
    logs = attachListeners(page);
    pageLogs.set(page, logs);
  }
  return logs;
}

/** Resolve a tab index against the context's pages or throw a RangeError. */
export function tabAt(session: SessionData, index: number): Page {
  const all = session.context.pages();
  const page = all[index];
  if (!page) throw new RangeError(`invalid_tab_index: ${index} (session has ${all.length} tabs, 0-based)`);
  return page;
}

/**
 * Wire health (pageOnly) and network listeners on a page's first selection —
 * popups arrive unwired — and return its NetworkLog. Idempotent: an already
 * wired page just gets its existing log back. Call AFTER `session.page` was
 * re-pointed to `page` (attachHealth guards listeners by that identity).
 */
export function wireTab(session: SessionData, page: Page): NetworkLog {
  let logs = pageLogs.get(page);
  if (!logs) {
    logs = attachListeners(page);
    pageLogs.set(page, logs);
  }
  if (!healthWired.has(page)) {
    healthWired.add(page);
    attachHealth(session, { pageOnly: true });
  }
  return logs;
}
