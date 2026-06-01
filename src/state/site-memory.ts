/**
 * Per-site memory: reuse winning action strategies across runs.
 * @module state/site-memory
 */
import { join } from "node:path";
import type { ActionResult } from "../interfaces/types.js";
import { readJsonSafe, writeJson } from "../lib/fs.js";

/** Stored entry for a successful action. */
export interface MemoryEntry {
  strategy: string;
  lastOkAt: number;
  target?: string;
  type?: string;
}

/** A site's memory contents. */
export interface SiteMemory {
  site: string;
  actions: Record<string, MemoryEntry>;
}

/** Stable site key derived from the host (or "data" for data: URLs). */
export function siteKey(url: string): string {
  if (url.startsWith("data:")) return "data";
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    host = "";
  }
  return host.replace(/[^a-z0-9.-]+/g, "-") || "unknown";
}

/** Memory file path for a given URL. */
export function siteMemoryFilePath(dir: string, url: string): string {
  return join(dir, `${siteKey(url)}.json`);
}

/** Load a site's memory (empty structure if absent/unreadable). */
export function loadSiteMemory(dir: string, url: string): SiteMemory {
  const fallback: SiteMemory = { site: siteKey(url), actions: {} };
  const data = readJsonSafe<Partial<SiteMemory>>(siteMemoryFilePath(dir, url), fallback);
  return { site: data.site ?? siteKey(url), actions: data.actions ?? {} };
}

/** Memory key for an action (only click/fill are memorized). */
export function actionMemoryKey(action: { type?: string; target?: string }): string | null {
  if (action.type !== "click" && action.type !== "fill") return null;
  return `${action.type}:${action.target ?? ""}`;
}

/** Return the stored entry matching an action, if any. */
export function rememberedAction(
  memory: SiteMemory,
  action: { type?: string; target?: string },
): MemoryEntry | null {
  const key = actionMemoryKey(action);
  return key ? (memory.actions[key] ?? null) : null;
}

/** Persist the winning strategy of an action; returns true if written. */
export function rememberActionStrategy(
  dir: string,
  url: string,
  action: { type?: string; target?: string },
  result: ActionResult,
): boolean {
  const key = actionMemoryKey(action);
  if (!key || !result.strategy) return false;
  const memory = loadSiteMemory(dir, url);
  memory.actions[key] = {
    strategy: result.strategy,
    lastOkAt: Math.floor(Date.now() / 1000),
    target: action.target,
    type: action.type,
  };
  writeJson(siteMemoryFilePath(dir, url), memory);
  return true;
}
