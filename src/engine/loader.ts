/**
 * Browser engine loader: Patchright (stealth) by default, with automatic
 * fallback to Playwright.
 * @module engine/loader
 */
import type { BrowserType } from "playwright";
import type { EngineName } from "../interfaces/types.js";
import { logger } from "../lib/logger.js";

/**
 * Return the `chromium` namespace of the requested engine.
 * For `patchright`, try Patchright then fall back to Playwright.
 */
export async function loadChromium(engine: EngineName): Promise<BrowserType> {
  if (engine === "patchright") {
    try {
      const mod = (await import("patchright")) as unknown as { chromium: BrowserType };
      return mod.chromium;
    } catch (err) {
      logger.warn("patchright unavailable, falling back to playwright", { err: String(err) });
    }
  }
  const pw = await import("playwright");
  return pw.chromium;
}
