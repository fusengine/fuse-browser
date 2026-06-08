/**
 * Shared launch logic (persistent or ephemeral context), engine-aware.
 * Chromium-only options (args) are NOT passed to Firefox/WebKit, which reject
 * unknown Chromium flags (e.g. WebKit throws on `--no-sandbox`). The launch
 * channel is chosen by the stealth cascade ({@link channelCascadeFor}).
 * @module engine/launch
 */
import type { Browser, BrowserServer, BrowserType, LaunchOptions } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import type { OpenedContext } from "../interfaces/engine.js";
import { logger } from "../lib/logger.js";
import { channelCascadeFor, launchCascade } from "./channel-cascade.js";
import { newConfiguredContext } from "./configured-context.js";
import { buildContextOptions } from "./context.js";
import { isChromiumEngine } from "./loader.js";
import { WEBRTC_LEAK_ARGS } from "./webrtc.js";

const CHROMIUM_ARGS = ["--no-sandbox", "--disable-blink-features=AutomationControlled"];

/** Build LaunchOptions, applying Chromium-only fields only for Chromium engines. */
function buildLaunchOptions(config: ResolvedConfig): LaunchOptions {
  const opts: LaunchOptions = { headless: config.headless };
  if (isChromiumEngine(config.engine)) {
    opts.args = config.proxyUrl ? [...CHROMIUM_ARGS, ...WEBRTC_LEAK_ARGS] : [...CHROMIUM_ARGS];
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
  const cascade = channelCascadeFor(config);
  const dir = config.userDataDir;

  if (dir) {
    const har = config.harPath ? { path: config.harPath, mode: config.harMode } : null;
    const contextOptions = buildContextOptions(config.identity, config.realisticProfile, har);
    const context = await launchCascade(cascade, (channel) =>
      browserType.launchPersistentContext(dir, { ...launchOptions, ...contextOptions, channel }),
    ).catch(enrichLaunchError);
    return { context, browser: null };
  }

  const browser = await launchCascade(cascade, (channel) =>
    browserType.launch({ ...launchOptions, channel }),
  ).catch(enrichLaunchError);
  const context = await newConfiguredContext(browser, config);
  return { context, browser };
}

/**
 * Launch the engine as a separate server and connect a client browser to it.
 * Unlike {@link launchBrowser}, this returns the {@link BrowserServer} so the
 * caller can force-kill the browser process if a graceful close ever stalls —
 * the warm-pool path needs this to avoid zombie Chromium on a loaded host.
 */
export async function launchServerAndConnect(
  browserType: BrowserType,
  config: ResolvedConfig,
): Promise<{ server: BrowserServer; browser: Browser }> {
  const launchOptions = buildLaunchOptions(config);
  const server = await launchCascade(channelCascadeFor(config), (channel) =>
    browserType.launchServer({ ...launchOptions, channel }),
  ).catch(enrichLaunchError);
  const browser = await browserType.connect(server.wsEndpoint());
  return { server, browser };
}
