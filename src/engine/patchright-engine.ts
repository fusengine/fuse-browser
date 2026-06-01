/**
 * Patchright browser engine (stealth Chromium), with Playwright fallback.
 * @module engine/patchright-engine
 */
import type { ResolvedConfig } from "../agent/config.js";
import type { BrowserEngine, OpenedContext } from "../interfaces/engine.js";
import { launchChromium } from "./launch.js";
import { loadChromium } from "./loader.js";

/** Engine backed by Patchright (falls back to Playwright if unavailable). */
export const patchrightEngine: BrowserEngine = {
  name: "patchright",
  async open(config: ResolvedConfig): Promise<OpenedContext> {
    return launchChromium(await loadChromium("patchright"), config);
  },
};
