/**
 * Shared chromium launch logic (persistent or ephemeral context).
 * Engine-agnostic: receives the `chromium` namespace from a {@link BrowserEngine}.
 * @module engine/launch
 */
import { existsSync } from "node:fs";
import type { BrowserType, LaunchOptions } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import type { OpenedContext } from "../interfaces/engine.js";
import { buildContextOptions } from "./context.js";

const LAUNCH_ARGS = ["--no-sandbox", "--disable-blink-features=AutomationControlled"];

/** Build LaunchOptions from the resolved config (channel/executablePath/proxy). */
function buildLaunchOptions(config: ResolvedConfig): LaunchOptions {
  const opts: LaunchOptions = { headless: config.headless, args: LAUNCH_ARGS };
  // `channel` drives the user's installed Chrome/Edge; `executablePath` wins
  // over `channel` when both are set (Playwright precedence).
  if (config.channel) opts.channel = config.channel;
  if (config.executablePath) opts.executablePath = config.executablePath;
  if (config.proxyUrl) opts.proxy = { server: config.proxyUrl };
  return opts;
}

/** Launch the given chromium (persistent or ephemeral) and return a ready context. */
export async function launchChromium(
  chromium: BrowserType,
  config: ResolvedConfig,
): Promise<OpenedContext> {
  const launchOptions = buildLaunchOptions(config);
  const contextOptions = buildContextOptions(config.identity, config.realisticProfile);

  if (config.userDataDir) {
    const context = await chromium.launchPersistentContext(config.userDataDir, {
      ...launchOptions,
      ...contextOptions,
    });
    return { context, browser: null };
  }

  const browser = await chromium.launch(launchOptions);
  if (config.storageStatePath && existsSync(config.storageStatePath)) {
    contextOptions.storageState = config.storageStatePath;
  }
  const context = await browser.newContext(contextOptions);
  return { context, browser };
}
