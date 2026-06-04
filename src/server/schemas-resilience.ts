/**
 * Resilience sub-schemas (retry, captcha, circuit breaker) shared by the
 * agent option shape. Extracted to keep schemas.ts under the size budget.
 * @module server/schemas-resilience
 */
import { z } from "zod";

/** Navigation retry/backoff overrides. */
export const retrySchema = z
  .object({
    maxAttempts: z.number().int().optional(),
    baseMs: z.number().int().optional(),
    capMs: z.number().int().optional(),
    throttleMs: z.number().int().optional(),
  })
  .optional();

/** Captcha solver config (opt-in, authorized testing only). */
export const captchaSchema = z
  .object({
    provider: z.enum(["2captcha", "anticaptcha", "capmonster"]),
    apiKey: z.string(),
    baseUrl: z.string().optional(),
    timeoutMs: z.number().int().optional(),
    pollMs: z.number().int().optional(),
  })
  .optional();

/** Per-host circuit breaker (opt-in; off unless provided). */
export const circuitBreakerSchema = z
  .object({
    threshold: z.number().int().optional(),
    cooldownMs: z.number().int().optional(),
    capMs: z.number().int().optional(),
  })
  .optional()
  .describe("Per-host circuit breaker: fail fast after N consecutive failures on a host (opt-in).");

/** Bounded probe queue + per-process budget (opt-in; off unless provided). */
export const probeQueueSchema = z
  .object({
    concurrency: z.number().int().optional(),
    maxQueue: z.number().int().optional(),
    maxProbes: z.number().int().optional(),
  })
  .optional()
  .describe("Bounded probe queue: cap concurrent probes, fail fast when full, optional per-process budget (opt-in).");
