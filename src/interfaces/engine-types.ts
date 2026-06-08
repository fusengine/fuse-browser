/**
 * Browser engine identifiers and channels.
 * @module interfaces/engine-types
 */

/**
 * Underlying browser engine.
 * - `patchright` / `playwright`: Chromium (stealth / reference).
 * - `firefox` / `webkit`: other engines via Playwright (no stealth, no CDP/channel).
 */
export type EngineName = "playwright" | "patchright" | "firefox" | "webkit";

/** Stable engine label: {@link EngineName} plus `cdp` (attach engine, not launchable). */
export type EngineId = EngineName | "cdp";

/**
 * Browser channel (Chromium-only). `chromium` = the Playwright-managed
 * Chrome-for-Testing build (default, reliable on servers); `chrome`/`msedge`*
 * drive the user's installed system browser (host-specific — may have no network
 * route in some server setups, see engine/channel-cascade).
 */
export type BrowserChannel =
  | "chromium"
  | "chrome"
  | "chrome-beta"
  | "chrome-dev"
  | "chrome-canary"
  | "msedge"
  | "msedge-beta"
  | "msedge-dev"
  | "msedge-canary";
