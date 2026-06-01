/**
 * Core domain types for the agentic browser.
 * @module interfaces/types
 */

import type { BrowserChannel, EngineName } from "./engine-types.js";
import type { CaptchaConfig, RetryConfig } from "./net.js";

/** Geographic coordinates for location emulation. */
export interface Geolocation {
  latitude: number;
  longitude: number;
}

/** Per-country identity profile (locale, currency, timezone, geo, language). */
export interface CountryProfile {
  locale: string;
  currency: string;
  timezoneId: string;
  geolocation: Geolocation;
  acceptLanguage: string;
}

/** Action that can be executed on the page. Discriminated union on `type`. */
export type BrowserAction =
  | { type: "click"; target: string; preferredStrategy?: string }
  | { type: "fill"; target: string; value: string; preferredStrategy?: string }
  | {
      type: "login";
      usernameTarget?: string;
      passwordTarget?: string;
      submitTarget?: string;
      username?: string;
      password?: string;
    }
  | { type: "wait"; ms?: number };

/** Normalized result of an action. */
export interface ActionResult {
  type: string;
  ok: boolean;
  target?: string;
  strategy?: string;
  error?: string;
  ms?: number;
  [extra: string]: unknown;
}

/** Agent construction options. */
export interface AgentOptions {
  outputDir?: string;
  engine?: EngineName;
  channel?: BrowserChannel;
  executablePath?: string;
  cdpEndpoint?: string;
  storageStatePath?: string;
  humanMode?: boolean;
  headless?: boolean;
  locale?: string;
  timezoneId?: string;
  countryCode?: string;
  currency?: string;
  userDataDir?: string;
  proxyUrl?: string;
  proxyCountryMap?: Record<string, string>;
  proxyMapPath?: string;
  proxiesPath?: string;
  realisticProfile?: boolean;
  replayEnabled?: boolean;
  replayDir?: string;
  siteMemoryDir?: string;
  /** Navigation retry/backoff overrides. */
  retry?: Partial<RetryConfig>;
  /** Captcha solver config (opt-in; authorized testing only). */
  captcha?: CaptchaConfig;
}

/** Per-probe options. */
export interface ProbeOptions {
  actions?: BrowserAction[];
  humanApproved?: boolean;
  autoConsent?: boolean;
  extractPrices?: boolean;
  waitMs?: number;
  detectChallenges?: boolean;
  observeVisual?: boolean;
  /** Attempt to solve a detected captcha (requires `captcha` config). */
  solveCaptcha?: boolean;
  /** Extract structured Google SERP (organic/ads/related) into the report. */
  extractSerp?: boolean;
  /** Number of SERP pages to aggregate (start=0,10,...). Default 1. */
  serpPages?: number;
  /** Domain to rank within the SERP (populates `serp.rank`). */
  rankDomain?: string;
}
