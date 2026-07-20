/**
 * Session-history navigation (`browser_back` / `browser_forward`). Split out
 * of `navigation.ts` to keep it under the project's 100-line SOLID limit.
 * @module actions/navigate-history
 */
import type { Frame, Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";

/**
 * Go back or forward in session history.
 *
 * Success is computed from the URL before vs after, not from Playwright's
 * `goBack`/`goForward` return value: same-document SPA history
 * (`history.pushState` -> back) resolves that call to `null` even though the
 * navigation DID happen, which would otherwise report a false `ok:false`.
 * Wrapped in try/catch (unlike the bare `page.goBack`/`goForward` before this
 * fix) so a slow page that already changed the URL before the timeout reports
 * `ok:true` with a `load_timeout` warning instead of throwing into `isError`.
 * Uses `waitUntil:"commit"` (cheap, rarely times out) plus a short
 * best-effort `waitForLoadState`, rather than blocking the full 20s on
 * `domcontentloaded`.
 *
 * `response === null && after === before` alone is NOT proof of "no history
 * entry": `history.pushState` to the SAME url, then back, also resolves the
 * Playwright call to `null` with an unchanged URL string, even though a real
 * same-document navigation DID happen. A `framenavigated` listener (fires on
 * History-API commits too, same-document or not) distinguishes the two: only
 * report `no_history` when NEITHER the URL changed NOR any navigation event
 * fired at all.
 */
export async function navigateHistory(
  page: Page,
  direction: "back" | "forward",
): Promise<ActionResult> {
  const before = page.url();
  let navigated = false;
  const onFrameNavigated = (frame: Frame) => {
    if (frame === page.mainFrame()) navigated = true;
  };
  page.on("framenavigated", onFrameNavigated);
  const nav = direction === "back" ? page.goBack.bind(page) : page.goForward.bind(page);
  try {
    const response = await nav({ waitUntil: "commit", timeout: 20_000 });
    const after = page.url();
    if (response === null && after === before && !navigated) {
      return { type: direction, ok: false, url: after, reason: "no_history" };
    }
    await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});
    return { type: direction, ok: true, url: page.url() };
  } catch (err) {
    const after = page.url();
    if (after !== before) {
      return { type: direction, ok: true, url: after, warning: "load_timeout" };
    }
    return { type: direction, ok: false, url: after, error: String(err).split("\n")[0] ?? "error" };
  } finally {
    page.off("framenavigated", onFrameNavigated);
  }
}
