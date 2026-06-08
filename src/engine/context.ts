/**
 * Build the browser context options (identity, viewport, headers).
 * @module engine/context
 */
import type { BrowserContextOptions } from "playwright";
import type { ResolvedIdentity } from "../identity/resolve.js";
import { randInt } from "../lib/text.js";

/** Shared viewport for stable visual capture (screenshots / visual diff). */
export const VIEWPORT = { width: 1365, height: 900 } as const;

/** Common real-world desktop resolutions (Statcounter 2026) for realistic rotation. */
const VIEWPORT_POOL = [
  { width: 1920, height: 1080 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 2560, height: 1440 },
  { width: 1280, height: 800 },
] as const;

/** Pick a realistic desktop viewport at random — breaks the fixed-size fleet fingerprint. */
function pickViewport(): { width: number; height: number } {
  return VIEWPORT_POOL[randInt(0, VIEWPORT_POOL.length - 1)] ?? VIEWPORT;
}

/** Optional HAR recording for the context. */
export interface HarRecord {
  path: string;
  mode: "minimal" | "full";
}

/**
 * Assemble `newContext` options from the resolved identity.
 *
 * No `userAgent` override: a static UA string desyncs from the real browser's
 * `sec-ch-ua` and `navigator.userAgentData` (Playwright does NOT rewrite Client
 * Hints) — a detectable lie. The real browser UA, kept current by the stealth
 * channel cascade, is used instead. `realisticProfile` rotates the viewport
 * (lower fleet entropy) rather than spoofing the UA.
 */
export function buildContextOptions(
  identity: ResolvedIdentity,
  realisticProfile: boolean,
  har?: HarRecord | null,
): BrowserContextOptions {
  const vp = realisticProfile ? pickViewport() : VIEWPORT;
  const opts: BrowserContextOptions = {
    viewport: { ...vp },
    screen: { ...vp },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: identity.locale,
    timezoneId: identity.timezoneId,
    geolocation: identity.geolocation,
    permissions: ["geolocation"],
    extraHTTPHeaders: { "Accept-Language": identity.acceptLanguage },
  };
  if (har) opts.recordHar = { path: har.path, mode: har.mode };
  return opts;
}
