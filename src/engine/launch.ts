/**
 * Shared launch logic (persistent or ephemeral context), engine-aware.
 * Chromium-only options (args, channel) are NOT passed to Firefox/WebKit, which
 * reject unknown Chromium flags (e.g. WebKit throws on `--no-sandbox`).
 * @module engine/launch
 */
import { existsSync } from "node:fs";
import type { BrowserType, LaunchOptions } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import type { OpenedContext } from "../interfaces/engine.js";
import { buildContextOptions } from "./context.js";
import { isChromiumEngine } from "./loader.js";

const CHROMIUM_ARGS = ["--no-sandbox", "--disable-blink-features=AutomationControlled"];

/** Build LaunchOptions, applying Chromium-only fields only for Chromium engines. */
function buildLaunchOptions(config: ResolvedConfig): LaunchOptions {
  const opts: LaunchOptions = { headless: config.headless };
  if (isChromiumEngine(config.engine)) {
    opts.args = CHROMIUM_ARGS;
    if (config.channel) opts.channel = config.channel;
  }
  if (config.executablePath) opts.executablePath = config.executablePath;
  if (config.proxyUrl) opts.proxy = { server: config.proxyUrl };
  return opts;
}

/** Launch the given engine (persistent or ephemeral) and return a ready context. */
export async function launchBrowser(
  browserType: BrowserType,
  config: ResolvedConfig,
): Promise<OpenedContext> {
  const launchOptions = buildLaunchOptions(config);
  const contextOptions = buildContextOptions(config.identity, config.realisticProfile);

  if (config.userDataDir) {
    const context = await browserType.launchPersistentContext(config.userDataDir, {
      ...launchOptions,
      ...contextOptions,
    });
    return { context, browser: null };
  }

  const browser = await browserType.launch(launchOptions);
  if (config.storageStatePath && existsSync(config.storageStatePath)) {
    contextOptions.storageState = config.storageStatePath;
  }
  const context = await browser.newContext(contextOptions);
  return { context, browser };
}
