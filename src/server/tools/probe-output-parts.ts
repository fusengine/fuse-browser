/**
 * Probe-only zod `outputSchema` pieces: browser identity, consent handling,
 * currency alignment, captcha outcome, visual observation, and the
 * replay/site-memory bookkeeping blocks of a probe report.
 * @module server/tools/probe-output-parts
 */
import { z } from "zod";

/** Matches `interfaces/report.ts#Identity`. */
export const identitySchema = z.object({
  countryCode: z.string(),
  locale: z.string(),
  timezoneId: z.string(),
  currency: z.string(),
  geolocation: z.object({ latitude: z.number(), longitude: z.number() }),
  acceptLanguage: z.string(),
  realisticProfile: z.boolean(),
  persistentProfile: z.boolean(),
  userDataDir: z.string().nullable(),
  proxyEnabled: z.boolean(),
  proxyUrl: z.string().nullable(),
  proxySource: z.string().nullable(),
  proxyCountryCode: z.string().nullable(),
  proxyRequiredForIpAlignment: z.boolean(),
});

/** Matches `interfaces/report.ts#ConsentResult`. */
export const consentSchema = z.object({
  handled: z.boolean(),
  target: z.string().optional(),
  strategy: z.string().optional(),
});

/** Matches `interfaces/report.ts#CurrencyResult`. */
export const currencyResultSchema = z.object({
  countryCode: z.string(),
  preferred: z.string(),
  detected: z.string().nullable(),
  handled: z.boolean(),
  mismatch: z.boolean().optional(),
  detectedAfter: z.string().nullable().optional(),
  reason: z.string().optional(),
});

/** Matches `interfaces/net.ts#CaptchaOutcome`. */
export const captchaOutcomeSchema = z.object({
  attempted: z.boolean(),
  solved: z.boolean(),
  kind: z.enum(["recaptcha", "turnstile"]).optional(),
  provider: z.enum(["2captcha", "anticaptcha", "capmonster"]).optional(),
  reason: z.string().optional(),
});

/** Matches `interfaces/extraction.ts#Visual` (or `{}` when unobserved). */
export const visualSchema = z.object({
  screenshotPath: z.string().optional(),
  viewport: z.object({ width: z.number(), height: z.number() }).optional(),
  interactiveElements: z.array(z.unknown()).optional(),
});

/**
 * Matches the probe report's `replay` block. `steps` stays permissive:
 * each step's `action`/before-after DOM signatures are internal debug detail.
 */
export const replaySchema = z.object({
  enabled: z.boolean(),
  steps: z.array(z.unknown()),
  dir: z.string().nullable(),
});

/** Matches the probe report's `siteMemory` block. */
export const siteMemorySchema = z.object({
  enabled: z.boolean(),
  updated: z.boolean(),
  filePath: z.string(),
});
