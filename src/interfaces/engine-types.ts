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

/** Installed-browser channel to drive the user's real Chrome/Edge (Chromium-only). */
export type BrowserChannel =
  | "chrome"
  | "chrome-beta"
  | "chrome-dev"
  | "chrome-canary"
  | "msedge"
  | "msedge-beta"
  | "msedge-dev"
  | "msedge-canary";
