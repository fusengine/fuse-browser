/**
 * Per-context configuration on an already-launched browser: identity, HAR,
 * storage state, and a coherent (headless-free) user-agent. Patchright stealth
 * is browser-level so every context inherits it; this only layers per-context.
 * @module engine/configured-context
 */
import { existsSync } from "node:fs";
import type { Browser, BrowserContext } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import { buildContextOptions } from "./context.js";

/** Cached coherent UA per browser (one real-UA read per browser process). */
const uaCache = new WeakMap<Browser, string | null>();

/**
 * The browser's real UA with the `HeadlessChrome` token rewritten to `Chrome`,
 * or null when no override is needed. Only the token is changed — the real
 * platform and version are preserved, so it stays coherent with the (already
 * clean) sec-ch-ua / userAgentData rather than spoofing a different identity.
 */
async function coherentUserAgent(browser: Browser): Promise<string | null> {
  const cached = uaCache.get(browser);
  if (cached !== undefined) return cached;
  let ua: string | null = null;
  try {
    const ctx = await browser.newContext();
    try {
      ua = await (await ctx.newPage()).evaluate(() => navigator.userAgent);
    } finally {
      await ctx.close().catch(() => {});
    }
  } catch {
    ua = null;
  }
  const result = ua?.includes("HeadlessChrome") ? ua.replace(/HeadlessChrome/g, "Chrome") : null;
  uaCache.set(browser, result);
  return result;
}

/**
 * Create a fresh, fully-configured context on an already-launched `browser`.
 * The reusable unit for a multi-context browser pool.
 *
 * @param browser - An already-launched browser.
 * @param config - Resolved browser config (identity, HAR, storage, profile).
 * @returns A ready isolated context.
 */
export async function newConfiguredContext(browser: Browser, config: ResolvedConfig): Promise<BrowserContext> {
  const har = config.harPath ? { path: config.harPath, mode: config.harMode } : null;
  const contextOptions = buildContextOptions(config.identity, config.realisticProfile, har);
  if (config.storageStatePath && existsSync(config.storageStatePath)) {
    contextOptions.storageState = config.storageStatePath;
  }
  if (config.realisticProfile) {
    const ua = await coherentUserAgent(browser);
    if (ua) contextOptions.userAgent = ua;
  }
  return browser.newContext(contextOptions);
}
