/**
 * Network resilience and captcha-solving types.
 * @module interfaces/net
 */

/** Retry/backoff and per-host throttle settings for navigations. */
export interface RetryConfig {
  /** Maximum navigation attempts (1 disables retry). */
  maxAttempts: number;
  /** Base backoff in ms (full-jitter exponential). */
  baseMs: number;
  /** Backoff ceiling in ms. */
  capMs: number;
  /** Minimum gap between hits on the same host in ms (0 disables). */
  throttleMs: number;
}

/** User-facing circuit-breaker overrides (all optional; see resolveBreaker). */
export interface CircuitBreakerOptions {
  /** Consecutive failures on a host before the circuit opens (default 5). */
  threshold?: number;
  /** First cooldown in ms once open (default 30000). */
  cooldownMs?: number;
  /** Ceiling for the exponential reopen backoff in ms (default 600000). */
  capMs?: number;
}

/** Resolved per-host circuit-breaker settings (null = disabled). */
export interface CircuitBreakerConfig {
  threshold: number;
  cooldownMs: number;
  capMs: number;
}

/** Supported captcha-solving providers (shared createTask/getTaskResult API). */
export type CaptchaProvider = "2captcha" | "anticaptcha" | "capmonster";

/** Captcha kind the solver can handle. */
export type CaptchaKind = "recaptcha" | "turnstile";

/**
 * Captcha solver configuration. Opt-in: intended for authorized testing on
 * sites you own or are permitted to test. Disabled unless explicitly provided.
 */
export interface CaptchaConfig {
  provider: CaptchaProvider;
  apiKey: string;
  /** Override the provider base URL (e.g. a 2captcha-compatible aggregator). */
  baseUrl?: string;
  /** Total solve budget in ms (default 180000). */
  timeoutMs?: number;
  /** Poll interval in ms while the task is processing (default 5000). */
  pollMs?: number;
}

/** A captcha-solving task derived from the page. */
export interface CaptchaTask {
  kind: CaptchaKind;
  websiteURL: string;
  websiteKey: string;
}

/** Result of a captcha-solving attempt (failures are reported, not thrown). */
export interface CaptchaOutcome {
  attempted: boolean;
  solved: boolean;
  kind?: CaptchaKind;
  provider?: CaptchaProvider;
  reason?: string;
}
