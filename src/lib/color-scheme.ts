/**
 * Force a page into light or dark appearance for deterministic captures,
 * covering BOTH dark-mode conventions: the `prefers-color-scheme` media query
 * (via Playwright's `emulateMedia`) and the class toggle used by Tailwind /
 * shadcn (`<html class="dark">`). No theme-switcher click required, so it works
 * on any generated page. Returns a restorer that reverts both changes, keeping
 * the session free of capture side effects.
 * @module lib/color-scheme
 */
import type { Page } from "playwright";
import { evalScriptArg } from "./evaluate.js";

/** A color scheme to emulate for capture. */
export type ColorScheme = "light" | "dark";

const TOGGLE = "({ c, on }) => document.documentElement.classList.toggle(c, on)";
const HAS = "(c) => document.documentElement.classList.contains(c)";

/**
 * Apply `scheme` to `page`: emulate the media query and toggle `themeClass` on
 * `<html>`. Returns an async restorer that undoes both, reverting the class to
 * its pre-capture state and clearing the media emulation. The restorer is
 * best-effort and never throws (e.g. on a closed page), so callers can run it
 * in a `finally` without masking the primary capture error.
 * @param page Playwright page to mutate.
 * @param scheme Target appearance, `"light"` or `"dark"`.
 * @param themeClass Class toggled on `<html>` for class-based themes.
 * @returns Restorer reverting the page to its original appearance.
 */
export async function applyColorScheme(
  page: Page,
  scheme: ColorScheme,
  themeClass = "dark",
): Promise<() => Promise<void>> {
  const hadClass = await evalScriptArg<boolean, string>(page, HAS, themeClass);
  await page.emulateMedia({ colorScheme: scheme });
  await evalScriptArg<void, { c: string; on: boolean }>(page, TOGGLE, {
    c: themeClass,
    on: scheme === "dark",
  });
  return async () => {
    try {
      await page.emulateMedia({ colorScheme: null });
      await evalScriptArg<void, { c: string; on: boolean }>(page, TOGGLE, {
        c: themeClass,
        on: hadClass,
      });
    } catch {
      /* page closed/navigated — nothing left to restore */
    }
  };
}
