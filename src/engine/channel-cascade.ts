/**
 * Stealth channel cascade: prefer the Playwright-managed full Chromium build
 * (Chrome-for-Testing — new headless, no `HeadlessChrome` in sec-ch-ua /
 * userAgentData, real WebGL), falling back to the bundled headless-shell. The
 * SYSTEM Google Chrome (`channel:chrome`) is NOT used by default: it is host-
 * specific and on some servers launches fine but has no network route
 * (`ERR_INTERNET_DISCONNECTED`), which the cascade cannot detect (a runtime nav
 * failure, not a launch failure). Pin `channel:"chrome"` explicitly to opt in.
 * Each launch retries down the cascade only when the chosen binary is missing.
 * @module engine/channel-cascade
 */
import type { ResolvedConfig } from "../agent/config.js";
import type { BrowserChannel } from "../interfaces/engine-types.js";
import { isChromiumEngine } from "./loader.js";

/** Launch channel; `undefined` = bundled headless-shell. */
export type LaunchChannel = BrowserChannel | "chromium" | undefined;

/** Ordered cascade for a realistic Chromium profile with no pinned channel. */
const STEALTH_CASCADE: LaunchChannel[] = ["chromium", undefined];

/** True when a launch error means the requested browser binary is not installed. */
function isMissingBinary(err: unknown): boolean {
  const m = String((err as Error)?.message ?? err);
  return (
    m.includes("is not found") ||
    m.includes("Executable doesn't exist") ||
    m.includes("Chromium distribution")
  );
}

/**
 * Resolve the channel cascade for `config`. A pinned `executablePath` or
 * `channel` wins (single attempt); a realistic Chromium profile gets the full
 * stealth cascade; everything else uses the bundled browser.
 *
 * @param config - Resolved browser config.
 * @returns Channels to try in order.
 */
export function channelCascadeFor(config: ResolvedConfig): LaunchChannel[] {
  if (config.executablePath) return [undefined];
  if (config.channel) return [config.channel];
  if (isChromiumEngine(config.engine) && config.realisticProfile) return [...STEALTH_CASCADE];
  return [undefined];
}

/**
 * Try `launch(channel)` for each channel in `cascade`, falling through to the
 * next only when the binary is missing. The last attempt's error propagates.
 *
 * @param cascade - Channels to try in order (last is usually `undefined`).
 * @param launch - Launches with the given channel; returns its result.
 * @returns The first successful launch.
 */
export async function launchCascade<T>(
  cascade: LaunchChannel[],
  launch: (channel: LaunchChannel) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < cascade.length; i += 1) {
    try {
      return await launch(cascade[i]);
    } catch (err) {
      lastError = err;
      if (!isMissingBinary(err) || i === cascade.length - 1) throw err;
    }
  }
  throw lastError;
}
