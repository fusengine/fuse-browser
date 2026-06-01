/**
 * Playwright-backed engines: Chromium (reference), Firefox, WebKit.
 * @module engine/playwright-engine
 */
import type { ResolvedConfig } from "../agent/config.js";
import type { BrowserEngine, OpenedContext } from "../interfaces/engine.js";
import { launchBrowser } from "./launch.js";
import { loadBrowserType } from "./loader.js";

/** Engine backed by the official Playwright Chromium. */
export const playwrightEngine: BrowserEngine = {
  name: "playwright",
  async open(config: ResolvedConfig): Promise<OpenedContext> {
    return launchBrowser(await loadBrowserType("playwright"), config);
  },
};

/** Engine backed by Playwright Firefox (Gecko). No stealth, no CDP/channel. */
export const firefoxEngine: BrowserEngine = {
  name: "firefox",
  async open(config: ResolvedConfig): Promise<OpenedContext> {
    return launchBrowser(await loadBrowserType("firefox"), config);
  },
};

/** Engine backed by Playwright WebKit (Safari engine). No stealth, no CDP/channel. */
export const webkitEngine: BrowserEngine = {
  name: "webkit",
  async open(config: ResolvedConfig): Promise<OpenedContext> {
    return launchBrowser(await loadBrowserType("webkit"), config);
  },
};
