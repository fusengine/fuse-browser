/**
 * Read a captcha sitekey from the page and inject a solved token.
 * @module net/captcha-inject
 */
import type { Page } from "playwright";
import { evalScript, evalScriptArg } from "../lib/evaluate.js";

const SITEKEY_SCRIPT = `() => {
  const el = document.querySelector('[data-sitekey]');
  return el ? el.getAttribute('data-sitekey') : null;
}`;

const INJECT_SCRIPT = `(token) => {
  let injected = false;
  for (const id of ['g-recaptcha-response', 'cf-turnstile-response']) {
    const byId = document.getElementById(id);
    if (byId) { byId.value = token; byId.dispatchEvent(new Event('input', { bubbles: true })); injected = true; }
  }
  const byName = document.querySelector('[name="cf-turnstile-response"], [name="g-recaptcha-response"]');
  if (byName) { byName.value = token; injected = true; }
  return injected;
}`;

/** Read the captcha sitekey from the page DOM, or null if none is present. */
export function readSitekey(page: Page): Promise<string | null> {
  return evalScript<string | null>(page, SITEKEY_SCRIPT);
}

/** Inject a solved token into the page's captcha response field(s). */
export function injectToken(page: Page, token: string): Promise<boolean> {
  return evalScriptArg<boolean, string>(page, INJECT_SCRIPT, token);
}
