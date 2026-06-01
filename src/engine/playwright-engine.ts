/**
 * Playwright browser engine (the stable reference driver).
 * @module engine/playwright-engine
 */
import type { ResolvedConfig } from "../agent/config.js";
import type { BrowserEngine, OpenedContext } from "../interfaces/engine.js";
import { launchChromium } from "./launch.js";
import { loadChromium } from "./loader.js";

/** Engine backed by the official Playwright Chromium. */
export const playwrightEngine: BrowserEngine = {
  name: "playwright",
  async open(config: ResolvedConfig): Promise<OpenedContext> {
    return launchChromium(await loadChromium("playwright"), config);
  },
};
