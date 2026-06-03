/**
 * Agent construction and per-probe option types.
 * @module interfaces/options
 */
import type { BrowserChannel, EngineName } from "./engine-types.js";
import type { CaptchaConfig, RetryConfig } from "./net.js";
import type { BrowserAction } from "./types.js";

/** Agent construction options. */
export interface AgentOptions {
  outputDir?: string;
  engine?: EngineName;
  channel?: BrowserChannel;
  executablePath?: string;
  cdpEndpoint?: string;
  /** Extra headers for the CDP connect handshake (e.g. Browserless auth token). */
  cdpHeaders?: Record<string, string>;
  /** Close the remote CDP session on teardown. Default true for ws/wss endpoints. */
  cdpCloseOnDone?: boolean;
  /** Timeout (ms) for the CDP connect. Default 20000. */
  cdpTimeoutMs?: number;
  storageStatePath?: string;
  /** HAR: record traffic to `harPath` (`harMode` minimal/full), or replay from `harReplay`. */
  harPath?: string;
  harMode?: "minimal" | "full";
  harReplay?: string;
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
