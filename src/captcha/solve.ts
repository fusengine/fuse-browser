/**
 * Captcha-solving orchestrator: detect kind, read sitekey, solve, inject.
 * Opt-in and for authorized testing only; failures are reported, never thrown.
 * @module captcha/solve
 */
import type { Page } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import type { Challenges } from "../interfaces/extraction.js";
import type { CaptchaConfig, CaptchaKind, CaptchaOutcome } from "../interfaces/net.js";
import type { ProbeOptions } from "../interfaces/types.js";
import { logger } from "../lib/logger.js";
import { solveToken } from "../net/captcha-client.js";
import { injectToken, readSitekey } from "../net/captcha-inject.js";

type MaybeChallenges = Challenges | Record<string, never>;

/** Pick the solvable captcha kind present on the page, if any. */
function pickKind(challenges: MaybeChallenges): CaptchaKind | null {
  if ("turnstile" in challenges && challenges.turnstile) return "turnstile";
  if ("captcha" in challenges && challenges.captcha) return "recaptcha";
  return null;
}

/** Solve a detected captcha. No-op (attempted=false) when none is solvable. */
export async function maybeSolveCaptcha(
  page: Page,
  challenges: MaybeChallenges,
  cfg: CaptchaConfig,
): Promise<CaptchaOutcome> {
  const kind = pickKind(challenges);
  if (!kind) return { attempted: false, solved: false };
  try {
    const websiteKey = await readSitekey(page);
    if (!websiteKey) return { attempted: true, solved: false, kind, reason: "sitekey-not-found" };
    const token = await solveToken(cfg, { kind, websiteURL: page.url(), websiteKey });
    const injected = await injectToken(page, token);
    return {
      attempted: true,
      solved: injected,
      kind,
      provider: cfg.provider,
      reason: injected ? undefined : "token-injection-failed",
    };
  } catch (error) {
    logger.warn("captcha solve failed", { err: String(error) });
    return { attempted: true, solved: false, kind, provider: cfg.provider, reason: String(error) };
  }
}

/** Solve only when opted-in (`solveCaptcha`) and configured; else undefined. */
export function solveIfEnabled(
  page: Page,
  challenges: MaybeChallenges,
  options: ProbeOptions,
  config: ResolvedConfig,
): Promise<CaptchaOutcome> | undefined {
  if (!options.solveCaptcha || !config.captcha) return undefined;
  return maybeSolveCaptcha(page, challenges, config.captcha);
}
