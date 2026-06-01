/**
 * Attach network and console listeners to a page.
 * @module agent/network
 */
import type { Page } from "playwright";

const MAX_ENTRIES = 80;

/** Collected network and console entries (live, mutated by the listeners). */
export interface NetworkLog {
  network: Array<Record<string, unknown>>;
  console: Array<{ type: string; text: string }>;
}

function pushCapped<T>(arr: T[], item: T): void {
  arr.push(item);
  if (arr.length > MAX_ENTRIES) arr.shift();
}

/** Register request/response/console listeners and return their backing arrays. */
export function attachListeners(page: Page): NetworkLog {
  const network: Array<Record<string, unknown>> = [];
  const consoleEntries: Array<{ type: string; text: string }> = [];
  page.on("request", (req) => pushCapped(network, { type: "request", method: req.method(), url: req.url() }));
  page.on("response", (res) => pushCapped(network, { type: "response", status: res.status(), url: res.url() }));
  page.on("console", (msg) => pushCapped(consoleEntries, { type: msg.type(), text: msg.text() }));
  return { network, console: consoleEntries };
}
