/**
 * Stealth init-script for the CDP-attach path. Patchright patches stealth
 * natively at launch, but a browser reached over CDP (e.g. remote Browserless)
 * is already running and cannot be patched — so we re-inject the minimal, honest
 * masks (webdriver flag, navigator.languages) via addInitScript. NOT used on the
 * launch path, where patchright already neutralizes these signals.
 * @module engine/stealth-init
 */
import type { BrowserContext } from "playwright";
import type { ResolvedIdentity } from "../identity/resolve.js";

/** Derive the `navigator.languages` list from a BCP-47 locale (fr-FR → [fr-FR, fr]). */
export function localeLanguages(locale: string): string[] {
  const base = locale.split("-")[0];
  return base && base !== locale ? [locale, base] : [locale];
}

/** Build the init-script source that masks the obvious automation signals. */
export function stealthInitScript(languages: string[]): string {
  const langs = JSON.stringify(languages);
  return `(() => {
  try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }); } catch (e) {}
  try { Object.defineProperty(navigator, 'languages', { get: () => ${langs}, configurable: true }); } catch (e) {}
})();`;
}

/** Apply the stealth masks to a CDP-attached context (before any page script runs). */
export async function applyStealthInit(context: BrowserContext, identity: ResolvedIdentity): Promise<void> {
  await context.addInitScript(stealthInitScript(localeLanguages(identity.locale)));
}
