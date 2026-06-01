/**
 * Browser engine loader. Resolves the Playwright/Patchright BrowserType for a
 * given engine name. Patchright (stealth) is Chromium-only with a Playwright
 * fallback; firefox/webkit come from Playwright.
 * @module engine/loader
 */
import type { BrowserType } from "playwright";
import type { EngineName } from "../interfaces/engine-types.js";
import { logger } from "../lib/logger.js";

/** True for engines backed by a Chromium browser (stealth/channel/CDP capable). */
export function isChromiumEngine(engine: EngineName): boolean {
  return engine === "patchright" || engine === "playwright";
}

/** Resolve the BrowserType (chromium/firefox/webkit) for the requested engine. */
export async function loadBrowserType(engine: EngineName): Promise<BrowserType> {
  if (engine === "patchright") {
    try {
      const mod = (await import("patchright")) as unknown as { chromium: BrowserType };
      return mod.chromium;
    } catch (err) {
      logger.warn("patchright unavailable, falling back to playwright chromium", { err: String(err) });
    }
  }
  const pw = await import("playwright");
  if (engine === "firefox") return pw.firefox;
  if (engine === "webkit") return pw.webkit;
  return pw.chromium;
}
