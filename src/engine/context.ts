/**
 * Build the browser context options (identity, viewport, headers).
 * @module engine/context
 */
import type { BrowserContextOptions } from "playwright";
import { REALISTIC_DESKTOP_UA } from "../identity/country-profiles.js";
import type { ResolvedIdentity } from "../identity/resolve.js";

/** Shared viewport/screen dimensions (context + visual observation). */
export const VIEWPORT = { width: 1365, height: 900 } as const;

/** Assemble `newContext` options from the resolved identity. */
export function buildContextOptions(
  identity: ResolvedIdentity,
  realisticProfile: boolean,
): BrowserContextOptions {
  const opts: BrowserContextOptions = {
    viewport: { ...VIEWPORT },
    screen: { ...VIEWPORT },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: identity.locale,
    timezoneId: identity.timezoneId,
    geolocation: identity.geolocation,
    permissions: ["geolocation"],
    extraHTTPHeaders: { "Accept-Language": identity.acceptLanguage },
  };
  if (realisticProfile) opts.userAgent = REALISTIC_DESKTOP_UA;
  return opts;
}
