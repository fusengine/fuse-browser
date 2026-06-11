/**
 * Pure filter/merge helpers for the session console and network log buffers.
 * @module server/tools/logs-filter
 */
import type { NetworkLog } from "../../agent/network.js";

const DEFAULT_LIMIT = 50;

/** One merged network row: request joined with its response by URL. */
export interface NetworkEntry {
  method?: string;
  url: string;
  status?: number;
  resourceType?: string;
}

/** Console-level filter values (Playwright console message types). */
export const CONSOLE_LEVELS = ["error", "warning", "info", "log", "debug"] as const;

/**
 * Filter console entries by level and keep the last `limit`.
 * @param entries - Raw console buffer from the session's NetworkLog.
 * @param level - Optional exact console type to keep (e.g. "error").
 * @param limit - Max entries returned, most recent last (default 50).
 */
export function filterConsole(
  entries: NetworkLog["console"],
  level?: string,
  limit: number = DEFAULT_LIMIT,
): NetworkLog["console"] {
  const matched = level ? entries.filter((e) => e.type === level) : entries;
  return matched.slice(-Math.max(0, limit));
}

/**
 * Merge raw request/response events into one row per URL (order preserved).
 * @param events - Raw network buffer from the session's NetworkLog.
 */
export function mergeNetwork(events: Array<Record<string, unknown>>): NetworkEntry[] {
  const byUrl = new Map<string, NetworkEntry>();
  for (const ev of events) {
    const url = String(ev.url ?? "");
    const row = byUrl.get(url) ?? { url };
    if (typeof ev.method === "string") row.method = ev.method;
    if (typeof ev.resourceType === "string") row.resourceType = ev.resourceType;
    if (typeof ev.status === "number") row.status = ev.status;
    if (!byUrl.has(url)) byUrl.set(url, row);
  }
  return [...byUrl.values()];
}

/**
 * Filter merged network rows by status / URL substring, keep the last `limit`.
 * @param rows - Merged rows from {@link mergeNetwork}.
 * @param f - Optional filters: exact `status`, `urlContains` substring, `limit`.
 */
export function filterNetwork(
  rows: NetworkEntry[],
  f: { status?: number; urlContains?: string; limit?: number } = {},
): NetworkEntry[] {
  let out = rows;
  if (f.status !== undefined) out = out.filter((r) => r.status === f.status);
  if (f.urlContains !== undefined) out = out.filter((r) => r.url.includes(f.urlContains as string));
  return out.slice(-Math.max(0, f.limit ?? DEFAULT_LIMIT));
}
