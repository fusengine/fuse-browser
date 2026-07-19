/**
 * Detection of anti-bot and authentication challenges.
 * @module extraction/challenges
 */
import type { Page } from "playwright";
import type { Challenges } from "../interfaces/extraction.js";
import { evalScript } from "../lib/evaluate.js";

const DOM_FLAGS_SCRIPT = `() => ({
  recaptcha: Boolean(document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]')),
  turnstile: Boolean(document.querySelector('input[name="cf-turnstile-response"], iframe[src*="turnstile"]')),
  hcaptcha: Boolean(document.querySelector('.h-captcha, iframe[src*="hcaptcha"]')),
  password: Boolean(document.querySelector('input[type="password"]')),
  awsWaf: Boolean(window.awsWafCookieDomainList),
})`;

interface DomFlags {
  recaptcha: boolean;
  turnstile: boolean;
  hcaptcha: boolean;
  password: boolean;
  awsWaf: boolean;
}

/** Combine DOM and text signals to detect captcha, Cloudflare, login, OTP. */
export async function detectChallenges(page: Page, text: string): Promise<Challenges> {
  const lowered = text.toLowerCase();
  const flags = await evalScript<DomFlags>(page, DOM_FLAGS_SCRIPT);
  const captcha = Boolean(
    flags.recaptcha || flags.hcaptcha || lowered.includes("captcha") || lowered.includes("i'm not a robot"),
  );
  return {
    captcha,
    turnstile: Boolean(flags.turnstile || lowered.includes("turnstile")),
    hcaptcha: Boolean(flags.hcaptcha || lowered.includes("hcaptcha")),
    cloudflare:
      lowered.includes("checking if the site connection is secure") || lowered.includes("cloudflare"),
    login: Boolean(flags.password || lowered.includes("sign in") || lowered.includes("log in")),
    otp:
      lowered.includes("one-time") ||
      lowered.includes("verification code") ||
      lowered.includes("code de vérification"),
    awsWaf: Boolean(flags.awsWaf || page.url().includes("chal_t=")),
  };
}
