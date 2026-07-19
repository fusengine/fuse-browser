/**
 * Escalating click ladder for obscured/sticky/hit-test-mismatched elements
 * (e.g. booking.com's `obscured:true` destination field, skoda.ch's sticky
 * combobox panel). Each rung runs ONLY after the previous one throws or
 * times out, so a normally-clickable element behaves byte-identically to a
 * plain `locator.click()` — rung 1 IS that plain click, unchanged.
 * @module actions/robust-click
 */
import type { Locator, Page } from "playwright";
import { isTopElement, safeBoundingBox } from "./hit-test.js";

/** Which rung of the escalation ladder succeeded (for diagnostics). */
export type ClickRung = "direct" | "scroll" | "dismiss-overlay" | "force" | "mouse-xy";

/** Result of {@link robustClick}: which rung succeeded, or the final error. */
export interface RobustClickResult {
  ok: boolean;
  rung: ClickRung | "failed";
  error?: string;
}

/**
 * Selectors for a visible consent/cookie control that may cover the target.
 * Every text-based entry uses `:text-is()` — an EXACT, case-sensitive
 * full-string match — never the substring `:has-text()`/`*=` forms, which
 * previously matched unrelated buttons sharing a substring ("Book", "Cookie",
 * "Token" all contain letters of "OK"/"Accept"; `[aria-label*=close i]`
 * matched "disclose"). A real consent button's exact visible text is the
 * only thing allowed to match.
 */
export const OVERLAY_DISMISS_SELECTORS = [
  "#onetrust-accept-btn-handler",
  '[id*=cookie i] button:text-is("Accept")',
  'button:text-is("Accept")',
  ':text-is("Accept all")',
  ':text-is("Accepter")',
  ':text-is("Tout accepter")',
  ':text-is("J\'accepte")',
].join(", ");

/** Best-effort dismissal of a covering overlay (cookie banner, modal close button). */
async function dismissOverlay(page: Page): Promise<void> {
  const control = page.locator(OVERLAY_DISMISS_SELECTORS).first();
  const count = await control.count().catch(() => 0);
  if (count > 0 && (await control.isVisible().catch(() => false))) {
    await control.click({ timeout: 1_500 }).catch(() => {});
  }
}

/**
 * Click `locator`, escalating scroll → overlay-dismiss → force → mouse-xy
 * only when the previous rung threw/timed out.
 *
 * @param page - Active Playwright page (needed for overlay dismissal + mouse-xy).
 * @param locator - Target element locator.
 * @param timeout - Per-attempt click timeout in ms (default 5000).
 * @param isMainFrame - `false` when `locator` resolves in a child frame — skips
 *   the rung 4/5 hit-test (see {@link isTopElement}), since a `boundingBox()`
 *   in main-frame coordinates can't be probed via a child frame's own
 *   `document`. Defaults `true` (unchanged prior behavior).
 */
export async function robustClick(
  page: Page,
  locator: Locator,
  timeout = 5_000,
  isMainFrame = true,
): Promise<RobustClickResult> {
  try {
    await locator.click({ timeout });
    return { ok: true, rung: "direct" };
  } catch {
    // Escalate to rung 2.
  }
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 2_000 });
    await locator.click({ timeout });
    return { ok: true, rung: "scroll" };
  } catch {
    // Escalate to rung 3.
  }
  try {
    await dismissOverlay(page);
    await locator.click({ timeout });
    return { ok: true, rung: "dismiss-overlay" };
  } catch {
    // Escalate to rung 4.
  }
  try {
    const box = await safeBoundingBox(locator);
    if (box && !(await isTopElement(locator, box.x + box.width / 2, box.y + box.height / 2, isMainFrame))) {
      throw new Error("obscured_by_foreign_element");
    }
    await locator.click({ timeout, force: true });
    return { ok: true, rung: "force" };
  } catch {
    // Escalate to rung 5.
  }
  try {
    // Unlike rung 4's best-effort `safeBoundingBox`, a genuine `boundingBox()`
    // throw here propagates as-is (preserving the real underlying error) —
    // only a legitimate `null`/obstructed result gets a synthetic message.
    const box = await locator.boundingBox();
    if (!box) throw new Error("no_bounding_box");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    if (!(await isTopElement(locator, cx, cy, isMainFrame))) throw new Error("obscured_by_foreign_element");
    await page.mouse.click(cx, cy);
    return { ok: true, rung: "mouse-xy" };
  } catch (err) {
    return { ok: false, rung: "failed", error: String(err).split("\n")[0] ?? "error" };
  }
}
