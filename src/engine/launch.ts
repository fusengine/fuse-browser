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
import { logger } from "../lib/logger.js";
import { buildContextOptions } from "./context.js";
import { isChromiumEngine } from "./loader.js";
import { WEBRTC_LEAK_ARGS } from "./webrtc.js";

const CHROMIUM_ARGS = ["--no-sandbox", "--disable-blink-features=AutomationControlled"];

/** Build LaunchOptions, applying Chromium-only fields only for Chromium engines. */
function buildLaunchOptions(config: ResolvedConfig): LaunchOptions {
  const opts: LaunchOptions = { headless: config.headless };
  if (isChromiumEngine(config.engine)) {
    opts.args = config.proxyUrl ? [...CHROMIUM_ARGS, ...WEBRTC_LEAK_ARGS] : [...CHROMIUM_ARGS];
    if (config.channel) opts.channel = config.channel;
  }
  if (config.executablePath) opts.executablePath = config.executablePath;
  if (config.proxyUrl) opts.proxy = { server: config.proxyUrl };
  return opts;
}

const INSTALL_HINT = "Chromium is not installed. Run: npx patchright install chromium";

/** Rethrow a launch failure with an actionable hint when the browser binary is missing. */
function enrichLaunchError(err: unknown): never {
  const message = String((err as Error)?.message ?? err);
  if (message.includes("Executable doesn't exist")) {
    logger.error("browser binary missing", { hint: INSTALL_HINT });
    throw new Error(`${INSTALL_HINT}\n${message}`);
  }
  throw err as Error;
}

/** Launch the given engine (persistent or ephemeral) and return a ready context. */
export async function launchBrowser(
  browserType: BrowserType,
  config: ResolvedConfig,
): Promise<OpenedContext> {
  const launchOptions = buildLaunchOptions(config);
  const har = config.harPath ? { path: config.harPath, mode: config.harMode } : null;
  const contextOptions = buildContextOptions(config.identity, config.realisticProfile, har);

  if (config.userDataDir) {
    const context = await browserType
      .launchPersistentContext(config.userDataDir, { ...launchOptions, ...contextOptions })
      .catch(enrichLaunchError);
    return { context, browser: null };
  }

  const browser = await browserType.launch(launchOptions).catch(enrichLaunchError);
  if (config.storageStatePath && existsSync(config.storageStatePath)) {
    contextOptions.storageState = config.storageStatePath;
  }
  const context = await browser.newContext(contextOptions);
  return { context, browser };
}
